// Kiến thức của trợ lý bàn giao: mỗi điều kiện ứng với một kịch bản tấn công trong threat model
// (docs/THREAT_MODEL.md) và một hướng dẫn khắc phục. Trợ lý chỉ chẩn đoán và hướng dẫn, không tự dựng
// hay gửi giao dịch thay người bán.
import type { Address } from "viem";
import { CHECKERS, ESCROW, ZERO } from "./config";
import type { AssetSpec, TradeData } from "./escrow";
import { formatEther } from "viem";

export const BIT = {
  NOT_OFFICIAL_SAFE: 1n << 0n,
  OWNERS_MISMATCH: 1n << 1n,
  THRESHOLD_MISMATCH: 1n << 2n,
  MODULES_ENABLED: 1n << 3n,
  GUARD_SET: 1n << 4n,
  MODULE_GUARD_SET: 1n << 5n,
  FALLBACK_HANDLER: 1n << 6n,
  EXECUTOR_NOT_ENABLED: 1n << 7n,
} as const;

export type Check = {
  key: string;
  threat?: string;     // mã kịch bản trong threat model
  label: string;
  ok: boolean;
  pending?: boolean;   // chưa đạt nhưng hợp đồng sẽ tự xử lý khi hoàn tất bàn giao
  detail?: string;
  fix?: string[];      // các bước hướng dẫn khi chưa đạt
};

const TX_BUILDER = "Mở app.safe.global, chọn ví → Apps → Transaction Builder. Ô \"Enter Address\" nhập địa chỉ của chính ví Safe";
const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

export function describeAsset(a: AssetSpec): string {
  const c = CHECKERS[a.checkerId];
  if (!c) return `Bộ kiểm tra #${a.checkerId}`;
  if (a.checkerId === 0) return `ETH ≥ ${formatEther(a.value)}`;
  if (a.checkerId === 1) return `ERC-20 ${short(a.token)} ≥ ${a.value.toString()}`;
  if (a.checkerId === 2) return `NFT ${short(a.token)} #${a.value.toString()}`;
  return `Quyền owner của hợp đồng ${short(a.token)}`;
}

function assetChecks(list: readonly AssetSpec[], mask: bigint, owner: "seller" | "buyer"): Check[] {
  return list.map((a, i) => {
    const ok = (mask & (1n << BigInt(i))) === 0n;
    return {
      key: `asset-${i}`, threat: "T6", label: `Ví giữ tài sản: ${describeAsset(a)}`, ok,
      fix: ok ? undefined : owner === "seller"
        ? ["Chuyển lại tài sản này vào ví Safe, hoặc hủy giao dịch và niêm yết lại với danh sách đúng."]
        : ["Tài sản đã bị rút khỏi ví sau khi bạn nạp tiền. Bạn có thể hủy giao dịch để lấy lại tiền."],
    };
  });
}

/** Trước khi người mua nạp tiền: người bán cần đưa ví về trạng thái sẵn sàng. */
export function readinessChecks(t: TradeData): Check[] {
  const m = t.readinessMask;
  const s = t.safe;
  const has = (b: bigint) => (m & b) !== 0n;
  if (has(BIT.NOT_OFFICIAL_SAFE)) {
    return [{ key: "official", threat: "T7", label: "Ví chạy trên singleton Safe chính thức", ok: false,
      fix: ["Ví này không dùng mã Safe chính thức nên không thể kiểm chứng. Không thể giao dịch ví này."] }];
  }
  const others = (s?.modules ?? []).filter((x) => x.toLowerCase() !== ESCROW.toLowerCase());
  return [
    { key: "official", threat: "T7", label: "Ví chạy trên singleton Safe chính thức", ok: true },
    {
      key: "executor", label: "Đã bật hợp đồng ký quỹ làm module của ví", ok: !has(BIT.EXECUTOR_NOT_ENABLED),
      fix: [
        `${TX_BUILDER}, chọn hàm enableModule, tham số module = ${ESCROW}.`,
        "Ký và thực thi giao dịch bằng ví owner. Nếu giao diện Safe báo lỗi, làm theo cách B trong docs/DEPLOY_REMIX.md (gọi execTransaction từ Remix).",
      ],
    },
    {
      key: "modules", threat: "T3", label: "Không còn module nào khác", ok: !has(BIT.MODULES_ENABLED),
      detail: others.length ? `Module lạ: ${others.join(", ")}` : undefined,
      fix: ["Trong app.safe.global → Settings → Setup → Modules, gỡ từng module lạ (hoặc dùng Transaction Builder gọi disableModule)."],
    },
    {
      key: "guard", threat: "T4", label: "Không có guard", ok: !has(BIT.GUARD_SET),
      detail: s && s.guard !== ZERO ? `Guard hiện tại: ${s.guard}` : undefined,
      fix: [`${TX_BUILDER}, gọi setGuard với guard = ${ZERO}.`],
    },
    {
      key: "moduleGuard", threat: "T4b", label: "Không có module guard (Safe 1.5.0)", ok: !has(BIT.MODULE_GUARD_SET),
      detail: s && s.moduleGuard !== ZERO ? `Module guard hiện tại: ${s.moduleGuard}` : undefined,
      fix: [`${TX_BUILDER}, gọi setModuleGuard với tham số = ${ZERO}.`],
    },
    {
      key: "fallback", threat: "T5", label: "Fallback handler hợp lệ", ok: !has(BIT.FALLBACK_HANDLER),
      detail: s ? `Hiện tại: ${s.fallbackHandler}; được chấp nhận: ${t.allowedFallbackHandler} hoặc 0x0` : undefined,
      fix: [`${TX_BUILDER}, gọi setFallbackHandler với handler = ${t.allowedFallbackHandler}.`],
    },
    ...assetChecks(t.assets, t.readinessAssetMask, "seller"),
  ];
}

/** Sau khi người mua nạp tiền: những gì phải giữ nguyên để hoàn tất được. */
export function fundedChecks(t: TradeData): Check[] {
  const m = t.handoverMask;
  const has = (b: bigint) => (m & b) !== 0n;
  const unchanged = t.currentNonce === t.nonceAtFunding;
  return [
    {
      key: "nonce", threat: "T8", label: "Ví không có giao dịch nào kể từ lúc nạp tiền", ok: unchanged,
      detail: `Nonce lúc nạp: ${t.nonceAtFunding}, hiện tại: ${t.currentNonce}`,
      fix: ["Người bán đã thực hiện giao dịch với ví sau khi bạn nạp tiền. Bàn giao bị khóa; bạn có thể hủy để lấy lại tiền."],
    },
    { key: "sellerOwner", label: "Người bán vẫn là owner của ví", ok: t.sellerIsOwner,
      fix: ["Người bán không còn là owner nên không thể bàn giao. Hãy hủy giao dịch để lấy lại tiền."] },
    { key: "guard", threat: "T4", label: "Không có guard", ok: !has(BIT.GUARD_SET) },
    { key: "moduleGuard", threat: "T4b", label: "Không có module guard", ok: !has(BIT.MODULE_GUARD_SET) },
    { key: "fallback", threat: "T5", label: "Fallback handler hợp lệ", ok: !has(BIT.FALLBACK_HANDLER) },
    ...assetChecks(t.expectedAssets, t.handoverAssetMask, "buyer"),
    { key: "owners", threat: "T1", label: "Chỉ còn owner mới", ok: !has(BIT.OWNERS_MISMATCH), pending: true },
    { key: "threshold", threat: "T2", label: "Đúng ngưỡng ký đã thỏa thuận", ok: !has(BIT.THRESHOLD_MISMATCH), pending: true },
    { key: "modules", threat: "T3", label: "Không còn module nào (kể cả hợp đồng ký quỹ)", ok: !has(BIT.MODULES_ENABLED), pending: true },
  ];
}

/** Sau khi hoàn tất: xác nhận lại ví đã sạch. */
export function completedChecks(t: TradeData): Check[] {
  const m = t.handoverMask;
  const has = (b: bigint) => (m & b) !== 0n;
  return [
    { key: "official", threat: "T7", label: "Singleton Safe chính thức", ok: !has(BIT.NOT_OFFICIAL_SAFE) },
    { key: "owners", threat: "T1", label: "Chỉ còn owner mới", ok: !has(BIT.OWNERS_MISMATCH) },
    { key: "threshold", threat: "T2", label: "Đúng ngưỡng ký", ok: !has(BIT.THRESHOLD_MISMATCH) },
    { key: "modules", threat: "T3", label: "Không còn module", ok: !has(BIT.MODULES_ENABLED) },
    { key: "guard", threat: "T4", label: "Không có guard", ok: !has(BIT.GUARD_SET) },
    { key: "moduleGuard", threat: "T4b", label: "Không có module guard", ok: !has(BIT.MODULE_GUARD_SET) },
    { key: "fallback", threat: "T5", label: "Fallback handler hợp lệ", ok: !has(BIT.FALLBACK_HANDLER) },
    ...assetChecks(t.expectedAssets, t.handoverAssetMask, "buyer"),
  ];
}

export const sameAddr = (a?: Address | string, b?: Address | string) => !!a && !!b && a.toLowerCase() === b.toLowerCase();
