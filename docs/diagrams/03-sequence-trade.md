# Sequence Diagram — Phân hệ Giao dịch Safe

> Tương ứng với **Use Case Phân rã 2: Phân hệ Giao dịch Safe**

Mô tả toàn bộ vòng đời giao dịch từ khi Seller tạo trade cho đến khi hoàn tất hoặc hủy.

---

```mermaid
sequenceDiagram
    actor Seller as Seller
    actor Buyer as Buyer
    participant BE as Backend (Express)
    participant DB as Database
    participant WS as WebSocket
    participant SC as Smart Contract
    participant SW as Safe Watcher

    rect rgb(210, 235, 255)
        Note over Seller,SW: Giai đoạn 1 — Tạo giao dịch (LISTED)

        Seller->>Seller: Ký message\n"SafeExchange:create-trade:{safeAddress}:{ts}"
        Seller->>+BE: POST /api/trades\n{ safeAddress, priceEth, deadline, signature, signedMessage }
        BE->>BE: Verify EIP-191 — recover address == sellerAddress
        BE->>BE: Kiểm tra timestamp trong window 5 phút
        BE->>DB: getTradeBySafeAddress(safeAddress)
        DB-->>BE: null — không trùng
        BE->>DB: createTrade(status: LISTED)
        DB-->>BE: trade { id }
        BE->>DB: createLog(TRADE_EVENT, "Đã tạo trade mới")
        BE->>WS: broadcastNewTrade(trade)
        WS-->>Buyer: event: new_trade (kênh "all")
        BE-->>-Seller: 201 { trade }
    end

    rect rgb(210, 255, 215)
        Note over Seller,SW: Giai đoạn 2 — Buyer tham gia (JOINED)

        Buyer->>Buyer: Ký message\n"SafeExchange:join-trade:{tradeId}:{ts}"
        Buyer->>+BE: POST /api/trades/:id/join\n{ buyerAddress, signature, signedMessage }
        BE->>BE: Verify EIP-191 — recover address == buyerAddress
        BE->>DB: getTrade(id) — kiểm tra status == LISTED
        DB-->>BE: trade
        BE->>BE: Kiểm tra buyer ≠ seller
        BE->>DB: updateTrade(status: JOINED, buyerAddress)
        BE->>DB: createLog(TRADE_EVENT, "Buyer đã tham gia")
        BE->>WS: broadcastTradeUpdate(JOINED)
        WS-->>Seller: notification "Người mua tham gia giao dịch"
        BE-->>-Buyer: 200 { trade }
    end

    rect rgb(255, 245, 200)
        Note over Seller,SW: Giai đoạn 3 — Ký bảo đảm on-chain (ARMED)

        Seller->>+SC: Gửi tx khóa Safe\n(escrow guard transaction)
        SC-->>-Seller: onchainTradeId, snapshotNonce

        Seller->>+BE: POST /api/trades/:id/arm\n{ onchainTradeId, snapshotNonce }
        BE->>DB: getTrade(id) — kiểm tra status == JOINED
        DB-->>BE: trade
        BE->>DB: updateTrade(status: ARMED, onchainTradeId, snapshotNonce)
        BE->>DB: createLog(TRADE_EVENT, "Safe bị khóa (snapshotNonce: N)")
        BE->>WS: broadcastTradeUpdate(ARMED)
        WS-->>Buyer: notification "Giao dịch kích hoạt — có thể gửi ký quỹ"
        BE->>+SW: onTradeArmed(safeAddress)
        Note right of SW: Bắt đầu giám sát\nownership on-chain
        BE-->>-Seller: 200 { trade }
    end

    rect rgb(255, 225, 195)
        Note over Seller,SW: Giai đoạn 4 — Buyer nạp ETH ký quỹ (FUNDED)

        Buyer->>+SC: Gửi ETH vào escrow contract
        SC-->>-Buyer: transaction confirmed

        Buyer->>Buyer: Ký message\n"SafeExchange:deposit:{tradeId}:{ts}"
        Buyer->>+BE: POST /api/trades/:id/deposit\n{ signature, signedMessage }
        BE->>BE: Verify EIP-191 — recover address == buyerAddress
        BE->>DB: getTrade(id) — kiểm tra status == ARMED
        DB-->>BE: trade
        BE->>DB: updateTrade(status: FUNDED)
        BE->>DB: createLog(TRADE_EVENT, "Buyer deposit {priceEth} ETH")
        BE->>WS: broadcastTradeUpdate(FUNDED)
        WS-->>Seller: notification "Đã nhận ký quỹ — chuyển ownership ngay"
        BE-->>-Buyer: 200 { trade }
    end

    rect rgb(210, 255, 230)
        Note over Seller,SW: Giai đoạn 5 — Hoàn tất giao dịch (COMPLETED)

        Seller->>SC: Chuyển ownership Safe → buyerAddress (on-chain)
        SW-->>BE: Phát hiện OwnershipTransfer event

        Seller->>Seller: Ký message\n"SafeExchange:complete-trade:{tradeId}:{ts}"
        Seller->>+BE: POST /api/trades/:id/complete\n{ signature, signedMessage }
        BE->>BE: Verify EIP-191
        BE->>DB: getTrade(id) — kiểm tra status == FUNDED
        DB-->>BE: trade
        BE->>DB: updateTrade(status: COMPLETED)
        BE->>DB: createLog(TRADE_EVENT, "Quyền sở hữu đã chuyển")
        BE->>WS: sendToParticipants("Giao dịch hoàn tất")
        WS-->>Seller: notification "Hoàn tất — thanh toán thực hiện"
        WS-->>Buyer: notification "Hoàn tất — Safe đã về tay bạn"
        BE->>SW: clearTradeNotifyCache(tradeId)
        deactivate SW
        BE-->>-Seller: 200 { trade }
    end

    rect rgb(255, 215, 215)
        Note over Seller,SW: Nhánh phụ — Hủy giao dịch (bất kỳ giai đoạn trước COMPLETED)

        alt Seller hủy
            Seller->>Seller: Ký message\n"SafeExchange:cancel-trade:{tradeId}:{ts}"
            Seller->>+BE: POST /api/trades/:id/cancel\n{ reason, walletAddress, signature }
            BE->>DB: getTrade — kiểm tra isSeller
            BE->>DB: updateTrade(status: CANCELLED)
            BE->>DB: createLog(TRADE_EVENT, reason)
            BE->>WS: sendToParticipants("Giao dịch đã hủy")
            WS-->>Buyer: notification warning
            BE-->>-Seller: 200 { trade }
        else Buyer hủy
            Buyer->>Buyer: Ký message\n"SafeExchange:cancel-trade:{tradeId}:{ts}"
            Buyer->>+BE: POST /api/trades/:id/cancel\n{ reason, walletAddress, signature }
            BE->>DB: getTrade — kiểm tra isBuyer
            BE->>DB: updateTrade(status: CANCELLED)
            BE->>DB: createLog(TRADE_EVENT, reason)
            BE->>WS: sendToParticipants("Giao dịch đã hủy")
            WS-->>Seller: notification warning
            BE-->>-Buyer: 200 { trade }
        end
    end
```
