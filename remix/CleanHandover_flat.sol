// Sources flattened with hardhat v2.27.2 https://hardhat.org

// SPDX-License-Identifier: MIT

// File contracts/interfaces/IAssetChecker.sol

// Original license: SPDX_License_Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IAssetChecker
 * @notice Trục 2 của kiến trúc: kiểm tra MỘT LOẠI TÀI SẢN / QUYỀN KIỂM SOÁT mà ví đang nắm giữ.
 *         Mỗi loại tài sản (ETH, ERC-20, ERC-721, Ownable, ...) có một checker riêng.
 */
interface IAssetChecker {
    /// @notice true nếu `wallet` đang nắm giữ tài sản (`token`, `value`) đúng như đã khai báo.
    function holds(address wallet, address token, uint256 value) external view returns (bool);
}


// File contracts/assets/StandardAssetCheckers.sol

// Original license: SPDX_License_Identifier: MIT
pragma solidity ^0.8.24;

interface IERC20Balance { function balanceOf(address account) external view returns (uint256); }
interface IERC721Owner  { function ownerOf(uint256 tokenId) external view returns (address); }
interface IOwnableOwner { function owner() external view returns (address); }

/*
 * Bốn checker tham chiếu cho trục tài sản. Mọi lỗi đọc dữ liệu đều trả về false (fail-closed).
 *
 * Giới hạn đã biết của phương pháp đối chiếu số dư:
 *  - token rebase / token thu phí khi chuyển có số dư tự thay đổi => không áp dụng được;
 *  - số tài sản khai báo bị giới hạn (MAX_ASSETS trong escrow) do gas tăng tuyến tính.
 */

/// @notice ETH: số dư ví >= value. Tham số token bị bỏ qua.
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

/// @notice ERC-721: ownerOf(value) == wallet, với value là tokenId.
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

/// @notice Ownable: owner() của hợp đồng `token` == wallet. Tham số value bị bỏ qua.
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

/**
 * @title IWalletVerifier
 * @notice Trục 1 của kiến trúc: xác minh trạng thái quyền kiểm soát của MỘT LOẠI VÍ đa chữ ký.
 *         Mỗi loại ví (Safe, ...) có một adapter riêng cài đặt interface này.
 */
interface IWalletVerifier {
    /// @notice Ví có phải loại ví mà adapter này hỗ trợ (vd: Safe chính thức) hay không.
    function isSupportedWallet(address wallet) external view returns (bool);

    /// @notice `account` có đang nắm quyền kiểm soát `wallet` (là owner) hay không.
    function isController(address wallet, address account) external view returns (bool);

    /// @notice Bộ đếm giao dịch của ví, dùng để phát hiện hoạt động bất thường.
    function txNonce(address wallet) external view returns (uint256);

    /**
     * @notice Kiểm tra trạng thái "bàn giao sạch".
     * @return failMask 0 nếu sạch; ngược lại mỗi bit là một điều kiện chưa đạt (xem adapter).
     */
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
 * @notice Ký quỹ trustless cho việc chuyển giao quyền kiểm soát ví đa chữ ký.
 *
 * Vòng đời:  OPEN ──deposit──▶ FUNDED ──(bàn giao nguyên tử)──▶ COMPLETED
 *              │                 │
 *              └──── hủy / hết hạn / hoạt động bất thường ────▶ CANCELLED (hoàn tiền người mua)
 *
 *  1. createTrade  : người bán (đang là owner) niêm yết ví + điều kiện: tập owner mới, ngưỡng ký,
 *                    fallback handler chấp nhận, danh sách tài sản trong ví. Mọi điều kiện được băm thành termsHash.
 *  2. deposit      : người mua nạp đúng giá, kèm termsHash mình đã xem => chống người bán đổi điều kiện phút chót.
 *  3. Bàn giao NGUYÊN TỬ: người bán thực thi MỘT giao dịch Safe (MultiSend) gồm:
 *        beginHandover(id) → swapOwner/addOwner/changeThreshold... → completeHandover(id)
 *     - beginHandover chứng minh đầu giao dịch người bán vẫn đang kiểm soát ví;
 *     - completeHandover xác minh bàn giao sạch + tài sản còn nguyên ngay trong cùng giao dịch.
 *     Nếu bất kỳ điều kiện nào chưa đạt, CẢ giao dịch Safe bị revert => người bán vẫn giữ ví, tiền vẫn nằm trong escrow.
 *     Vì không tồn tại khoảnh khắc "người mua đã có ví nhưng chưa trả tiền", người mua không thể phá hoại
 *     trạng thái ví để vừa lấy ví vừa đòi hoàn tiền.
 *  4. Tiền được ghi có (pull-payment) và rút bằng withdraw().
 *
 * Bất biến: không có owner/admin, không có hàm nâng cấp; danh sách verifier và asset checker cố định từ constructor.
 */
contract CleanHandoverEscrow {
    // ─── Types ───────────────────────────────────────────────────────────────

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

    // ─── Storage ─────────────────────────────────────────────────────────────

    uint256 public constant MAX_OWNERS = 10;
    uint256 public constant MAX_ASSETS = 20;
    bytes32 private constant HANDOVER_TAG = keccak256("CleanHandover.handover");

    IWalletVerifier[] private _verifiers;
    IAssetChecker[] private _assetCheckers;

    uint256 public tradeCount;
    mapping(uint256 => Trade) public trades;
    mapping(uint256 => address[]) private _newOwners;
    mapping(uint256 => AssetSpec[]) private _assets;
    mapping(address => uint256) public activeTradeOf; // wallet => tradeId (0 = không có)
    mapping(address => uint256) public pendingWithdrawals;

    bool private _locked;

    // ─── Events (nguồn dữ liệu cho lớp giao diện tra cứu) ──────────────────────

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
    event HandoverStarted(uint256 indexed tradeId, address indexed wallet);
    event TradeCompleted(uint256 indexed tradeId, address indexed seller, address indexed buyer, uint256 amount);
    event TradeCancelled(uint256 indexed tradeId, CancelReason reason, bool refunded);
    event Withdrawn(address indexed account, uint256 amount);

    // ─── Errors ──────────────────────────────────────────────────────────────

    error InvalidParams();
    error UnknownVerifier();
    error UnknownAssetChecker(uint256 index);
    error UnsupportedWallet();
    error NotController();
    error WalletBusy();
    error AssetNotHeld(uint256 index);
    error InvalidState();
    error NotSeller();
    error NotBuyer();
    error NotWallet();
    error WrongAmount();
    error TermsMismatch();
    error DeadlinePassed();
    error DeadlineNotPassed();
    error NotAtomic();
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

    // ─── Người bán: niêm yết ────────────────────────────────────────────────

    function createTrade(TradeParams calldata p) external returns (uint256 id) {
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
            // Không cho niêm yết tài sản mà ví không thực sự nắm giữ.
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

    // ─── Người mua: nạp tiền ─────────────────────────────────────────────────

    function deposit(uint256 id, bytes32 expectedTermsHash) external payable nonReentrant {
        Trade storage t = trades[id];
        if (t.status != Status.OPEN) revert InvalidState();
        if (msg.sender != t.buyer) revert NotBuyer();
        if (block.timestamp > t.deadline) revert DeadlinePassed();
        if (msg.value != t.price) revert WrongAmount();
        if (expectedTermsHash != t.termsHash) revert TermsMismatch();

        t.nonceAtFunding = _verifiers[t.verifierId].txNonce(t.wallet);
        t.status = Status.FUNDED;

        emit TradeFunded(id, msg.sender, msg.value, t.nonceAtFunding);
    }

    // ─── Bàn giao nguyên tử (gọi TỪ CHÍNH ví, trong cùng một giao dịch) ─────────

    function beginHandover(uint256 id) external {
        Trade storage t = trades[id];
        if (t.status != Status.FUNDED) revert InvalidState();
        if (msg.sender != t.wallet) revert NotWallet();
        if (!_verifiers[t.verifierId].isController(t.wallet, t.seller)) revert NotController();

        bytes32 key = _handoverKey(id);
        assembly { tstore(key, 1) }

        emit HandoverStarted(id, t.wallet);
    }

    function completeHandover(uint256 id) external nonReentrant {
        Trade storage t = trades[id];
        if (t.status != Status.FUNDED) revert InvalidState();
        if (msg.sender != t.wallet) revert NotWallet();

        bytes32 key = _handoverKey(id);
        uint256 started;
        assembly { started := tload(key) }
        if (started != 1) revert NotAtomic();

        (uint256 walletMask, uint256 assetMask) = _handoverStatus(id);
        if (walletMask != 0 || assetMask != 0) revert HandoverNotClean(walletMask, assetMask);

        t.status = Status.COMPLETED;
        if (activeTradeOf[t.wallet] == id) activeTradeOf[t.wallet] = 0;
        pendingWithdrawals[t.seller] += t.price;
        assembly { tstore(key, 0) }

        emit TradeCompleted(id, t.seller, t.buyer, t.price);
    }

    // ─── Hủy / hoàn tiền ─────────────────────────────────────────────────────

    /// @notice Người bán hủy bất cứ lúc nào trước khi hoàn tất; nếu đã nạp tiền thì hoàn cho người mua.
    function cancelBySeller(uint256 id) external {
        Trade storage t = trades[id];
        if (msg.sender != t.seller) revert NotSeller();
        _cancel(id, CancelReason.SELLER_CANCELLED);
    }

    /**
     * @notice Người mua hủy:
     *  - trước khi nạp tiền: tự do;
     *  - sau khi nạp tiền: chỉ khi ví đã thực thi giao dịch kể từ lúc nạp (nonce thay đổi) mà chưa hoàn tất.
     */
    function cancelByBuyer(uint256 id) external {
        Trade storage t = trades[id];
        if (msg.sender != t.buyer) revert NotBuyer();
        if (t.status == Status.OPEN) {
            _cancel(id, CancelReason.BUYER_CANCELLED);
        } else {
            if (t.status != Status.FUNDED) revert InvalidState();
            if (_verifiers[t.verifierId].txNonce(t.wallet) == t.nonceAtFunding) revert NoSuspiciousActivity();
            _cancel(id, CancelReason.SUSPICIOUS_ACTIVITY);
        }
    }

    /// @notice Bất kỳ ai cũng có thể hủy giao dịch đã quá hạn; tiền (nếu có) được hoàn cho người mua.
    function cancelExpired(uint256 id) external {
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

    // ─── View cho dapp / trợ lý hướng dẫn bàn giao ──────────────────────────

    /**
     * @notice Trạng thái bàn giao hiện tại của giao dịch.
     * @return walletFailMask bit điều kiện ví chưa đạt (ý nghĩa bit: xem verifier).
     * @return assetFailMask  bit i = 1 nghĩa là tài sản thứ i không còn đúng như niêm yết.
     */
    function getHandoverStatus(uint256 id) external view returns (uint256 walletFailMask, uint256 assetFailMask) {
        if (trades[id].status == Status.NONE) revert InvalidState();
        return _handoverStatus(id);
    }

    function getNewOwners(uint256 id) external view returns (address[] memory) { return _newOwners[id]; }
    function getAssets(uint256 id) external view returns (AssetSpec[] memory) { return _assets[id]; }
    function verifierCount() external view returns (uint256) { return _verifiers.length; }
    function verifierAt(uint256 i) external view returns (IWalletVerifier) { return _verifiers[i]; }
    function assetCheckerCount() external view returns (uint256) { return _assetCheckers.length; }
    function assetCheckerAt(uint256 i) external view returns (IAssetChecker) { return _assetCheckers[i]; }

    // ─── Internal ────────────────────────────────────────────────────────────

    function _handoverStatus(uint256 id) internal view returns (uint256 walletMask, uint256 assetMask) {
        Trade storage t = trades[id];
        walletMask = _verifiers[t.verifierId].checkHandover(
            t.wallet, _newOwners[id], t.threshold, t.allowedFallbackHandler
        );
        AssetSpec[] storage assets = _assets[id];
        for (uint256 i = 0; i < assets.length; i++) {
            AssetSpec storage a = assets[i];
            if (!_assetCheckers[a.checkerId].holds(t.wallet, a.token, a.value)) assetMask |= (1 << i);
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

    function _handoverKey(uint256 id) private pure returns (bytes32) {
        return keccak256(abi.encode(HANDOVER_TAG, id));
    }

    // Không có receive(): ETH chỉ vào qua deposit().
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

/**
 * @title SafeWalletVerifier
 * @notice Adapter tham chiếu cho ví Safe (Gnosis Safe) v1.3.0 / v1.4.1 / v1.5.0.
 *
 * Các điều kiện "bàn giao sạch" (mỗi điều kiện là một bit trong failMask):
 *  - NOT_OFFICIAL_SAFE  : proxy không trỏ tới singleton Safe chính thức
 *                         (singleton bị thay => mọi hàm view khác đều có thể bị làm giả)
 *  - OWNERS_MISMATCH    : tập owner hiện tại KHÁC ĐÚNG tập owner đã thỏa thuận (còn owner ẩn / thiếu owner)
 *  - THRESHOLD_MISMATCH : ngưỡng ký khác ngưỡng đã thỏa thuận
 *  - MODULES_ENABLED    : còn module được bật (module thực thi giao dịch không cần chữ ký owner)
 *  - GUARD_SET          : còn transaction guard (có thể chặn / kiểm duyệt giao dịch của người mua)
 *  - MODULE_GUARD_SET   : còn module guard (Safe v1.5)
 *  - FALLBACK_HANDLER   : fallback handler khác 0 và khác handler đã thỏa thuận
 *                         (handler độc có thể giả mạo chữ ký EIP-1271 thay cho ví)
 *
 * Guard, module guard, fallback handler không có hàm getter => đọc trực tiếp khe lưu trữ
 * (storage slot) qua getStorageAt() của StorageAccessible.
 *
 * Hợp đồng bất biến: danh sách singleton chính thức chỉ đặt trong constructor, không có quản trị viên.
 */
contract SafeWalletVerifier is IWalletVerifier {
    uint256 public constant NOT_OFFICIAL_SAFE  = 1 << 0;
    uint256 public constant OWNERS_MISMATCH    = 1 << 1;
    uint256 public constant THRESHOLD_MISMATCH = 1 << 2;
    uint256 public constant MODULES_ENABLED    = 1 << 3;
    uint256 public constant GUARD_SET          = 1 << 4;
    uint256 public constant MODULE_GUARD_SET   = 1 << 5;
    uint256 public constant FALLBACK_HANDLER   = 1 << 6;

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

    // ─── IWalletVerifier ─────────────────────────────────────────────────────

    function isSupportedWallet(address wallet) public view returns (bool) {
        if (wallet.code.length == 0) return false;
        // masterCopy() được SafeProxy tự trả lời từ slot 0, không chuyển tiếp xuống singleton.
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
        // Singleton không chính thức => không tin bất kỳ kết quả view nào khác.
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

        (bool okGuard, address guard) = _readAddress(safe, GUARD_SLOT);
        if (!okGuard || guard != address(0)) failMask |= GUARD_SET;

        (bool okModuleGuard, address moduleGuard) = _readAddress(safe, MODULE_GUARD_SLOT);
        if (!okModuleGuard || moduleGuard != address(0)) failMask |= MODULE_GUARD_SET;

        (bool okHandler, address handler) = _readAddress(safe, FALLBACK_HANDLER_SLOT);
        if (!okHandler || (handler != address(0) && handler != allowedFallbackHandler)) {
            failMask |= FALLBACK_HANDLER;
        }
    }

    // ─── Internal ────────────────────────────────────────────────────────────

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

    /// @dev So sánh hai chiều để không bị đánh lừa bởi phần tử trùng lặp.
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
