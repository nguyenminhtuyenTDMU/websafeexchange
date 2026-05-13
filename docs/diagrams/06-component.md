# Sơ Đồ Component — Kiến Trúc Hệ Thống

Trả lời câu hỏi: **Hệ thống gồm những phần nào và chúng liên kết với nhau ra sao?**

```mermaid
graph TB
    subgraph CLIENT["Frontend — React + Vite + wagmi"]
        FE_PAGES["Pages\nHome / Trade / Forum / SafeControl"]
        FE_HOOKS["Hooks\nuseWebSocket · useWallet\nuseSafeInfo · useTrades"]
        FE_WALLET["Wallet Layer\nMetaMask · wagmi · viem"]
        FE_WS_CLIENT["WebSocket Client\n(nhận notifications)"]
        FE_PAGES --> FE_HOOKS
        FE_HOOKS --> FE_WALLET
        FE_HOOKS --> FE_WS_CLIENT
    end

    subgraph SERVER["Backend — Express + Node.js"]
        ROUTES["Routes\n/api/trades · /api/forum\n/api/safe-info · /api/users · /api/logs"]
        subgraph CONTROLLERS["Controllers"]
            CTRL_TRADE["TradeController"]
            CTRL_FORUM["ForumController"]
            CTRL_SAFE["SafeController"]
            CTRL_USER["UserController"]
            CTRL_LOG["LogController"]
        end
        AUTH["Auth Middleware\nEIP-191 signature verify"]
        RATE_LIMIT["Rate Limiter\ngeneral / write / forum"]
        STORAGE["Storage (Drizzle ORM)\nDatabaseStorage"]
        WS_BROADCASTER["WebSocket Broadcaster\nsendToWallet · broadcastTradeUpdate\n· sendToParticipants"]

        subgraph WATCHER["Safe Watcher (background)"]
            WATCHER_CORE["handleSafeExecution\nwatchSafe · unwatchSafe"]
            ESCROW_SUB["subscribeEscrowEvents\nTradeArmed / Completed / Cancelled"]
        end

        ROUTES --> RATE_LIMIT
        RATE_LIMIT --> CONTROLLERS
        CONTROLLERS --> AUTH
        CONTROLLERS --> STORAGE
        CONTROLLERS --> WS_BROADCASTER
        CTRL_TRADE --> WATCHER_CORE
    end

    subgraph DB["Database — Neon Serverless Postgres"]
        PG[("PostgreSQL\nusers · trades\nsystem_logs · forum_posts\nforum_comments")]
    end

    subgraph BLOCKCHAIN["Ethereum Sepolia"]
        ESCROW["Escrow Contract\narmTrade · depositFunds\ncompleteTrade · cancelTrade"]
        SAFE["Gnosis Safe\n(1 per trade)\nexecTransaction · isOwner · nonce"]
    end

    subgraph RPC["RPC Provider (Infura / Alchemy)"]
        WS_RPC["WebSocket RPC\neth_subscribe\n(watchEvent)"]
        HTTP_RPC["HTTP RPC\neth_call\n(readContract)"]
    end

    CLIENT <-->|"REST API — HTTPS"| ROUTES
    FE_WS_CLIENT <-->|"WebSocket — wss://"| WS_BROADCASTER
    FE_WALLET -->|"wallet TX\n(MetaMask sign & send)"| BLOCKCHAIN

    STORAGE <-->|"Drizzle ORM + TLS"| PG

    WATCHER_CORE <-->|"eth_subscribe\n(ExecutionSuccess per Safe)"| WS_RPC
    ESCROW_SUB <-->|"eth_subscribe\n(TradeArmed/Completed/Cancelled)"| WS_RPC
    WATCHER_CORE <-->|"readContract\n(isOwner, nonce)"| HTTP_RPC

    WS_RPC --- BLOCKCHAIN
    HTTP_RPC --- BLOCKCHAIN
```

## Luồng dữ liệu chính

```
Browser (MetaMask) ──on-chain TX──▶ Escrow / Gnosis Safe
                                         │
                              Escrow emits event
                                         │
                    WS RPC ◀── eth_subscribe ──▶ Safe Watcher
                                         │
                    Safe Watcher ──notify──▶ WebSocket Broadcaster ──▶ Browser
```

## Giao thức liên lạc

| Kết nối | Giao thức | Ghi chú |
|---------|----------|---------|
| Frontend ↔ Backend | HTTPS REST | Rate-limited, CORS whitelist |
| Frontend ↔ Backend | WebSocket (wss://) | Persistent, send to wallet by address |
| Frontend → Blockchain | JSON-RPC (MetaMask) | Người dùng ký & broadcast TX |
| Safe Watcher → Blockchain | WS RPC (viem) | Subscribe events, reconnect 10 lần |
| Safe Watcher → Blockchain | HTTP RPC (viem) | readContract (stable hơn WS cho queries) |
| Backend → PostgreSQL | TCP + TLS | Drizzle ORM, Neon serverless |
