# Sơ Đồ Sequence — Safe Watcher

Trả lời câu hỏi: **Hệ thống phát hiện ownership transfer thành công hoặc gian lận như thế nào?**

> Safe Watcher chạy hoàn toàn ở backend — không có user interaction. Nó dùng WebSocket RPC để subscribe events và HTTP RPC để đọc trạng thái contract.

```mermaid
sequenceDiagram
    participant BE as Backend Startup
    participant W as Safe Watcher
    participant DB as PostgreSQL
    participant WS_RPC as WebSocket RPC<br/>(viem watchEvent)
    participant HR as HTTP RPC<br/>(viem readContract)
    participant Esc as Escrow Contract
    participant Safe as Gnosis Safe
    participant FE as Frontend<br/>(WebSocket notify)

    rect rgb(235, 245, 255)
        Note over BE, FE: Khởi động hệ thống

        BE ->> W: startSafeWatcher()
        W ->> WS_RPC: createPublicClient(webSocket, reconnect:10)
        W ->> HR: createPublicClient(http)

        W ->> Esc: watchEvent(TradeArmed)
        W ->> Esc: watchEvent(TradeCompleted)
        W ->> Esc: watchEvent(TradeCancelled)

        W ->> DB: getAllTrades()
        DB -->> W: all trades
        W ->> W: lọc trades ARMED hoặc FUNDED

        loop mỗi trade ARMED / FUNDED còn sót từ lần chạy trước
            W ->> Safe: watchEvent(ExecutionSuccess @ safeAddress)
            Note right of W: watchedSafes.set(addr, unwatch)
        end
    end

    rect rgb(240, 255, 240)
        Note over BE, FE: Khi trade mới chuyển sang ARMED

        BE ->> W: onTradeArmed(safeAddress)
        W ->> Safe: watchEvent(ExecutionSuccess @ safeAddress)
        Note right of W: Bắt đầu lắng nghe Safe này
    end

    rect rgb(255, 250, 230)
        Note over BE, FE: Khi Safe thực hiện giao dịch on-chain

        Safe -->> WS_RPC: ExecutionSuccess(txHash, payment)
        WS_RPC -->> W: onLogs callback

        W ->> DB: getAllTrades()
        DB -->> W: trades
        W ->> W: tìm trade status=FUNDED<br/>khớp safeAddress

        par Đọc song song
            W ->> HR: readContract isOwner(buyer)
            W ->> HR: readContract isOwner(seller)
        end
        HR -->> W: buyerIsOwner, sellerIsOwner
    end

    rect rgb(240, 255, 240)
        Note over W, FE: Case 1 — Ownership chuyển thành công

        alt buyerIsOwner=true AND sellerIsOwner=false
            W ->> DB: createLog(TRADE_EVENT, "ownership transferred")
            W ->> FE: broadcastTradeUpdate(OWNERSHIP_TRANSFERRED)<br/>{safeAddress, buyerAddress, message}
            Note over FE: Buyer nhận thông báo<br/>→ xác nhận hoàn tất
            W ->> W: notifiedOwnership.add(tradeId)<br/>(tránh gửi duplicate)
        end
    end

    rect rgb(255, 240, 240)
        Note over W, FE: Case 2 — Hoạt động bất thường (gian lận)

        alt buyer chưa là owner
            W ->> HR: readContract nonce()
            HR -->> W: currentNonce
            W ->> W: so sánh currentNonce > snapshotNonce?

            alt nonce tăng
                W ->> DB: createLog(SECURITY, "suspicious activity")<br/>{currentNonce, snapshotNonce}
                W ->> FE: broadcastTradeUpdate(SUSPICIOUS_ACTIVITY)<br/>{currentNonce, snapshotNonce, message}
                Note over FE: Buyer nhận cảnh báo<br/>→ có thể yêu cầu hoàn tiền
                W ->> W: notifiedSuspicious.add(tradeId)
            end
        end
    end

    rect rgb(245, 240, 255)
        Note over W, FE: Khi trade kết thúc (COMPLETED hoặc CANCELLED)

        alt từ Escrow event
            Esc -->> WS_RPC: TradeCompleted / TradeCancelled
            WS_RPC -->> W: onLogs callback
            W ->> DB: getAllTrades() → tìm theo onchainTradeId
            DB -->> W: trade
        else từ API call
            BE ->> W: clearTradeNotifyCache(tradeId)
        end

        W ->> Safe: unwatch ExecutionSuccess @ safeAddress
        W ->> W: watchedSafes.delete(addr)<br/>notifiedOwnership.delete(tradeId)<br/>notifiedSuspicious.delete(tradeId)
    end
```

## Thiết kế quan trọng

| Quyết định | Lý do |
|-----------|-------|
| WebSocket RPC cho subscribe, HTTP RPC cho readContract | WS ổn định cho event stream; HTTP ổn định hơn cho query đơn lẻ |
| `notifiedOwnership` / `notifiedSuspicious` Set | Tránh gửi duplicate notification khi ExecutionSuccess fire nhiều lần |
| Recover ARMED/FUNDED trades khi startup | Đảm bảo không bỏ sót trade nếu server restart giữa chừng |
| Subscribe escrow events để auto add/remove Safe | Không cần polling DB định kỳ — hoàn toàn event-driven |
