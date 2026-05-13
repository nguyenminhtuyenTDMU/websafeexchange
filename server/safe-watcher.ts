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

import {
  createPublicClient,
  webSocket,
  http,
  parseAbiItem,
  type PublicClient,
} from 'viem';
import { sepolia, mainnet} from 'viem/chains';
import { storage } from './storage';
import { eventBroadcaster } from './websocket';
import { log } from './index';

// ─── Config ───────────────────────────────────────────────────────────────────

const CHAIN_ID        = parseInt(process.env.CHAIN_ID      || '11155111', 10);
const WS_RPC_URL      = process.env.RPC_WS_URL;
const HTTP_RPC_URL    = process.env.RPC_HTTP_URL;
const ESCROW_ADDRESS  = (process.env.VITE_ESCROW_CONTRACT_ADDRESS || '') as `0x${string}`;

const CHAIN_MAP: Record<number, typeof sepolia> = {
  1:        mainnet  as any,
  11155111: sepolia
};

// ─── ABI fragments ────────────────────────────────────────────────────────────

// Gnosis Safe
const EV_EXECUTION_SUCCESS = parseAbiItem(
  'event ExecutionSuccess(bytes32 indexed txHash, uint256 payment)'
);
const FN_IS_OWNER = parseAbiItem('function isOwner(address owner) view returns (bool)');
const FN_NONCE    = parseAbiItem('function nonce() view returns (uint256)');

// Escrow contract
const EV_TRADE_ARMED = parseAbiItem(
  'event TradeArmed(bytes32 indexed tradeId, address indexed buyer, address indexed seller, address safe, uint256 amount, uint256 deadline, uint256 snapshotNonce)'
);
const EV_TRADE_COMPLETED = parseAbiItem(
  'event TradeCompleted(bytes32 indexed tradeId, address indexed buyer, address indexed seller, uint256 amount)'
);
const EV_TRADE_CANCELLED = parseAbiItem(
  'event TradeCancelled(bytes32 indexed tradeId, address buyer, address seller, string reason)'
);

// ─── State ────────────────────────────────────────────────────────────────────

// safeAddress (lowercase) → unwatch fn
const watchedSafes = new Map<string, () => void>();

// Tránh gửi duplicate notification
const notifiedOwnership  = new Set<string>();
const notifiedSuspicious = new Set<string>();

// unwatch fns cho escrow event subscriptions
let unwatchEscrowArmed:     (() => void) | null = null;
let unwatchEscrowCompleted: (() => void) | null = null;
let unwatchEscrowCancelled: (() => void) | null = null;

let wsClient:   PublicClient | null = null;
let httpClient: PublicClient | null = null;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getChain() {
  return CHAIN_MAP[CHAIN_ID] ?? sepolia;
}

/** readContract dùng HTTP client (ổn định hơn WS cho read) */
async function readIsOwner(safeAddr: `0x${string}`, account: `0x${string}`): Promise<boolean> {
  try {
    return await httpClient!.readContract({
      address: safeAddr,
      abi: [FN_IS_OWNER],
      functionName: 'isOwner',
      args: [account],
    }) as boolean;
  } catch {
    return false;
  }
}

async function readNonce(safeAddr: `0x${string}`): Promise<bigint> {
  try {
    return await httpClient!.readContract({
      address: safeAddr,
      abi: [FN_NONCE],
      functionName: 'nonce',
    }) as bigint;
  } catch {
    return BigInt(0);
  }
}

// ─── Core handler: gọi mỗi khi Safe thực hiện TX ─────────────────────────────

async function handleSafeExecution(safeAddress: string): Promise<void> {
  const safeAddr = safeAddress as `0x${string}`;

  // Lấy trade FUNDED đang gắn với Safe này
  const allTrades = await storage.getAllTrades();
  const trade = allTrades.find(
    t => t.safeAddress.toLowerCase() === safeAddress.toLowerCase() && t.status === 'FUNDED'
  );

  if (!trade) {
    // Trade đã xong hoặc không còn FUNDED — unsubscribe Safe này
    unwatchSafe(safeAddress);
    return;
  }

  const buyerAddr  = trade.buyerAddress  as `0x${string}`;
  const sellerAddr = trade.sellerAddress as `0x${string}`;

  const [buyerIsOwner, sellerIsOwner] = await Promise.all([
    readIsOwner(safeAddr, buyerAddr),
    readIsOwner(safeAddr, sellerAddr),
  ]);

  // ── Case 1: Ownership chuyển thành công ──────────────────────────────────
  if (buyerIsOwner && !sellerIsOwner && !notifiedOwnership.has(trade.id)) {
    notifiedOwnership.add(trade.id);
    notifiedSuspicious.delete(trade.id);

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
    return;
  }

  // ── Case 2: Nonce tăng nhưng buyer chưa là owner → bất thường ────────────
  if (!buyerIsOwner && !notifiedSuspicious.has(trade.id)) {
    const currentNonce  = await readNonce(safeAddr);
    const snapshotNonce = trade.snapshotNonce != null ? BigInt(trade.snapshotNonce) : BigInt(0);

    if (currentNonce > snapshotNonce) {
      notifiedSuspicious.add(trade.id);

      log(
        `[watcher] Trade ${trade.id.slice(0, 8)}: suspicious! nonce ${snapshotNonce}→${currentNonce}`,
        'watcher'
      );

      eventBroadcaster.broadcastTradeUpdate(trade.id, 'SUSPICIOUS_ACTIVITY', {
        safeAddress:   trade.safeAddress,
        currentNonce:  Number(currentNonce),
        snapshotNonce: Number(snapshotNonce),
        message:       'Cảnh báo: Ví đã thực hiện giao dịch bất thường. Bạn có thể yêu cầu hoàn tiền.',
      });

      await storage.createLog({
        type:           'SECURITY',
        message:        `Cảnh báo: Safe ${trade.safeAddress.slice(0, 10)}... nonce tăng ${snapshotNonce}→${currentNonce} nhưng buyer chưa là owner`,
        relatedTradeId: trade.id,
        metadata:       JSON.stringify({ currentNonce: Number(currentNonce), snapshotNonce: Number(snapshotNonce) }),
      });
    }
  }
}

// ─── Subscribe / Unsubscribe per-Safe ─────────────────────────────────────────

function watchSafe(safeAddress: string): void {
  const key = safeAddress.toLowerCase();
  if (watchedSafes.has(key) || !wsClient) return;

  log(`[watcher] Subscribe ExecutionSuccess @ ${safeAddress.slice(0, 10)}...`, 'watcher');

  const unwatch = wsClient.watchEvent({
    address:  safeAddress as `0x${string}`,
    event:    EV_EXECUTION_SUCCESS,
    onLogs:   () => handleSafeExecution(safeAddress).catch(console.error),
    onError:  (err) => console.error('[watcher] watchEvent error:', err),
  });

  watchedSafes.set(key, unwatch);
}

function unwatchSafe(safeAddress: string): void {
  const key = safeAddress.toLowerCase();
  const unwatch = watchedSafes.get(key);
  if (unwatch) {
    unwatch();
    watchedSafes.delete(key);
    log(`[watcher] Unsubscribed ${safeAddress.slice(0, 10)}...`, 'watcher');
  }
}

// ─── Subscribe escrow contract events ────────────────────────────────────────

function subscribeEscrowEvents(): void {
  if (!wsClient || !ESCROW_ADDRESS) return;

  // TradeArmed → bắt đầu watch Safe
  unwatchEscrowArmed = wsClient.watchEvent({
    address:  ESCROW_ADDRESS,
    event:    EV_TRADE_ARMED,
    onLogs:   (logs) => {
      for (const l of logs) {
        const args = l.args as any;
        if (args?.safe) {
          log(`[watcher] TradeArmed event: watching Safe ${(args.safe as string).slice(0, 10)}...`, 'watcher');
          watchSafe(args.safe as string);
        }
      }
    },
    onError: (err) => console.error('[watcher] escrow TradeArmed error:', err),
  });

  // TradeCompleted / TradeCancelled → dừng watch Safe
  const handleDone = (logs: any[]) => {
    for (const l of logs) {
      const args = l.args as any;
      if (args?.tradeId) {
        // Tìm safeAddress từ DB rồi unwatch
        storage.getAllTrades().then(trades => {
          const t = trades.find(t => t.onchainTradeId === args.tradeId);
          if (t) {
            unwatchSafe(t.safeAddress);
            clearTradeNotifyCache(t.id);
          }
        }).catch(console.error);
      }
    }
  };

  unwatchEscrowCompleted = wsClient.watchEvent({
    address:  ESCROW_ADDRESS,
    event:    EV_TRADE_COMPLETED,
    onLogs:   handleDone,
    onError:  (err) => console.error('[watcher] escrow TradeCompleted error:', err),
  });

  unwatchEscrowCancelled = wsClient.watchEvent({
    address:  ESCROW_ADDRESS,
    event:    EV_TRADE_CANCELLED,
    onLogs:   handleDone,
    onError:  (err) => console.error('[watcher] escrow TradeCancelled error:', err),
  });
}

// ─── Startup: recover active trades từ DB ────────────────────────────────────

async function subscribeActiveTrades(): Promise<void> {
  const allTrades = await storage.getAllTrades();
  const active = allTrades.filter(t => t.status === 'ARMED' || t.status === 'FUNDED');

  for (const trade of active) {
    watchSafe(trade.safeAddress);
  }

  log(`[watcher] Recovered ${active.length} active trade(s) from DB`, 'watcher');
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function startSafeWatcher(): void {
  if (!WS_RPC_URL) {
    log(
      '[watcher] RPC_WS_URL không được set — Safe Watcher không khởi động. ' +
      'Điền RPC_WS_URL vào .env để bật event subscription.',
      'watcher'
    );
    return;
  }

  if (!ESCROW_ADDRESS || ESCROW_ADDRESS === '0x0000000000000000000000000000000000000000') {
    log('[watcher] VITE_ESCROW_CONTRACT_ADDRESS chưa được set', 'watcher');
    return;
  }

  const chain = getChain();

  // Client WS — dùng để subscribe events
  wsClient = createPublicClient({
    chain,
    transport: webSocket(WS_RPC_URL, {
      reconnect: { attempts: 10, delay: 2000 },
    }),
  });

  // Client HTTP — dùng để readContract (ổn định hơn WS cho queries)
  httpClient = createPublicClient({
    chain,
    transport: http(HTTP_RPC_URL || undefined),
  });

  log(
    `[watcher] Khởi động event-driven mode (chain: ${CHAIN_ID}, escrow: ${ESCROW_ADDRESS.slice(0, 10)}...)`,
    'watcher'
  );

  // Subscribe escrow events trước
  subscribeEscrowEvents();

  // Recover active trades từ DB
  subscribeActiveTrades().catch(err => console.error('[watcher] recover error:', err));
}

export function stopSafeWatcher(): void {
  // Unwatch tất cả Safes
  Array.from(watchedSafes.entries()).forEach(([addr, unwatch]) => {
    unwatch();
    watchedSafes.delete(addr);
  });

  unwatchEscrowArmed?.();
  unwatchEscrowCompleted?.();
  unwatchEscrowCancelled?.();

  unwatchEscrowArmed = unwatchEscrowCompleted = unwatchEscrowCancelled = null;
  wsClient = httpClient = null;

  log('[watcher] Safe watcher đã dừng', 'watcher');
}

export function clearTradeNotifyCache(tradeId: string): void {
  notifiedOwnership.delete(tradeId);
  notifiedSuspicious.delete(tradeId);
}

/**
 * Gọi từ routes.ts khi trade chuyển sang ARMED — để watcher bắt đầu theo dõi ngay
 * mà không cần đợi escrow event (phòng trường hợp server restart sau armTrade).
 */
export function onTradeArmed(safeAddress: string): void {
  if (wsClient) watchSafe(safeAddress);
}
