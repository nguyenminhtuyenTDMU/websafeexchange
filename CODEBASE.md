# WebSafeExchange — Codebase Architecture

> Generated from GitNexus knowledge graph (1184 symbols · 2077 relationships · 63 execution flows · 123 files)

---

## Tổng quan

**WebSafeExchange** là một sàn giao dịch P2P an toàn sử dụng **Gnosis Safe multisig wallet** làm escrow. Người mua và người bán giao dịch tài sản on-chain, server theo dõi các sự kiện blockchain và push real-time qua WebSocket.

**Stack:**
- **Client:** React + TypeScript (`client/src/`)
- **Server:** Node.js + TypeScript (`server/`)
- **Blockchain:** Gnosis Safe SDK, EIP-1193 provider
- **Real-time:** WebSocket (server ↔ client)

---

## Modules (Functional Areas)

| Module | Số symbols | Cohesion | Mô tả |
|--------|-----------|----------|-------|
| **Ui** | 51 | 93% | UI components, dialogs, forms |
| **Server** | 41 | 81% | Backend: blockchain watcher, WebSocket, API |
| **Transfer** | 21 | 81% | Logic mua/bán, Safe SDK integration |
| **Hooks** | 17 | 61% | React hooks: WebSocket, Safe SDK, toast |
| **Pages** | 17 | 91% | Các trang: Forum, WalletTransparency, v.v. |
| **Components** | 11 | 100% | Shared components (WebSocketProvider, v.v.) |

---

## Kiến trúc hệ thống

```
┌─────────────────────────────────────────────────────┐
│                    CLIENT (React)                    │
│                                                      │
│  Pages: Buy · Sell · WalletTransparency · Forum      │
│     │                                                │
│  Hooks: useSafeSdk · useWebSocket · useToast         │
│     │                                                │
│  Lib: safe-sdk.ts (Gnosis Safe wrapper)              │
│     │                  │                             │
│  WebSocketProvider ←───┘                             │
└───────────────┬─────────────────────────────────────┘
                │ WebSocket (real-time updates)
┌───────────────▼─────────────────────────────────────┐
│                    SERVER (Node.js)                  │
│                                                      │
│  index.ts ──► startSafeWatcher()                    │
│                    │                                 │
│  safe-watcher.ts ──► subscribeEscrowEvents()        │
│                    │   watchSafe()                   │
│                    │   handleSafeExecution()         │
│                    ▼                                 │
│  websocket.ts ──► broadcastTradeUpdate() → broadcast│
└───────────────┬─────────────────────────────────────┘
                │ on-chain events
┌───────────────▼─────────────────────────────────────┐
│           BLOCKCHAIN (Gnosis Safe)                   │
│  Escrow contract · Safe multisig · EIP-1193          │
└─────────────────────────────────────────────────────┘
```

---

## Execution Flows (Top 13)

### 1. Safe Watcher → Broadcast *(6 bước)*
Server khởi động, lắng nghe sự kiện escrow blockchain, broadcast tới clients.
```
startSafeWatcher          server/safe-watcher.ts
  └─ subscribeEscrowEvents  server/safe-watcher.ts
       └─ watchSafe          server/safe-watcher.ts
            └─ handleSafeExecution  server/safe-watcher.ts
                 └─ broadcastTradeUpdate  server/websocket.ts
                      └─ broadcast        server/websocket.ts
```

### 2. OnTradeArmed → Broadcast *(5 bước)*
Khi một trade được "armed" (escrow sẵn sàng), broadcast cập nhật.
```
onTradeArmed              server/safe-watcher.ts
  └─ watchSafe             server/safe-watcher.ts
       └─ handleSafeExecution  server/safe-watcher.ts
            └─ broadcastTradeUpdate  server/websocket.ts
                 └─ broadcast        server/websocket.ts
```

### 3. StartSafeWatcher → UnwatchSafe *(5 bước)*
Cleanup khi ngừng theo dõi một Safe.
```
startSafeWatcher → subscribeEscrowEvents → watchSafe
  → handleSafeExecution → unwatchSafe
```

### 4. StartSafeWatcher → ReadNonce / ReadIsOwner *(5 bước mỗi flow)*
Đọc trạng thái on-chain của Safe (nonce, ownership).
```
startSafeWatcher → subscribeEscrowEvents → watchSafe
  → handleSafeExecution → readNonce / readIsOwner
```

### 5. Sell → GetEip1193Provider *(5 bước)*
Trang Sell khởi tạo Safe SDK, lấy EIP-1193 provider để ký transaction.
```
Sell                        client/src/pages/transfer/sell.tsx
  └─ useSafeSdk              client/src/hooks/use-safe-sdk.ts
       └─ getSafeInfo         client/src/lib/safe-sdk.ts
            └─ buildSafeInstance  client/src/lib/safe-sdk.ts
                 └─ getEip1193Provider  client/src/lib/safe-sdk.ts
```

### 6. Sell → GetSignerAddress *(4 bước)*
Lấy địa chỉ ví của người ký transaction.
```
useSafeSdk → swapOwner → buildSafeInstance → getSignerAddress
```

### 7. Sell → WaitForTx *(4 bước)*
Gửi transaction và chờ confirmation on-chain.
```
Sell → useSafeSdk → setGuardOnSafe → waitForTx
```

### 8. HandleTransferAndRelease → Dispatch *(4 bước)*
Xử lý giải phóng escrow sau khi transfer hoàn tất.
```
handleTransferAndRelease        client/src/pages/transfer/sell.tsx
  └─ toast → dismiss → dispatch  client/src/hooks/use-toast.ts
```

### 9. Buy → Dispatch *(5 bước)*
Trang Buy kết nối WebSocket để nhận cập nhật trade real-time.
```
Buy                      client/src/pages/transfer/buy.tsx
  └─ useWebSocket         client/src/hooks/use-websocket.ts
       └─ toast → dismiss → dispatch  client/src/hooks/use-toast.ts
```

### 10. WebSocketProvider → Dispatch *(5 bước)*
Global WebSocket provider xử lý messages từ server.
```
WebSocketProvider               client/src/components/websocket-provider.tsx
  └─ useWebSocket                client/src/hooks/use-websocket.ts
       └─ toast → dismiss → dispatch  client/src/hooks/use-toast.ts
```

### 11. WalletTransparency → Dispatch *(4 bước)*
Trang hiển thị lịch sử và trạng thái ví.
```
WalletTransparency → toast → dismiss → dispatch
```

### 12. NewPostDialog → Dispatch *(4 bước)*
Forum: tạo bài đăng mới.
```
NewPostDialog (forum.tsx) → toast → dismiss → dispatch
```

### 13. Buy → GenId *(4 bước)*
Tạo ID duy nhất cho trade mới.
```
Buy → (id generation flow)
```

---

## File chính

### Server
| File | Vai trò |
|------|---------|
| `server/index.ts` | Entry point, gọi `startSafeWatcher()` |
| `server/safe-watcher.ts` | **Core**: theo dõi blockchain Safe events, escrow logic |
| `server/websocket.ts` | WebSocket server, `broadcast()` tới clients |

### Client — Pages
| File | Vai trò |
|------|---------|
| `client/src/pages/transfer/sell.tsx` | Trang bán: tạo escrow, ký tx, release |
| `client/src/pages/transfer/buy.tsx` | Trang mua: theo dõi trade qua WebSocket |
| `client/src/pages/wallet-transparency.tsx` | Hiển thị lịch sử ví |
| `client/src/pages/forum.tsx` | Forum cộng đồng (posts, comments) |

### Client — Hooks
| File | Vai trò |
|------|---------|
| `client/src/hooks/use-safe-sdk.ts` | Hook wrapper cho Safe SDK operations |
| `client/src/hooks/use-websocket.ts` | Hook kết nối và lắng nghe WebSocket |
| `client/src/hooks/use-toast.ts` | Notification system (toast → dismiss → dispatch) |

### Client — Lib & Components
| File | Vai trò |
|------|---------|
| `client/src/lib/safe-sdk.ts` | **Core**: Gnosis Safe SDK wrapper (`buildSafeInstance`, `getEip1193Provider`, `waitForTx`, `setGuardOnSafe`, `swapOwner`) |
| `client/src/components/websocket-provider.tsx` | Context provider cung cấp WebSocket cho toàn app |

---

## Luồng giao dịch (Business Flow)

```
SELLER                    SERVER                    BUYER
  │                          │                         │
  │── tạo trade ────────────►│                         │
  │   (Safe escrow)          │── broadcast ───────────►│
  │                          │                         │── xem trade
  │                          │                         │── confirm mua
  │                          │◄── on-chain event ──────│
  │                          │   (Safe execution)      │
  │◄── broadcast ────────────│                         │
  │   (trade armed)          │                         │
  │── release escrow ────────►│                         │
  │   (handleTransferAndRelease)                       │
  │                          │── broadcast ───────────►│
  │                          │   (trade complete)      │
```

---

## Key Concepts

- **Gnosis Safe**: Multisig smart contract wallet dùng làm escrow. Cả buyer và seller phải ký.
- **Guard**: Smart contract guard được set lên Safe để kiểm soát điều kiện release.
- **Safe Watcher**: Server-side daemon liên tục poll/subscribe blockchain events của Safe contract.
- **EIP-1193 Provider**: Standard Ethereum provider interface để ký transactions từ browser wallet.
- **Trade lifecycle**: `created` → `armed` (escrow funded) → `released` (transfer complete)
