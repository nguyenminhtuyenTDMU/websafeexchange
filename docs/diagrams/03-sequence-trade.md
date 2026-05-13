# Sơ Đồ Sequence — Luồng Giao Dịch

Trả lời câu hỏi: **Frontend, Backend, DB, Blockchain tương tác theo thứ tự nào trong một giao dịch hoàn chỉnh?**

```mermaid
sequenceDiagram
    actor Seller as Seller (Frontend)
    actor Buyer as Buyer (Frontend)
    participant BE as Backend API
    participant DB as PostgreSQL
    participant Esc as Escrow Contract
    participant Safe as Gnosis Safe

    rect rgb(235, 245, 255)
        Note over Seller, DB: Phase 1 — Đăng bán Safe (LISTED)

        Seller ->> BE: GET /api/safe-info?address=0x...
        BE -->> Seller: owners, threshold, nonce

        Seller ->> Seller: Ký EIP-191<br/>"SafeExchange:create-trade:{safe}:{ts}"
        Seller ->> BE: POST /api/trades<br/>{safeAddress, priceEth, deadline, signature}
        BE ->> BE: Xác minh chữ ký (requireSignature)
        BE ->> DB: INSERT trades (status: LISTED)
        DB -->> BE: trade
        BE ->> BE: broadcastNewTrade via WebSocket
        BE -->> Seller: 201 {trade}
    end

    rect rgb(240, 255, 240)
        Note over Seller, DB: Phase 2 — Buyer tham gia (JOINED)

        Buyer ->> BE: GET /api/trades
        BE -->> Buyer: danh sách trades LISTED

        Buyer ->> Buyer: Ký EIP-191<br/>"SafeExchange:join-trade:{id}:{ts}"
        Buyer ->> BE: POST /api/trades/:id/join<br/>{buyerAddress, signature}
        BE ->> BE: Xác minh chữ ký
        BE ->> DB: UPDATE trades SET status=JOINED, buyerAddress
        DB -->> BE: updated trade
        BE ->> Seller: WS sendToWallet: "Người mua tham gia"
        BE -->> Buyer: trade (JOINED)
    end

    rect rgb(255, 250, 230)
        Note over Seller, Safe: Phase 3 — Arm giao dịch on-chain (ARMED)

        Seller ->> Esc: armTrade(tradeId, buyer, safe, amount, deadline, nonce)
        Esc -->> Seller: TX confirmed, emit TradeArmed

        Seller ->> Seller: Ký EIP-191<br/>"SafeExchange:arm-trade:{id}:{ts}"
        Seller ->> BE: POST /api/trades/:id/arm<br/>{onchainTradeId, snapshotNonce, signature}
        BE ->> DB: UPDATE trades SET status=ARMED, onchainTradeId, snapshotNonce
        BE ->> BE: onTradeArmed(safeAddress)<br/>→ Safe Watcher bắt đầu theo dõi
        BE ->> Buyer: WS sendToWallet: "Giao dịch được kích hoạt"
        BE -->> Seller: trade (ARMED)
    end

    rect rgb(255, 240, 240)
        Note over Buyer, Safe: Phase 4 — Buyer nộp ký quỹ ETH (FUNDED)

        Buyer ->> Esc: depositFunds(tradeId) value: priceEth ETH
        Esc -->> Buyer: TX confirmed

        Buyer ->> Buyer: Ký EIP-191<br/>"SafeExchange:deposit:{id}:{ts}"
        Buyer ->> BE: POST /api/trades/:id/deposit<br/>{signature}
        BE ->> DB: UPDATE trades SET status=FUNDED
        BE ->> Seller: WS sendToWallet: "Đã nhận ký quỹ"
        BE -->> Buyer: trade (FUNDED)
    end

    rect rgb(245, 240, 255)
        Note over Seller, Safe: Phase 5 — Chuyển ownership Safe & hoàn tất (COMPLETED)

        Seller ->> Safe: execTransaction(removeOwner seller + addOwner buyer)
        Safe -->> Seller: TX confirmed, emit ExecutionSuccess

        Note over BE: Safe Watcher phát hiện ExecutionSuccess<br/>→ kiểm tra isOwner, nonce<br/>(xem sơ đồ 04-sequence-watcher.md)

        BE ->> Buyer: WS broadcastTradeUpdate: OWNERSHIP_TRANSFERRED

        Buyer ->> Buyer: Ký EIP-191<br/>"SafeExchange:complete-trade:{id}:{ts}"
        Buyer ->> BE: POST /api/trades/:id/complete<br/>{signature}
        BE ->> DB: UPDATE trades SET status=COMPLETED
        BE ->> Esc: (Escrow tự giải phóng ETH cho Seller khi verify ownership)
        BE ->> Seller: WS sendToParticipants: "Giao dịch hoàn tất"
        BE ->> Buyer: WS sendToParticipants: "Giao dịch hoàn tất"
        BE -->> Buyer: trade (COMPLETED)
    end
```

## Ghi chú xác thực

Mọi endpoint ghi đều yêu cầu `signature` + `signedMessage` trong body. Backend gọi `requireSignature()` để xác minh:

```
signedMessage = "SafeExchange:{action}:{resource}:{isoTimestamp}"
```

| Action | Người ký | Resource |
|--------|---------|----------|
| `create-trade` | sellerAddress | safeAddress |
| `join-trade` | buyerAddress | tradeId |
| `arm-trade` | sellerAddress | tradeId |
| `deposit` | buyerAddress | tradeId |
| `complete-trade` | buyer hoặc seller | tradeId |
| `cancel-trade` | buyer hoặc seller | tradeId |
