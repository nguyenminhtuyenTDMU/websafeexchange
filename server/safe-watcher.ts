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

import { storage } from './storage';
import { eventBroadcaster } from './websocket';
import { log } from './index';

const SAFE_API_BASE: Record<number, string> = {
  1:        'https://safe-transaction-mainnet.safe.global',
  11155111: 'https://safe-transaction-sepolia.safe.global',
};

const CHAIN_ID      = parseInt(process.env.CHAIN_ID || '11155111', 10);
const POLL_INTERVAL = parseInt(process.env.WATCHER_INTERVAL_MS || '30000', 10);

// Tránh gửi thông báo trùng lặp liên tục cho cùng một trade
const notifiedOwnership = new Set<string>();
const notifiedSuspicious = new Set<string>();

interface SafeApiResponse {
  address: string;
  nonce: number;
  owners: string[];
  threshold: number;
}

async function fetchSafeInfo(safeAddress: string): Promise<SafeApiResponse | null> {
  const baseUrl = SAFE_API_BASE[CHAIN_ID];
  if (!baseUrl) return null;

  try {
    const res = await fetch(`${baseUrl}/api/v1/safes/${safeAddress}/`, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    return (await res.json()) as SafeApiResponse;
  } catch {
    return null;
  }
}

async function watchFundedTrades(): Promise<void> {
  const allTrades = await storage.getAllTrades();
  const funded = allTrades.filter(t => t.status === 'FUNDED');

  for (const trade of funded) {
    if (!trade.buyerAddress || !trade.safeAddress) continue;

    const safeInfo = await fetchSafeInfo(trade.safeAddress);
    if (!safeInfo) continue;

    const currentNonce   = safeInfo.nonce;
    const snapshotNonce  = trade.snapshotNonce != null ? parseInt(trade.snapshotNonce, 10) : null;
    const ownersLower    = safeInfo.owners.map(o => o.toLowerCase());
    const buyerIsOwner   = ownersLower.includes(trade.buyerAddress.toLowerCase());
    const sellerIsOwner  = ownersLower.includes(trade.sellerAddress.toLowerCase());

    // ── Case 1: Ownership đã chuyển thành công ──────────────────────────────
    if (buyerIsOwner && !sellerIsOwner && !notifiedOwnership.has(trade.id)) {
      notifiedOwnership.add(trade.id);
      notifiedSuspicious.delete(trade.id); // reset nếu trước đó có warn

      log(`[watcher] Trade ${trade.id.slice(0, 8)}: ownership transferred OK`, 'watcher');

      eventBroadcaster.broadcastTradeUpdate(trade.id, 'OWNERSHIP_TRANSFERRED', {
        safeAddress:  trade.safeAddress,
        buyerAddress: trade.buyerAddress,
        message:      'Safe đã được chuyển quyền sở hữu. Bạn có thể xác nhận để nhận ký quỹ.',
      });

      await storage.createLog({
        type:           'TRADE_EVENT',
        message:        `Safe ${trade.safeAddress.slice(0, 10)}... đã chuyển quyền cho buyer`,
        relatedTradeId: trade.id,
      });
    }

    // ── Case 2: Nonce tăng nhưng buyer chưa là owner → bất thường ───────────
    else if (
      snapshotNonce !== null &&
      currentNonce > snapshotNonce &&
      !buyerIsOwner &&
      !notifiedSuspicious.has(trade.id)
    ) {
      notifiedSuspicious.add(trade.id);

      log(
        `[watcher] Trade ${trade.id.slice(0, 8)}: suspicious! nonce ${snapshotNonce}→${currentNonce}`,
        'watcher'
      );

      eventBroadcaster.broadcastTradeUpdate(trade.id, 'SUSPICIOUS_ACTIVITY', {
        safeAddress:   trade.safeAddress,
        currentNonce,
        snapshotNonce,
        message:
          'Cảnh báo: Ví đã thực hiện giao dịch bất thường. Bạn có thể yêu cầu hoàn tiền trên blockchain.',
      });

      await storage.createLog({
        type:           'SECURITY',
        message:        `Cảnh báo: Safe ${trade.safeAddress.slice(0, 10)}... nonce tăng ${snapshotNonce}→${currentNonce} nhưng buyer chưa là owner`,
        relatedTradeId: trade.id,
        metadata:       JSON.stringify({ currentNonce, snapshotNonce }),
      });
    }
  }
}

let watcherTimer: ReturnType<typeof setInterval> | null = null;

export function startSafeWatcher(): void {
  if (watcherTimer) return;

  log(`Safe watcher khởi động (interval: ${POLL_INTERVAL}ms, chainId: ${CHAIN_ID})`, 'watcher');

  // Chạy lần đầu ngay lập tức sau 5 giây delay để server khởi động xong
  setTimeout(() => {
    watchFundedTrades().catch(err => console.error('[watcher] init error:', err));
  }, 5000);

  watcherTimer = setInterval(async () => {
    try {
      await watchFundedTrades();
    } catch (err) {
      console.error('[watcher] poll error:', err);
    }
  }, POLL_INTERVAL);
}

export function stopSafeWatcher(): void {
  if (watcherTimer) {
    clearInterval(watcherTimer);
    watcherTimer = null;
    log('Safe watcher đã dừng', 'watcher');
  }
}

// Xóa cache notify khi trade hoàn tất hoặc bị hủy
export function clearTradeNotifyCache(tradeId: string): void {
  notifiedOwnership.delete(tradeId);
  notifiedSuspicious.delete(tradeId);
}
