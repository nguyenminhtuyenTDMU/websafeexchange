/**
 * safe-watcher.ts — Event-driven (thay thế polling)
 *
 * Kiến trúc:
 *  1. Tạo viem publicClient với WebSocket transport → dùng eth_subscribe
 *  2. Subscribe ExecutionSuccess event trên từng Gnosis Safe đang có active trade
 *  3. Subscribe escrow contract events để tự động add/remove Safe khỏi watch list
 *  4. Khi ExecutionSuccess fire → readContract isOwner/nonce → notify frontend
 *
 * Fallback: nếu RPC_WS_URL không được set → cảnh báo và không khởi động.
 */
export declare function startSafeWatcher(): void;
export declare function stopSafeWatcher(): void;
export declare function clearTradeNotifyCache(tradeId: string): void;
/**
 * Gọi từ routes.ts khi trade chuyển sang ARMED — để watcher bắt đầu theo dõi ngay
 * mà không cần đợi escrow event (phòng trường hợp server restart sau armTrade).
 */
export declare function onTradeArmed(safeAddress: string): void;
