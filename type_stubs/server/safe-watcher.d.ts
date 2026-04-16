/**
 * safe-watcher.ts
 *
 * Background job polling Safe Transaction Service API mỗi 30 giây
 * cho tất cả trades đang ở trạng thái FUNDED.
 *
 * Nhiệm vụ (chỉ thông báo, không quyết định):
 *  - Nonce tăng nhưng buyer chưa là owner → cảnh báo "bất thường"
 *  - Buyer đã là owner và seller không còn là owner → thông báo "chuyển thành công"
 */
export declare function startSafeWatcher(): void;
export declare function stopSafeWatcher(): void;
export declare function clearTradeNotifyCache(tradeId: string): void;
