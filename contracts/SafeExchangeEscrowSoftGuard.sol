// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface ISafe {
    function isOwner(address owner) external view returns (bool);
    function nonce() external view returns (uint256);
}

/**
 * @title SafeExchangeEscrow
 * @notice Escrow cho việc mua bán Safe wallet.
 *
 * Flow:
 *  1. Seller gọi armTrade() — snapshot nonce của Safe
 *  2. Buyer gọi deposit()   — nạp ETH vào escrow
 *  3a. Seller chuyển owner Safe → buyer, sau đó buyer/seller gọi releaseFunds()
 *      SC tự verify on-chain: isOwner(buyer) && !isOwner(seller) → giải ngân
 *  3b. Nếu Safe chạy TX bất thường (nonce tăng, buyer chưa là owner)
 *      Buyer gọi buyerRequestCancel() → SC verify → hoàn tiền
 *  3c. Hết deadline → bất kỳ ai gọi cancelTimeout() → hoàn tiền
 */
contract SafeExchangeEscrow {

    enum TradeStatus { NONE, ARMED, FUNDED, COMPLETED, CANCELLED }

    struct Trade {
        address buyer;
        address seller;
        address safeAddress;
        uint256 amount;
        uint64  deadline;
        uint256 snapshotNonce;   // Safe.nonce() tại thời điểm armTrade
        TradeStatus status;
        bool fundsHeld;
    }

    mapping(bytes32 => Trade) public trades;
    mapping(address => bytes32) public activeTradeBySafe;
    mapping(address => bytes32[]) public buyerTrades;
    mapping(address => bytes32[]) public sellerTrades;

    bool private _locked;

    event TradeArmed(
        bytes32 indexed tradeId,
        address indexed buyer,
        address indexed seller,
        address safe,
        uint256 amount,
        uint256 deadline,
        uint256 snapshotNonce
    );
    event TradeFunded(bytes32 indexed tradeId, address indexed buyer, uint256 amount);
    event TradeCancelled(bytes32 indexed tradeId, address buyer, address seller, string reason);
    event TradeCompleted(bytes32 indexed tradeId, address indexed buyer, address indexed seller, uint256 amount);

    error Invalid();
    error NotSeller();
    error NotBuyer();
    error NotAuthorized();
    error TransferFailed();
    error InvalidState();
    error DeadlinePassed();
    error TradeAlreadyCompleted();
    error NoSuspiciousActivity();

    modifier nonReentrant() {
        require(!_locked, "LOCKED");
        _locked = true;
        _;
        _locked = false;
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    function getTradeId(address buyer, address seller, address safe)
        public pure returns (bytes32)
    {
        return keccak256(abi.encodePacked(buyer, seller, safe));
    }

    function _isOwner(address safe, address account) internal view returns (bool) {
        try ISafe(safe).isOwner(account) returns (bool ok) { return ok; }
        catch { return false; }
    }

    function _safeNonce(address safe) internal view returns (uint256) {
        try ISafe(safe).nonce() returns (uint256 n) { return n; }
        catch { return 0; }
    }

    function _cancel(bytes32 tradeId, string memory reason) internal {
        Trade storage t = trades[tradeId];
        if (t.status != TradeStatus.ARMED && t.status != TradeStatus.FUNDED) return;

        t.status = TradeStatus.CANCELLED;

        if (activeTradeBySafe[t.safeAddress] == tradeId)
            activeTradeBySafe[t.safeAddress] = bytes32(0);

        emit TradeCancelled(tradeId, t.buyer, t.seller, reason);
    }

    // ─── Public functions ─────────────────────────────────────────────────────

    /**
     * @notice Seller kích hoạt giao dịch. Snapshot nonce của Safe tại đây.
     * @param safe     Địa chỉ Safe wallet của seller
     * @param buyer    Địa chỉ buyer đã được xác nhận off-chain
     * @param amount   Giá trị ETH (wei) buyer phải deposit
     * @param deadline Unix timestamp hết hạn
     */
    function armTrade(
        address safe,
        address buyer,
        uint256 amount,
        uint64 deadline
    ) external {
        if (safe == address(0) || buyer == address(0) || amount == 0) revert Invalid();
        if (!_isOwner(safe, msg.sender)) revert NotSeller();
        if (deadline <= block.timestamp) revert DeadlinePassed();
        if (activeTradeBySafe[safe] != bytes32(0)) revert InvalidState();

        bytes32 id = getTradeId(buyer, msg.sender, safe);
        Trade storage t = trades[id];
        if (t.status != TradeStatus.NONE) revert InvalidState();

        t.buyer        = buyer;
        t.seller       = msg.sender;
        t.safeAddress  = safe;
        t.amount       = amount;
        t.deadline     = deadline;
        t.snapshotNonce = _safeNonce(safe);
        t.status       = TradeStatus.ARMED;
        t.fundsHeld    = false;

        activeTradeBySafe[safe] = id;
        buyerTrades[buyer].push(id);
        sellerTrades[msg.sender].push(id);

        emit TradeArmed(id, buyer, msg.sender, safe, amount, deadline, t.snapshotNonce);
    }

    /**
     * @notice Buyer deposit ETH vào escrow sau khi đã review thông tin Safe.
     */
    function deposit(bytes32 id) external payable nonReentrant {
        Trade storage t = trades[id];
        if (t.status != TradeStatus.ARMED) revert InvalidState();
        if (msg.sender != t.buyer) revert NotBuyer();
        if (msg.value != t.amount) revert Invalid();
        if (block.timestamp > t.deadline) revert DeadlinePassed();

        t.status    = TradeStatus.FUNDED;
        t.fundsHeld = true;

        emit TradeFunded(id, t.buyer, msg.value);
    }

    /**
     * @notice Buyer hoặc seller trigger giải ngân.
     *         SC tự verify on-chain: buyer phải là owner VÀ seller phải không còn là owner.
     */
    function releaseFunds(bytes32 id) external nonReentrant {
        Trade storage t = trades[id];
        if (t.status != TradeStatus.FUNDED) revert InvalidState();
        if (msg.sender != t.buyer && msg.sender != t.seller) revert NotAuthorized();
        if (!t.fundsHeld) revert InvalidState();

        require(_isOwner(t.safeAddress, t.buyer),   "Buyer chua la owner cua Safe");
        require(!_isOwner(t.safeAddress, t.seller), "Seller van con la owner cua Safe");

        t.status    = TradeStatus.COMPLETED;
        t.fundsHeld = false;

        if (activeTradeBySafe[t.safeAddress] == id)
            activeTradeBySafe[t.safeAddress] = bytes32(0);

        (bool ok, ) = payable(t.seller).call{value: t.amount}("");
        if (!ok) revert TransferFailed();

        emit TradeCompleted(id, t.buyer, t.seller, t.amount);
    }

    /**
     * @notice Buyer yêu cầu hoàn tiền khi Safe thực hiện TX bất thường.
     *         Điều kiện: nonce Safe > snapshotNonce VÀ buyer chưa là owner.
     */
    function buyerRequestCancel(bytes32 id) external nonReentrant {
        Trade storage t = trades[id];
        if (t.status != TradeStatus.FUNDED) revert InvalidState();
        if (msg.sender != t.buyer) revert NotBuyer();

        // Nếu đã chuyển owner đúng cách → không cho cancel
        if (_isOwner(t.safeAddress, t.buyer) && !_isOwner(t.safeAddress, t.seller))
            revert TradeAlreadyCompleted();

        // Nonce không đổi → chưa có gì bất thường
        if (_safeNonce(t.safeAddress) <= t.snapshotNonce)
            revert NoSuspiciousActivity();

        // Effects trước, interaction sau
        bool held = t.fundsHeld;
        uint256 refund = t.amount;
        address buyer = t.buyer;

        _cancel(id, "SUSPICIOUS_ACTIVITY");

        if (held) {
            t.fundsHeld = false;
            (bool ok, ) = payable(buyer).call{value: refund}("");
            if (!ok) revert TransferFailed();
        }
    }

    /**
     * @notice Hủy giao dịch sau khi hết deadline. Ai cũng có thể gọi.
     */
    function cancelTimeout(bytes32 id) external nonReentrant {
        Trade storage t = trades[id];
        if (t.status != TradeStatus.ARMED && t.status != TradeStatus.FUNDED)
            revert InvalidState();
        if (block.timestamp <= t.deadline)
            revert InvalidState();

        _cancel(id, "TIMEOUT");

        if (t.fundsHeld) {
            t.fundsHeld = false;
            (bool ok, ) = payable(t.buyer).call{value: t.amount}("");
            if (!ok) revert TransferFailed();
        }
    }

    /**
     * @notice Pull-pattern: buyer rút ETH sau khi trade bị cancel nhưng chưa tự động hoàn.
     */
    function withdrawRefund(bytes32 id) external nonReentrant {
        Trade storage t = trades[id];
        if (t.status != TradeStatus.CANCELLED) revert InvalidState();
        if (!t.fundsHeld) revert InvalidState();

        t.fundsHeld = false;
        (bool ok, ) = payable(t.buyer).call{value: t.amount}("");
        if (!ok) revert TransferFailed();
    }

    receive() external payable {}
}
