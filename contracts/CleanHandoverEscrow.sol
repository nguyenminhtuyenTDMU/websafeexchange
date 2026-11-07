// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IWalletVerifier} from "./interfaces/IWalletVerifier.sol";
import {IAssetChecker} from "./interfaces/IAssetChecker.sol";

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
 *     Trước đó người bán chuẩn bị ví: bật CHÍNH escrow này làm module duy nhất, gỡ guard, đặt fallback chuẩn.
 *  2. deposit      : người mua nạp đúng giá, kèm termsHash mình đã xem (chống người bán đổi điều kiện phút chót).
 *                    Hợp đồng kiểm tra ví đã sẵn sàng rồi chụp nonce của ví: từ đây ví bị "đóng băng".
 *  3. finalizeHandover (ai gọi cũng được): escrow — với tư cách module — tự thêm owner mới, xóa MỌI owner cũ,
 *     đặt ngưỡng ký, gỡ chính mình khỏi danh sách module, rồi xác minh bàn giao sạch + tài sản còn nguyên.
 *     Sai một điều kiện => revert toàn bộ, người bán vẫn giữ ví, tiền vẫn nằm trong escrow.
 *     Điều kiện nonce không đổi kể từ lúc nạp tiền bảo đảm finalizeHandover KHÔNG chạy bên trong một giao dịch
 *     của ví (ví luôn tăng nonce trước khi thực thi), nên sau khi kiểm tra không còn lệnh nào của người bán
 *     chạy tiếp được. Đây là lỗ hổng của thiết kế cũ (begin/complete trong MultiSend) mà fuzz test phát hiện.
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

    // ─── Người bán: niêm yết ────────────────────────────────────────────────

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

        // Chỉ nhận tiền khi ví đã sẵn sàng: sau thời điểm này người bán không cần (và không được) đụng vào ví nữa.
        (uint256 readinessMask, uint256 assetMask) = _readiness(id);
        if (readinessMask != 0 || assetMask != 0) revert WalletNotReady(readinessMask, assetMask);

        t.nonceAtFunding = _verifiers[t.verifierId].txNonce(t.wallet);
        t.status = Status.FUNDED;

        emit TradeFunded(id, msg.sender, msg.value, t.nonceAtFunding);
    }

    // ─── Bàn giao (escrow tự thực hiện với tư cách module của ví) ───────────────

    /**
     * @notice Ai cũng có thể gọi (thường là người mua). Toàn bộ việc chuyển quyền và kiểm tra nằm trong
     *         MỘT lời gọi do escrow điều khiển từ đầu đến cuối.
     */
    function finalizeHandover(uint256 id) external nonReentrant {
        Trade storage t = trades[id];
        if (t.status != Status.FUNDED) revert InvalidState();
        IWalletVerifier verifier = _verifiers[t.verifierId];

        // Ví tăng nonce trước khi thực thi mọi giao dịch do owner ký. Nonce không đổi => không có giao dịch nào
        // của ví đang chạy bao quanh lời gọi này, và ví không bị thay đổi kể từ lúc người mua nạp tiền.
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

    // ─── Hủy / hoàn tiền ─────────────────────────────────────────────────────

    /// @notice Người bán hủy bất cứ lúc nào trước khi hoàn tất; nếu đã nạp tiền thì hoàn cho người mua.
    function cancelBySeller(uint256 id) external nonReentrant {
        Trade storage t = trades[id];
        if (msg.sender != t.seller) revert NotSeller();
        _cancel(id, CancelReason.SELLER_CANCELLED);
    }

    /**
     * @notice Người mua hủy:
     *  - trước khi nạp tiền: tự do;
     *  - sau khi nạp tiền: khi bàn giao không còn thực hiện được — ví đã thực thi giao dịch kể từ lúc nạp
     *    (nonce thay đổi) hoặc tài sản đã niêm yết không còn nguyên (vd: bị rút qua allowance cũ).
     */
    function cancelByBuyer(uint256 id) external nonReentrant {
        Trade storage t = trades[id];
        if (msg.sender != t.buyer) revert NotBuyer();
        if (t.status == Status.OPEN) {
            _cancel(id, CancelReason.BUYER_CANCELLED);
        } else {
            if (t.status != Status.FUNDED) revert InvalidState();
            bool walletChanged = _verifiers[t.verifierId].txNonce(t.wallet) != t.nonceAtFunding;
            if (!walletChanged && _assetStatus(id) == 0) revert NoSuspiciousActivity();
            _cancel(id, CancelReason.SUSPICIOUS_ACTIVITY);
        }
    }

    /// @notice Bất kỳ ai cũng có thể hủy giao dịch đã quá hạn; tiền (nếu có) được hoàn cho người mua.
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

    // ─── View cho dapp / trợ lý hướng dẫn bàn giao ──────────────────────────

    /**
     * @notice Ví đã sẵn sàng để người mua nạp tiền / để bàn giao chưa. Dùng cho trợ lý hướng dẫn người bán.
     * @return readinessFailMask bit điều kiện chưa đạt (ý nghĩa bit: xem verifier, hàm checkReadiness).
     * @return assetFailMask     bit i = 1 nghĩa là tài sản thứ i không còn đúng như niêm yết.
     */
    function getReadiness(uint256 id) external view returns (uint256 readinessFailMask, uint256 assetFailMask) {
        if (trades[id].status == Status.NONE) revert InvalidState();
        return _readiness(id);
    }

    /// @notice Trạng thái ví so với điều kiện bàn giao sạch (bằng 0 sau khi hoàn tất).
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
        assetMask = _assetStatus(id);
    }

    function _readiness(uint256 id) internal view returns (uint256 readinessMask, uint256 assetMask) {
        Trade storage t = trades[id];
        readinessMask = _verifiers[t.verifierId].checkReadiness(t.wallet, address(this), t.allowedFallbackHandler);
        assetMask = _assetStatus(id);
    }

    function _assetStatus(uint256 id) internal view returns (uint256 assetMask) {
        Trade storage t = trades[id];
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

    // Không có receive(): ETH chỉ vào qua deposit().
}
