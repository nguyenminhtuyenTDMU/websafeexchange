// Sources flattened with hardhat v2.29.1 https://hardhat.org

// SPDX-License-Identifier: MIT

// File contracts/interfaces/IAssetChecker.sol

// Original license: SPDX_License_Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Mỗi loại tài sản (ETH, ERC-20, ERC-721, Ownable) có một checker riêng.
interface IAssetChecker {
    function holds(address wallet, address token, uint256 value) external view returns (bool);
}


// File contracts/assets/StandardAssetCheckers.sol

// Original license: SPDX_License_Identifier: MIT
pragma solidity ^0.8.24;

interface IERC20Balance { function balanceOf(address account) external view returns (uint256); }
interface IERC721Owner  { function ownerOf(uint256 tokenId) external view returns (address); }
interface IOwnableOwner { function owner() external view returns (address); }

// đọc lỗi thì trả về false

/// @notice Số dư ETH của ví >= value.
contract EthBalanceChecker is IAssetChecker {
    function holds(address wallet, address, uint256 value) external view returns (bool) {
        return wallet.balance >= value;
    }
}

/// @notice ERC-20: balanceOf(wallet) >= value.
contract Erc20BalanceChecker is IAssetChecker {
    function holds(address wallet, address token, uint256 value) external view returns (bool) {
        if (token.code.length == 0) return false;
        try IERC20Balance(token).balanceOf(wallet) returns (uint256 balance) {
            return balance >= value;
        } catch {
            return false;
        }
    }
}

/// @notice ERC-721: value là tokenId.
contract Erc721OwnerChecker is IAssetChecker {
    function holds(address wallet, address token, uint256 value) external view returns (bool) {
        if (token.code.length == 0) return false;
        try IERC721Owner(token).ownerOf(value) returns (address holder) {
            return holder == wallet;
        } catch {
            return false;
        }
    }
}

/// @notice owner() của hợp đồng `token` là ví.
contract OwnableOwnerChecker is IAssetChecker {
    function holds(address wallet, address token, uint256) external view returns (bool) {
        if (token.code.length == 0) return false;
        try IOwnableOwner(token).owner() returns (address currentOwner) {
            return currentOwner == wallet;
        } catch {
            return false;
        }
    }
}


// File contracts/interfaces/IWalletVerifier.sol

// Original license: SPDX_License_Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Mỗi loại ví đa chữ ký có một verifier riêng cài interface này.
interface IWalletVerifier {
    function isSupportedWallet(address wallet) external view returns (bool);

    function isController(address wallet, address account) external view returns (bool);

    /// @notice Phải tăng trước khi ví chạy giao dịch của owner (escrow dựa vào điều này).
    function txNonce(address wallet) external view returns (uint256);

    /// @notice 0 khi `executor` là bên duy nhất được ví ủy quyền và ví không còn guard/hook lạ.
    function checkReadiness(address wallet, address executor, address allowedFallbackHandler)
        external view returns (uint256 failMask);

    /// @notice Các lời gọi escrow gửi tới ví để đổi sang `newOwners` rồi tự gỡ quyền của mình.
    function handoverCalls(address wallet, address[] calldata newOwners, uint256 threshold, address executor)
        external view returns (bytes[] memory calls);

    /// @notice 0 khi ví đã bàn giao sạch.
    function checkHandover(
        address wallet,
        address[] calldata newOwners,
        uint256 threshold,
        address allowedFallbackHandler
    ) external view returns (uint256 failMask);
}


// File contracts/CleanHandoverEscrow.sol

// Original license: SPDX_License_Identifier: MIT
pragma solidity ^0.8.24;


/**
 * @title CleanHandoverEscrow
 * @notice Ký quỹ cho việc chuyển giao quyền kiểm soát ví Safe. Người bán bật escrow làm module
 *         của ví; người bán chào bán tài sản lúc niêm yết, người mua khai báo tập tài sản kỳ vọng lúc
 *         nạp tiền; khi bàn giao, escrow tự đổi owner rồi kiểm tra ví sạch và tập kỳ vọng còn đủ.
 */
contract CleanHandoverEscrow {

    enum Status { NONE, OPEN, FUNDED, COMPLETED, CANCELLED }
    enum CancelReason { SELLER_CANCELLED, BUYER_CANCELLED, SUSPICIOUS_ACTIVITY, EXPIRED }

    struct AssetSpec {
        uint8 checkerId;   // chỉ số trong danh sách asset checker
        address token;     // địa chỉ token / hợp đồng (bỏ qua với ETH)
        uint256 value;     // số lượng tối thiểu (ETH, ERC-20) hoặc tokenId (ERC-721)
    }

    struct TradeParams {
        address wallet;
        uint8 verifierId;
        address buyer;
        uint256 price;
        uint64 deadline;
        address[] newOwners;
        uint256 threshold;
        address allowedFallbackHandler;
        AssetSpec[] assets;
    }

    struct Trade {
        address seller;
        address buyer;
        address wallet;
        uint8 verifierId;
        Status status;
        uint64 deadline;
        uint256 price;
        uint256 threshold;
        address allowedFallbackHandler;
        uint256 nonceAtFunding;
        bytes32 termsHash;
    }

    uint256 public constant MAX_OWNERS = 10;
    uint256 public constant MAX_ASSETS = 20;

    IWalletVerifier[] private _verifiers;
    IAssetChecker[] private _assetCheckers;

    uint256 public tradeCount;
    mapping(uint256 => Trade) public trades;
    mapping(uint256 => address[]) private _newOwners;
    mapping(uint256 => AssetSpec[]) private _assets;          // người bán chào bán
    mapping(uint256 => AssetSpec[]) private _expectedAssets;  // người mua kỳ vọng, chốt lúc nạp tiền
    mapping(address => uint256) public activeTradeOf; // wallet => tradeId
    mapping(address => uint256) public pendingWithdrawals;

    bool private _locked;

    event TradeCreated(
        uint256 indexed tradeId,
        address indexed seller,
        address indexed buyer,
        address wallet,
        uint256 price,
        uint64 deadline,
        bytes32 termsHash
    );
    event TradeFunded(uint256 indexed tradeId, address indexed buyer, uint256 amount, uint256 nonceAtFunding);
    event TradeCompleted(uint256 indexed tradeId, address indexed seller, address indexed buyer, uint256 amount);
    event TradeCancelled(uint256 indexed tradeId, CancelReason reason, bool refunded);
    event Withdrawn(address indexed account, uint256 amount);

    error InvalidParams();
    error UnknownVerifier();
    error UnknownAssetChecker(uint256 index);
    error UnsupportedWallet();
    error NotController();
    error WalletBusy();
    error AssetNotHeld(uint256 index);
    error AssetNotOffered(uint256 index);
    error InvalidState();
    error NotSeller();
    error NotBuyer();
    error WrongAmount();
    error TermsMismatch();
    error DeadlinePassed();
    error DeadlineNotPassed();
    error WalletNotReady(uint256 readinessFailMask, uint256 assetFailMask);
    error WalletChangedSinceFunding();
    error HandoverCallFailed(uint256 index);
    error HandoverNotClean(uint256 walletFailMask, uint256 assetFailMask);
    error NoSuspiciousActivity();
    error NothingToWithdraw();
    error TransferFailed();
    error Reentrancy();

    modifier nonReentrant() {
        if (_locked) revert Reentrancy();
        _locked = true;
        _;
        _locked = false;
    }

    constructor(IWalletVerifier[] memory verifiers, IAssetChecker[] memory assetCheckers) {
        if (verifiers.length == 0) revert InvalidParams();
        for (uint256 i = 0; i < verifiers.length; i++) _verifiers.push(verifiers[i]);
        for (uint256 i = 0; i < assetCheckers.length; i++) _assetCheckers.push(assetCheckers[i]);
    }

    function createTrade(TradeParams calldata p) external nonReentrant returns (uint256 id) {
        if (p.verifierId >= _verifiers.length) revert UnknownVerifier();
        IWalletVerifier verifier = _verifiers[p.verifierId];

        if (!verifier.isSupportedWallet(p.wallet)) revert UnsupportedWallet();
        if (!verifier.isController(p.wallet, msg.sender)) revert NotController();
        if (p.buyer == address(0) || p.buyer == msg.sender || p.price == 0) revert InvalidParams();
        if (p.deadline <= block.timestamp) revert DeadlinePassed();
        if (activeTradeOf[p.wallet] != 0) revert WalletBusy();

        uint256 n = p.newOwners.length;
        if (n == 0 || n > MAX_OWNERS || p.threshold == 0 || p.threshold > n) revert InvalidParams();
        for (uint256 i = 0; i < n; i++) {
            address o = p.newOwners[i];
            if (o == address(0) || o == address(1) || o == msg.sender || o == p.wallet) revert InvalidParams();
            for (uint256 j = 0; j < i; j++) {
                if (p.newOwners[j] == o) revert InvalidParams();
            }
        }

        if (p.assets.length > MAX_ASSETS) revert InvalidParams();
        for (uint256 i = 0; i < p.assets.length; i++) {
            AssetSpec calldata a = p.assets[i];
            if (a.checkerId >= _assetCheckers.length) revert UnknownAssetChecker(i);
            if (!_assetCheckers[a.checkerId].holds(p.wallet, a.token, a.value)) revert AssetNotHeld(i);
        }

        id = ++tradeCount;
        bytes32 termsHash = keccak256(abi.encode(block.chainid, address(this), id, msg.sender, p));

        Trade storage t = trades[id];
        t.seller = msg.sender;
        t.buyer = p.buyer;
        t.wallet = p.wallet;
        t.verifierId = p.verifierId;
        t.status = Status.OPEN;
        t.deadline = p.deadline;
        t.price = p.price;
        t.threshold = p.threshold;
        t.allowedFallbackHandler = p.allowedFallbackHandler;
        t.termsHash = termsHash;

        for (uint256 i = 0; i < n; i++) _newOwners[id].push(p.newOwners[i]);
        for (uint256 i = 0; i < p.assets.length; i++) _assets[id].push(p.assets[i]);

        activeTradeOf[p.wallet] = id;

        emit TradeCreated(id, msg.sender, p.buyer, p.wallet, p.price, p.deadline, termsHash);
    }

    /// @param expectedAssets Tập tài sản người mua kỳ vọng, mỗi mục phải có trong danh sách người bán chào.
    function deposit(uint256 id, bytes32 expectedTermsHash, AssetSpec[] calldata expectedAssets)
        external payable nonReentrant
    {
        Trade storage t = trades[id];
        if (t.status != Status.OPEN) revert InvalidState();
        if (msg.sender != t.buyer) revert NotBuyer();
        if (block.timestamp > t.deadline) revert DeadlinePassed();
        if (msg.value != t.price) revert WrongAmount();
        if (expectedTermsHash != t.termsHash) revert TermsMismatch();
        if (expectedAssets.length > MAX_ASSETS) revert InvalidParams();

        AssetSpec[] storage offered = _assets[id];
        for (uint256 i = 0; i < expectedAssets.length; i++) {
            AssetSpec calldata a = expectedAssets[i];
            bool found = false;
            for (uint256 j = 0; j < offered.length; j++) {
                AssetSpec storage o = offered[j];
                if (o.checkerId == a.checkerId && o.token == a.token && o.value == a.value) {
                    found = true;
                    break;
                }
            }
            if (!found) revert AssetNotOffered(i);
            _expectedAssets[id].push(a);
        }

        // ví phải sẵn sàng trước khi nhận tiền, sau đó người bán không cần đụng vào ví nữa
        uint256 readinessMask = _verifiers[t.verifierId].checkReadiness(t.wallet, address(this), t.allowedFallbackHandler);
        uint256 assetMask = _checkAssets(t.wallet, _expectedAssets[id]);
        if (readinessMask != 0 || assetMask != 0) revert WalletNotReady(readinessMask, assetMask);

        t.nonceAtFunding = _verifiers[t.verifierId].txNonce(t.wallet);
        t.status = Status.FUNDED;

        emit TradeFunded(id, msg.sender, msg.value, t.nonceAtFunding);
    }

    /// @notice Ai cũng gọi được, thường là người mua.
    function finalizeHandover(uint256 id) external nonReentrant {
        Trade storage t = trades[id];
        if (t.status != Status.FUNDED) revert InvalidState();
        IWalletVerifier verifier = _verifiers[t.verifierId];

        // Safe tăng nonce trước khi chạy giao dịch của owner, nên nonce không đổi nghĩa là hàm này
        // không bị gọi từ bên trong một giao dịch của ví và ví chưa bị đụng tới từ lúc nạp tiền
        if (verifier.txNonce(t.wallet) != t.nonceAtFunding) revert WalletChangedSinceFunding();
        if (!verifier.isController(t.wallet, t.seller)) revert NotController();

        address[] memory newOwners = _newOwners[id];
        bytes[] memory calls = verifier.handoverCalls(t.wallet, newOwners, t.threshold, address(this));
        for (uint256 i = 0; i < calls.length; i++) {
            (bool ok, bytes memory ret) = t.wallet.call(calls[i]);
            if (!ok || ret.length != 32 || !abi.decode(ret, (bool))) revert HandoverCallFailed(i);
        }

        (uint256 walletMask, uint256 assetMask) = _handoverStatus(id);
        if (walletMask != 0 || assetMask != 0) revert HandoverNotClean(walletMask, assetMask);

        t.status = Status.COMPLETED;
        if (activeTradeOf[t.wallet] == id) activeTradeOf[t.wallet] = 0;
        pendingWithdrawals[t.seller] += t.price;

        emit TradeCompleted(id, t.seller, t.buyer, t.price);
    }

    /// @notice Người bán hủy trước khi hoàn tất, tiền đã nạp được hoàn cho người mua.
    function cancelBySeller(uint256 id) external nonReentrant {
        Trade storage t = trades[id];
        if (msg.sender != t.seller) revert NotSeller();
        _cancel(id, CancelReason.SELLER_CANCELLED);
    }

    /// @notice Người mua hủy: tự do khi chưa nạp tiền; sau khi nạp thì chỉ khi nonce ví đã đổi hoặc tài sản bị thiếu.
    function cancelByBuyer(uint256 id) external nonReentrant {
        Trade storage t = trades[id];
        if (msg.sender != t.buyer) revert NotBuyer();
        if (t.status == Status.OPEN) {
            _cancel(id, CancelReason.BUYER_CANCELLED);
        } else {
            if (t.status != Status.FUNDED) revert InvalidState();
            bool walletChanged = _verifiers[t.verifierId].txNonce(t.wallet) != t.nonceAtFunding;
            if (!walletChanged && _checkAssets(t.wallet, _expectedAssets[id]) == 0) revert NoSuspiciousActivity();
            _cancel(id, CancelReason.SUSPICIOUS_ACTIVITY);
        }
    }

    /// @notice Ai cũng hủy được giao dịch quá hạn.
    function cancelExpired(uint256 id) external nonReentrant {
        Trade storage t = trades[id];
        if (block.timestamp <= t.deadline) revert DeadlineNotPassed();
        _cancel(id, CancelReason.EXPIRED);
    }

    function withdraw() external nonReentrant {
        uint256 amount = pendingWithdrawals[msg.sender];
        if (amount == 0) revert NothingToWithdraw();
        pendingWithdrawals[msg.sender] = 0;
        (bool ok, ) = payable(msg.sender).call{value: amount}("");
        if (!ok) revert TransferFailed();
        emit Withdrawn(msg.sender, amount);
    }

    /// @notice Bằng (0, 0) khi ví sẵn sàng để nạp tiền. Bit i của assetFailMask: tài sản chào bán thứ i bị thiếu.
    function getReadiness(uint256 id) external view returns (uint256 readinessFailMask, uint256 assetFailMask) {
        if (trades[id].status == Status.NONE) revert InvalidState();
        return _readiness(id);
    }

    /// @notice Bằng (0, 0) khi ví đã bàn giao sạch. Bit i của assetFailMask: tài sản kỳ vọng thứ i bị thiếu.
    function getHandoverStatus(uint256 id) external view returns (uint256 walletFailMask, uint256 assetFailMask) {
        if (trades[id].status == Status.NONE) revert InvalidState();
        return _handoverStatus(id);
    }

    function getNewOwners(uint256 id) external view returns (address[] memory) { return _newOwners[id]; }
    function getAssets(uint256 id) external view returns (AssetSpec[] memory) { return _assets[id]; }
    function getExpectedAssets(uint256 id) external view returns (AssetSpec[] memory) { return _expectedAssets[id]; }
    function verifierCount() external view returns (uint256) { return _verifiers.length; }
    function verifierAt(uint256 i) external view returns (IWalletVerifier) { return _verifiers[i]; }
    function assetCheckerCount() external view returns (uint256) { return _assetCheckers.length; }
    function assetCheckerAt(uint256 i) external view returns (IAssetChecker) { return _assetCheckers[i]; }

    function _handoverStatus(uint256 id) internal view returns (uint256 walletMask, uint256 assetMask) {
        Trade storage t = trades[id];
        walletMask = _verifiers[t.verifierId].checkHandover(
            t.wallet, _newOwners[id], t.threshold, t.allowedFallbackHandler
        );
        assetMask = _checkAssets(t.wallet, _expectedAssets[id]);
    }

    function _readiness(uint256 id) internal view returns (uint256 readinessMask, uint256 assetMask) {
        Trade storage t = trades[id];
        readinessMask = _verifiers[t.verifierId].checkReadiness(t.wallet, address(this), t.allowedFallbackHandler);
        assetMask = _checkAssets(t.wallet, _assets[id]);
    }

    function _checkAssets(address wallet, AssetSpec[] storage assets) internal view returns (uint256 assetMask) {
        for (uint256 i = 0; i < assets.length; i++) {
            AssetSpec storage a = assets[i];
            if (!_assetCheckers[a.checkerId].holds(wallet, a.token, a.value)) assetMask |= (1 << i);
        }
    }

    function _cancel(uint256 id, CancelReason reason) internal {
        Trade storage t = trades[id];
        bool funded = t.status == Status.FUNDED;
        if (!funded && t.status != Status.OPEN) revert InvalidState();

        t.status = Status.CANCELLED;
        if (activeTradeOf[t.wallet] == id) activeTradeOf[t.wallet] = 0;
        if (funded) pendingWithdrawals[t.buyer] += t.price;

        emit TradeCancelled(id, reason, funded);
    }
}


// File contracts/verifiers/SafeWalletVerifier.sol

// Original license: SPDX_License_Identifier: MIT
pragma solidity ^0.8.24;

interface ISafeView {
    function masterCopy() external view returns (address);
    function getOwners() external view returns (address[] memory);
    function getThreshold() external view returns (uint256);
    function isOwner(address owner) external view returns (bool);
    function nonce() external view returns (uint256);
    function getModulesPaginated(address start, uint256 pageSize)
        external view returns (address[] memory array, address next);
    function getStorageAt(uint256 offset, uint256 length) external view returns (bytes memory);
}

interface ISafeAdmin {
    function execTransactionFromModule(address to, uint256 value, bytes calldata data, uint8 operation)
        external returns (bool success);
    function addOwnerWithThreshold(address owner, uint256 threshold) external;
    function removeOwner(address prevOwner, address owner, uint256 threshold) external;
    function changeThreshold(uint256 threshold) external;
    function disableModule(address prevModule, address module) external;
}

/**
 * @title SafeWalletVerifier
 * @notice Kiểm tra ví Safe 1.3.0 / 1.4.1 / 1.5.0. Mỗi điều kiện chưa đạt là một bit trong failMask.
 */
contract SafeWalletVerifier is IWalletVerifier {
    uint256 public constant NOT_OFFICIAL_SAFE  = 1 << 0;
    uint256 public constant OWNERS_MISMATCH    = 1 << 1;
    uint256 public constant THRESHOLD_MISMATCH = 1 << 2;
    uint256 public constant MODULES_ENABLED    = 1 << 3;
    uint256 public constant GUARD_SET          = 1 << 4;
    uint256 public constant MODULE_GUARD_SET   = 1 << 5;
    uint256 public constant FALLBACK_HANDLER   = 1 << 6;
    uint256 public constant EXECUTOR_NOT_ENABLED = 1 << 7;

    // đọc 2 module là đủ biết ví có module nào khác ngoài escrow không
    uint256 internal constant MODULE_PAGE = 2;

    bytes32 internal constant GUARD_SLOT            = keccak256("guard_manager.guard.address");
    bytes32 internal constant MODULE_GUARD_SLOT     = keccak256("module_manager.module_guard.address");
    bytes32 internal constant FALLBACK_HANDLER_SLOT = keccak256("fallback_manager.handler.address");
    address internal constant SENTINEL = address(0x1);

    mapping(address => bool) public isOfficialSingleton;

    constructor(address[] memory officialSingletons) {
        for (uint256 i = 0; i < officialSingletons.length; i++) {
            isOfficialSingleton[officialSingletons[i]] = true;
        }
    }

    function isSupportedWallet(address wallet) public view returns (bool) {
        if (wallet.code.length == 0) return false;
        // proxy tự trả lời masterCopy() từ slot 0, singleton giả không can thiệp được
        try ISafeView(wallet).masterCopy() returns (address mc) {
            return isOfficialSingleton[mc];
        } catch {
            return false;
        }
    }

    function isController(address wallet, address account) external view returns (bool) {
        if (wallet.code.length == 0) return false;
        try ISafeView(wallet).isOwner(account) returns (bool ok) { return ok; } catch { return false; }
    }

    function txNonce(address wallet) external view returns (uint256) {
        if (wallet.code.length == 0) return 0;
        try ISafeView(wallet).nonce() returns (uint256 n) { return n; } catch { return 0; }
    }

    function checkHandover(
        address wallet,
        address[] calldata newOwners,
        uint256 threshold,
        address allowedFallbackHandler
    ) external view returns (uint256 failMask) {
        // singleton lạ thì các hàm view khác đều không đáng tin
        if (!isSupportedWallet(wallet)) return NOT_OFFICIAL_SAFE;

        ISafeView safe = ISafeView(wallet);

        try safe.getOwners() returns (address[] memory owners) {
            if (!_sameSet(owners, newOwners)) failMask |= OWNERS_MISMATCH;
        } catch {
            failMask |= OWNERS_MISMATCH;
        }

        try safe.getThreshold() returns (uint256 t) {
            if (t != threshold) failMask |= THRESHOLD_MISMATCH;
        } catch {
            failMask |= THRESHOLD_MISMATCH;
        }

        try safe.getModulesPaginated(SENTINEL, 1) returns (address[] memory modules, address) {
            if (modules.length != 0) failMask |= MODULES_ENABLED;
        } catch {
            failMask |= MODULES_ENABLED;
        }

        failMask |= _checkHooks(safe, allowedFallbackHandler);
    }

    // owner và ngưỡng chưa cần đúng ở bước này, escrow sẽ đặt lại khi bàn giao
    function checkReadiness(address wallet, address executor, address allowedFallbackHandler)
        external view returns (uint256 failMask)
    {
        if (!isSupportedWallet(wallet)) return NOT_OFFICIAL_SAFE;
        ISafeView safe = ISafeView(wallet);

        try safe.getModulesPaginated(SENTINEL, MODULE_PAGE) returns (address[] memory modules, address) {
            bool hasExecutor = false;
            for (uint256 i = 0; i < modules.length; i++) {
                if (modules[i] == executor) hasExecutor = true;
                else failMask |= MODULES_ENABLED;
            }
            if (!hasExecutor) failMask |= EXECUTOR_NOT_ENABLED;
        } catch {
            failMask |= MODULES_ENABLED | EXECUTOR_NOT_ENABLED;
        }

        failMask |= _checkHooks(safe, allowedFallbackHandler);
    }

    // addOwner chèn owner mới vào đầu danh sách liên kết, nên owner cũ cần xóa luôn đứng ngay sau newOwners[0].
    // escrow là module duy nhất nên prevModule là SENTINEL.
    function handoverCalls(address wallet, address[] calldata newOwners, uint256 threshold, address executor)
        external view returns (bytes[] memory calls)
    {
        address[] memory oldOwners = ISafeView(wallet).getOwners();
        uint256 n = newOwners.length;
        calls = new bytes[](n + oldOwners.length + 2);
        uint256 k = 0;
        for (uint256 i = 0; i < n; i++) {
            calls[k++] = _moduleCall(wallet, abi.encodeCall(ISafeAdmin.addOwnerWithThreshold, (newOwners[i], 1)));
        }
        for (uint256 j = 0; j < oldOwners.length; j++) {
            calls[k++] = _moduleCall(wallet, abi.encodeCall(ISafeAdmin.removeOwner, (newOwners[0], oldOwners[j], 1)));
        }
        calls[k++] = _moduleCall(wallet, abi.encodeCall(ISafeAdmin.changeThreshold, (threshold)));
        calls[k++] = _moduleCall(wallet, abi.encodeCall(ISafeAdmin.disableModule, (SENTINEL, executor)));
    }

    // guard, module guard và fallback handler không có getter nên đọc thẳng storage slot
    function _checkHooks(ISafeView safe, address allowedFallbackHandler) internal view returns (uint256 failMask) {
        (bool okGuard, address guard) = _readAddress(safe, GUARD_SLOT);
        if (!okGuard || guard != address(0)) failMask |= GUARD_SET;

        (bool okModuleGuard, address moduleGuard) = _readAddress(safe, MODULE_GUARD_SLOT);
        if (!okModuleGuard || moduleGuard != address(0)) failMask |= MODULE_GUARD_SET;

        (bool okHandler, address handler) = _readAddress(safe, FALLBACK_HANDLER_SLOT);
        if (!okHandler || (handler != address(0) && handler != allowedFallbackHandler)) {
            failMask |= FALLBACK_HANDLER;
        }
    }

    function _moduleCall(address wallet, bytes memory data) internal pure returns (bytes memory) {
        return abi.encodeCall(ISafeAdmin.execTransactionFromModule, (wallet, 0, data, uint8(0)));
    }

    function _readAddress(ISafeView safe, bytes32 slot) internal view returns (bool ok, address value) {
        try safe.getStorageAt(uint256(slot), 1) returns (bytes memory data) {
            if (data.length != 32) return (false, address(0));
            uint256 word = abi.decode(data, (uint256));
            if (word >> 160 != 0) return (false, address(0));
            return (true, address(uint160(word)));
        } catch {
            return (false, address(0));
        }
    }

    // so hai chiều để không bị lừa bởi phần tử trùng
    function _sameSet(address[] memory actual, address[] calldata expected) internal pure returns (bool) {
        if (actual.length != expected.length) return false;
        for (uint256 i = 0; i < expected.length; i++) {
            if (!_containsMem(actual, expected[i])) return false;
        }
        for (uint256 i = 0; i < actual.length; i++) {
            if (!_containsCalldata(expected, actual[i])) return false;
        }
        return true;
    }

    function _containsMem(address[] memory list, address item) internal pure returns (bool) {
        for (uint256 i = 0; i < list.length; i++) {
            if (list[i] == item) return true;
        }
        return false;
    }

    function _containsCalldata(address[] calldata list, address item) internal pure returns (bool) {
        for (uint256 i = 0; i < list.length; i++) {
            if (list[i] == item) return true;
        }
        return false;
    }
}
