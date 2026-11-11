import type { Address, Hex, PublicClient } from "viem";
import { getAbiItem, keccak256, toHex, hexToBigInt } from "viem";
import { escrowAbi, verifierAbi } from "./abi";
import { ESCROW, ESCROW_DEPLOY_BLOCK, ZERO } from "./config";

export const STATUS = ["NONE", "OPEN", "FUNDED", "COMPLETED", "CANCELLED"] as const;
export type StatusName = (typeof STATUS)[number];
export const CANCEL_REASON = ["Người bán hủy", "Người mua hủy", "Ví bị thay đổi sau khi nạp tiền", "Quá hạn"] as const;

export type AssetSpec = { checkerId: number; token: Address; value: bigint };

export const safeAbi = [
  { type: "function", name: "getOwners", stateMutability: "view", inputs: [], outputs: [{ type: "address[]" }] },
  { type: "function", name: "getThreshold", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "nonce", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  {
    type: "function", name: "getModulesPaginated", stateMutability: "view",
    inputs: [{ type: "address" }, { type: "uint256" }], outputs: [{ type: "address[]" }, { type: "address" }],
  },
  {
    type: "function", name: "getStorageAt", stateMutability: "view",
    inputs: [{ type: "uint256" }, { type: "uint256" }], outputs: [{ type: "bytes" }],
  },
] as const;

const SLOT = {
  guard: keccak256(toHex("guard_manager.guard.address")),
  moduleGuard: keccak256(toHex("module_manager.module_guard.address")),
  fallbackHandler: keccak256(toHex("fallback_manager.handler.address")),
};

const esc = { address: ESCROW, abi: escrowAbi } as const;

/** Cấu hình hiện tại của ví Safe, để trợ lý chỉ ra cụ thể module / guard / handler nào cần gỡ. */
export async function readSafe(client: PublicClient, wallet: Address) {
  const slot = async (s: Hex): Promise<Address> => {
    try {
      const raw = await client.readContract({ address: wallet, abi: safeAbi, functionName: "getStorageAt", args: [hexToBigInt(s), 1n] });
      return `0x${raw.slice(-40)}` as Address;
    } catch {
      return ZERO;
    }
  };
  const [owners, threshold, nonce, modules, guard, moduleGuard, fallbackHandler] = await Promise.all([
    client.readContract({ address: wallet, abi: safeAbi, functionName: "getOwners" }),
    client.readContract({ address: wallet, abi: safeAbi, functionName: "getThreshold" }),
    client.readContract({ address: wallet, abi: safeAbi, functionName: "nonce" }),
    client.readContract({ address: wallet, abi: safeAbi, functionName: "getModulesPaginated", args: ["0x0000000000000000000000000000000000000001", 10n] }).then((r) => r[0]),
    slot(SLOT.guard),
    slot(SLOT.moduleGuard),
    slot(SLOT.fallbackHandler),
  ]);
  return { owners, threshold, nonce, modules, guard, moduleGuard, fallbackHandler };
}
export type SafeState = Awaited<ReturnType<typeof readSafe>>;

/** Toàn bộ dữ liệu một giao dịch cần cho màn hình chi tiết và trợ lý. */
export async function readTrade(client: PublicClient, id: bigint, me?: Address) {
  const t = await client.readContract({ ...esc, functionName: "trades", args: [id] });
  const [seller, buyer, wallet, verifierId, statusIdx, deadline, price, threshold, allowedFallbackHandler, nonceAtFunding, termsHash] = t;
  const status = STATUS[statusIdx];
  if (status === "NONE") return null;

  const verifier = await client.readContract({ ...esc, functionName: "verifierAt", args: [BigInt(verifierId)] });
  const [newOwners, assets, expectedAssets, readiness, handover, currentNonce, sellerIsOwner, safe, myCredit] = await Promise.all([
    client.readContract({ ...esc, functionName: "getNewOwners", args: [id] }),
    client.readContract({ ...esc, functionName: "getAssets", args: [id] }),
    client.readContract({ ...esc, functionName: "getExpectedAssets", args: [id] }),
    client.readContract({ ...esc, functionName: "getReadiness", args: [id] }),
    client.readContract({ ...esc, functionName: "getHandoverStatus", args: [id] }),
    client.readContract({ address: verifier, abi: verifierAbi, functionName: "txNonce", args: [wallet] }),
    client.readContract({ address: verifier, abi: verifierAbi, functionName: "isController", args: [wallet, seller] }),
    readSafe(client, wallet).catch(() => null),
    me ? client.readContract({ ...esc, functionName: "pendingWithdrawals", args: [me] }) : Promise.resolve(0n),
  ]);

  return {
    id, seller, buyer, wallet, verifier, status, deadline, price, threshold, allowedFallbackHandler,
    nonceAtFunding, termsHash, newOwners, assets: assets as readonly AssetSpec[],
    expectedAssets: expectedAssets as readonly AssetSpec[],
    readinessMask: readiness[0], readinessAssetMask: readiness[1],
    handoverMask: handover[0], handoverAssetMask: handover[1],
    currentNonce, sellerIsOwner, safe, myCredit,
  };
}
export type TradeData = NonNullable<Awaited<ReturnType<typeof readTrade>>>;

// ───────── Quét sự kiện (thay cho máy chủ / CSDL) ─────────

const EV = {
  created: getAbiItem({ abi: escrowAbi, name: "TradeCreated" }),
  funded: getAbiItem({ abi: escrowAbi, name: "TradeFunded" }),
  completed: getAbiItem({ abi: escrowAbi, name: "TradeCompleted" }),
  cancelled: getAbiItem({ abi: escrowAbi, name: "TradeCancelled" }),
  withdrawn: getAbiItem({ abi: escrowAbi, name: "Withdrawn" }),
};

/** eth_getLogs cả dải; nếu RPC từ chối dải dài thì chia nhỏ. */
async function getLogsChunked(client: PublicClient, fromBlock: bigint, toBlock: bigint) {
  try {
    return await client.getLogs({ address: ESCROW, events: Object.values(EV), fromBlock, toBlock });
  } catch {
    const STEP = 9_000n;
    const all = [];
    for (let from = fromBlock; from <= toBlock; from += STEP + 1n) {
      const to = from + STEP > toBlock ? toBlock : from + STEP;
      all.push(...(await client.getLogs({ address: ESCROW, events: Object.values(EV), fromBlock: from, toBlock: to })));
    }
    return all;
  }
}

export type TradeSummary = {
  id: bigint; seller: Address; buyer: Address; wallet: Address; price: bigint; deadline: bigint;
  status: StatusName; cancelReason?: string;
  events: { kind: string; block: bigint; tx: Hex; detail?: string }[];
};
export type Withdrawal = { account: Address; amount: bigint; block: bigint; tx: Hex };

export async function scanEvents(client: PublicClient) {
  const latest = await client.getBlockNumber({ cacheTime: 0 }); // không dùng số block lưu tạm, kẻo sót sự kiện vừa xảy ra
  const logs = await getLogsChunked(client, ESCROW_DEPLOY_BLOCK, latest);
  const trades = new Map<bigint, TradeSummary>();
  const withdrawals: Withdrawal[] = [];
  for (const log of logs) {
    const base = { block: log.blockNumber!, tx: log.transactionHash! };
    switch (log.eventName) {
      case "TradeCreated": {
        const a = log.args;
        trades.set(a.tradeId!, {
          id: a.tradeId!, seller: a.seller!, buyer: a.buyer!, wallet: a.wallet!, price: a.price!, deadline: a.deadline!,
          status: "OPEN", events: [{ kind: "Niêm yết", ...base }],
        });
        break;
      }
      case "TradeFunded": {
        const t = trades.get(log.args.tradeId!);
        if (t) { t.status = "FUNDED"; t.events.push({ kind: "Người mua nạp tiền", ...base }); }
        break;
      }
      case "TradeCompleted": {
        const t = trades.get(log.args.tradeId!);
        if (t) { t.status = "COMPLETED"; t.events.push({ kind: "Hoàn tất bàn giao", ...base }); }
        break;
      }
      case "TradeCancelled": {
        const t = trades.get(log.args.tradeId!);
        if (t) {
          t.status = "CANCELLED";
          t.cancelReason = CANCEL_REASON[log.args.reason!];
          t.events.push({ kind: "Hủy giao dịch", detail: t.cancelReason + (log.args.refunded ? ", hoàn tiền cho người mua" : ""), ...base });
        }
        break;
      }
      case "Withdrawn":
        withdrawals.push({ account: log.args.account!, amount: log.args.amount!, ...base });
        break;
    }
  }
  return { trades: [...trades.values()].sort((a, b) => Number(b.id - a.id)), withdrawals, latest };
}
