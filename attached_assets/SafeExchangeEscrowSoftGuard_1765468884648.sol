// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface ISafe {
    enum Operation { Call, DelegateCall }
    function getGuard() external view returns (address guard);
    function isOwner(address owner) external view returns (bool);
}

interface IGuard {
    function checkTransaction(
        address to,
        uint256 value,
        bytes calldata data,
        ISafe.Operation operation,
        uint256 safeTxGas,
        uint256 baseGas,
        uint256 gasPrice,
        address gasToken,
        address payable refundReceiver,
        bytes calldata signatures,
        address msgSender
    ) external;

    function checkAfterExecution(bytes32 txHash, bool success) external;
}

contract SafeExchangeEscrowSoftGuard is IGuard {
    bytes4 private constant SWAP_OWNER_SELECTOR = 0xe318b52b;

    enum TradeStatus { NONE, ARMED, FUNDED, COMPLETED, CANCELLED }

    struct Trade {
        address buyer;
        address seller;
        address safeAddress;
        uint256 amount;
        uint64  deadline;
        TradeStatus status;
        bool fundsHeld;
    }

    struct PendingSwap {
        bytes32 tradeId;
        address newOwner;
    }

    mapping(bytes32 => Trade) public trades;
    mapping(address => bytes32) public activeTradeBySafe;

    mapping(address => bytes32[]) public buyerTrades;
    mapping(address => bytes32[]) public sellerTrades;

    mapping(address => PendingSwap) private pendingSwapBySafe;

    bool private _locked;

    // === EVENTS ===

    event TradeArmed(bytes32 tradeId, address buyer, address seller, address safe, uint256 amount, uint256 deadline);
    event TradeFunded(bytes32 tradeId, address buyer, uint256 amount);
    event TradeCancelled(bytes32 tradeId, address buyer, address seller, string reason);
    event TradeCompleted(bytes32 tradeId, address buyer, address seller, uint256 amount);
    event GuardObservedSwap(address safe, bytes32 tradeId, address newOwner);
    event GuardObservedCheat(address safe, bytes32 tradeId, address sender, address to, bytes4 selector, string reason);

    // === ERRORS ===
    error Invalid();
    error NotSeller();
    error NotBuyer();
    error GuardNotAttached();
    error TransferFailed();
    error NotFound();
    error InvalidState();
    error DeadlinePassed();

    modifier nonReentrant() {
        require(!_locked, "LOCKED");
        _locked = true;
        _;
        _locked = false;
    }

    // === HELPERS ===

    function getTradeId(address buyer, address seller, address safe)
        public pure returns (bytes32)
    {
        return keccak256(abi.encodePacked(buyer, seller, safe));
    }

    function _isOwner(address safe, address o) internal view returns (bool) {
        try ISafe(safe).isOwner(o) returns (bool ok) { return ok; }
        catch { return false; }
    }

    function _guardIsThis(address safe) internal view returns(bool) {
        try ISafe(safe).getGuard() returns (address g) {
            return g == address(this);
        } catch { return false; }
    }

    function _cancel(bytes32 tradeId, string memory reason) internal {
        Trade storage t = trades[tradeId];
        if (t.status != TradeStatus.ARMED && t.status != TradeStatus.FUNDED) return;

        t.status = TradeStatus.CANCELLED;

        if (activeTradeBySafe[t.safeAddress] == tradeId)
            activeTradeBySafe[t.safeAddress] = 0;

        emit TradeCancelled(tradeId, t.buyer, t.seller, reason);
    }

    // === ESCROW API ===

    function armTrade(address safe, address buyer, uint256 amount, uint64 deadline) external {
        if (safe == address(0) || buyer == address(0) || amount == 0) revert Invalid();
        if (!_isOwner(safe, msg.sender)) revert NotSeller();
        if (!_guardIsThis(safe)) revert GuardNotAttached();
        if (deadline <= block.timestamp) revert DeadlinePassed();

        if (activeTradeBySafe[safe] != 0) revert InvalidState();

        bytes32 id = getTradeId(buyer, msg.sender, safe);
        Trade storage t = trades[id];

        t.buyer = buyer;
        t.seller = msg.sender;
        t.safeAddress = safe;
        t.amount = amount;
        t.deadline = deadline;
        t.status = TradeStatus.ARMED;
        t.fundsHeld = false;

        activeTradeBySafe[safe] = id;
        buyerTrades[buyer].push(id);
        sellerTrades[msg.sender].push(id);

        emit TradeArmed(id, buyer, msg.sender, safe, amount, deadline);
    }

    function deposit(bytes32 id) external payable nonReentrant {
        Trade storage t = trades[id];
        if (t.status != TradeStatus.ARMED) revert InvalidState();
        if (msg.sender != t.buyer) revert NotBuyer();
        if (msg.value != t.amount) revert Invalid();
        if (block.timestamp > t.deadline) revert DeadlinePassed();

        t.status = TradeStatus.FUNDED;
        t.fundsHeld = true;

        emit TradeFunded(id, t.buyer, msg.value);
    }

    function withdrawRefund(bytes32 id) external nonReentrant {
        Trade storage t = trades[id];
        if (t.status != TradeStatus.CANCELLED) revert InvalidState();
        if (!t.fundsHeld) revert InvalidState();

        t.fundsHeld = false;

        (bool ok, ) = payable(t.buyer).call{value: t.amount}("");
        if (!ok) revert TransferFailed();
    }

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

    // === GUARD SOFTLOCK LOGIC ===
    //
    // Soft-lock hoạt động khi t.status ∈ {ARMED, FUNDED}
    // => Seller gửi bất kỳ tx nào KHÔNG phải swapOwner(newOwner = buyer)
    //    → CHEAT → cancel trade ngay lập tức.
    //
    // Không revert (đây là "soft" lock, không phải cứng).

    function checkTransaction(
        address to,
        uint256,
        bytes calldata data,
        ISafe.Operation op,
        uint256,
        uint256,
        uint256,
        address,
        address payable,
        bytes calldata,
        address msgSender
    ) external override {

        bytes32 id = activeTradeBySafe[msg.sender];
        if (id == 0) return;

        Trade storage t = trades[id];

        if (t.status != TradeStatus.ARMED && t.status != TradeStatus.FUNDED)
            return;

        // TX bất kỳ từ seller đều có thể là cheat
        if (msgSender != t.seller) {
            emit GuardObservedCheat(msg.sender, id, msgSender, to, 0x00, "NOT_SELLER");
            _cancel(id, "CHEAT_NOT_SELLER");
            return;
        }

        // Chỉ xem xét Operation.Call → Safe
        if (op != ISafe.Operation.Call || to != msg.sender || data.length < 4) {
            emit GuardObservedCheat(msg.sender, id, msgSender, to, 0x00, "INVALID_OP");
            _cancel(id, "CHEAT_INVALID_OP");
            return;
        }

        bytes4 selector;
        assembly { selector := calldataload(data.offset) }

        if (selector != SWAP_OWNER_SELECTOR) {
            emit GuardObservedCheat(msg.sender, id, msgSender, to, selector, "NOT_SWAPOWNER");
            _cancel(id, "CHEAT_NOT_SWAPOWNER");
            return;
        }

        (address prevOwner, address oldOwner, address newOwner) =
            abi.decode(data[4:], (address, address, address));

        if (prevOwner == address(0) || oldOwner == address(0) || newOwner != t.buyer) {
            emit GuardObservedCheat(msg.sender, id, msgSender, to, selector, "WRONG_ARGS");
            _cancel(id, "CHEAT_WRONG_ARGS");
            return;
        }

        pendingSwapBySafe[msg.sender] = PendingSwap({tradeId: id, newOwner: newOwner});

        emit GuardObservedSwap(msg.sender, id, newOwner);
    }

    function checkAfterExecution(bytes32, bool success) external override {
        PendingSwap memory p = pendingSwapBySafe[msg.sender];
        if (p.tradeId == 0) return;

        delete pendingSwapBySafe[msg.sender];
        if (!success) return;

        Trade storage t = trades[p.tradeId];
        if (t.status != TradeStatus.FUNDED || !t.fundsHeld) return;

        if (!_isOwner(t.safeAddress, t.buyer)) return;

        t.status = TradeStatus.COMPLETED;
        t.fundsHeld = false;

        if (activeTradeBySafe[t.safeAddress] == p.tradeId)
            activeTradeBySafe[t.safeAddress] = 0;

        (bool ok, ) = payable(t.seller).call{value: t.amount}("");
        if (!ok) revert TransferFailed();

        emit TradeCompleted(p.tradeId, t.buyer, t.seller, t.amount);
    }

    receive() external payable {}
}
