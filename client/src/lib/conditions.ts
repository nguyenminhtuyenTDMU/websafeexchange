// Kiến thức của trợ lý bàn giao: mỗi điều kiện ứng với một kịch bản tấn công trong threat model
// (docs/THREAT_MODEL.md) và một hướng dẫn khắc phục. Trợ lý chỉ chẩn đoán và hướng dẫn, không tự dựng
// hay gửi giao dịch thay người bán.
import type { Address } from "viem";
import { formatEther } from "viem";
import { CHECKERS, ESCROW, ZERO } from "./config";
import type { AssetSpec, TradeData } from "./escrow";

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

/** Tên kịch bản tấn công, hiển thị khi rê chuột lên mã T. */
export const THREATS: Record<string, string> = {
  T1: "Người bán giữ lại một owner ẩn",
  T2: "Ngưỡng ký khác thỏa thuận",
  T3: "Cài module để rút tài sản sau bàn giao",
  T4: "Cài guard để chặn giao dịch của người mua",
  T4b: "Cài module guard (Safe 1.5.0)",
  T5: "Fallback handler giả mạo chữ ký của ví",
  T6: "Rút tài sản khỏi ví",
  T7: "Ví chạy mã giả mạo Safe",
  T8: "Người bán động vào ví sau khi người mua nạp tiền",
};

/** Giải thích ngắn cho thuật ngữ Safe. */
export const TERMS = {
  module: "Hợp đồng được ví ủy quyền thực thi giao dịch mà không cần chữ ký owner.",
  guard: "Hợp đồng được ví gọi trước và sau mỗi giao dịch, có thể chặn giao dịch.",
  moduleGuard: "Guard áp dụng cho giao dịch do module gửi (chỉ có từ Safe 1.5.0).",
  fallback: "Hợp đồng nhận các lời gọi mà ví không tự xử lý, kể cả việc xác nhận chữ ký thay ví.",
  singleton: "Mã chương trình dùng chung của Safe; ví chỉ là proxy trỏ tới nó.",
  nonce: "Bộ đếm giao dịch của ví, tăng mỗi lần owner thực hiện một giao dịch.",
  threshold: "Số chữ ký owner tối thiểu để ví thực hiện một giao dịch.",
} as const;

export type FixStep = { text: string; copy?: string; link?: { href: string; label: string } };

export type Check = {
  key: string;
  threat?: string;
  label: string;
  asset?: AssetSpec;  // hiển thị sau label bằng AssetLabel
  hint?: string;
  ok: boolean;
  pending?: boolean;  // chưa đạt nhưng hợp đồng tự xử lý khi hoàn tất bàn giao
  detail?: string;
  fix?: FixStep[];
};

const SAFE_APP = "Mở app.safe.global, chọn ví này → Apps → Transaction Builder, ô địa chỉ nhập chính địa chỉ ví Safe.";
const REMIX_GUIDE = "https://github.com/nguyenminhtuyenTDMU/websafeexchange/blob/main/docs/DEPLOY_REMIX.md";
const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

export function describeAsset(a: AssetSpec): string {
  const c = CHECKERS[a.checkerId];
  if (!c) return `Bộ kiểm tra #${a.checkerId}`;
  if (a.checkerId === 0) return `ETH ≥ ${formatEther(a.value)}`;
  if (a.checkerId === 1) return `ERC-20 ${short(a.token)} ≥ ${a.value.toString()}`;
  if (a.checkerId === 2) return `NFT ${short(a.token)} #${a.value.toString()}`;
  return `Quyền owner của hợp đồng ${short(a.token)}`;
}

function assetChecks(list: readonly AssetSpec[], mask: bigint, side: "seller" | "buyer"): Check[] {
  return list.map((a, i) => {
    const ok = (mask & (1n << BigInt(i))) === 0n;
    return {
      key: `asset-${i}`, threat: "T6", label: "Ví giữ", asset: a, ok,
      fix: ok ? undefined : side === "seller"
        ? [{ text: "Chuyển lại tài sản này vào ví Safe, hoặc hủy giao dịch rồi niêm yết lại với danh sách đúng." }]
        : [{ text: "Tài sản đã rời khỏi ví sau khi bạn nạp tiền. Hủy giao dịch để lấy lại tiền." }],
    };
  });
}

/** Trước khi người mua nạp tiền: người bán cần đưa ví về trạng thái sẵn sàng. */
export function readinessChecks(t: TradeData): Check[] {
  const m = t.readinessMask;
  const s = t.safe;
  const has = (b: bigint) => (m & b) !== 0n;
  if (has(BIT.NOT_OFFICIAL_SAFE)) {
    return [{
      key: "official", threat: "T7", label: "Ví chạy mã Safe chính thức", hint: TERMS.singleton, ok: false,
      fix: [{ text: "Ví này không dùng singleton Safe chính thức nên không thể kiểm chứng. Không giao dịch được ví này." }],
    }];
  }
  const others = (s?.modules ?? []).filter((x) => x.toLowerCase() !== ESCROW.toLowerCase());
  return [
    {
      key: "executor", label: "Hợp đồng ký quỹ đã được bật làm module", hint: TERMS.module, ok: !has(BIT.EXECUTOR_NOT_ENABLED),
      fix: [
        { text: SAFE_APP },
        { text: "Chọn hàm enableModule, tham số module là địa chỉ hợp đồng ký quỹ:", copy: ESCROW },
        { text: "Ký và thực thi bằng ví owner. Nếu Safe{Wallet} báo lỗi, làm theo cách B trong", link: { href: REMIX_GUIDE, label: "hướng dẫn dùng Remix" } },
      ],
    },
    {
      key: "modules", threat: "T3", label: "Không còn module nào khác", hint: TERMS.module, ok: !has(BIT.MODULES_ENABLED),
      detail: others.length ? `Module lạ: ${others.map(short).join(", ")}` : undefined,
      fix: [{ text: "Trong app.safe.global → Settings → Setup → Modules, gỡ từng module lạ (hoặc gọi disableModule bằng Transaction Builder)." }],
    },
    {
      key: "guard", threat: "T4", label: "Không có guard", hint: TERMS.guard, ok: !has(BIT.GUARD_SET),
      detail: s && s.guard !== ZERO ? `Guard hiện tại: ${short(s.guard)}` : undefined,
      fix: [{ text: SAFE_APP }, { text: "Gọi setGuard với tham số guard bằng địa chỉ 0:", copy: ZERO }],
    },
    {
      key: "moduleGuard", threat: "T4b", label: "Không có module guard", hint: TERMS.moduleGuard, ok: !has(BIT.MODULE_GUARD_SET),
      detail: s && s.moduleGuard !== ZERO ? `Module guard hiện tại: ${short(s.moduleGuard)}` : undefined,
      fix: [{ text: SAFE_APP }, { text: "Gọi setModuleGuard với tham số bằng địa chỉ 0:", copy: ZERO }],
    },
    {
      key: "fallback", threat: "T5", label: "Fallback handler hợp lệ", hint: TERMS.fallback, ok: !has(BIT.FALLBACK_HANDLER),
      detail: s ? `Hiện tại ${short(s.fallbackHandler)}; được chấp nhận ${short(t.allowedFallbackHandler)} hoặc 0x0` : undefined,
      fix: [{ text: SAFE_APP }, { text: "Gọi setFallbackHandler với handler đã thỏa thuận:", copy: t.allowedFallbackHandler }],
    },
    { key: "official", threat: "T7", label: "Ví chạy mã Safe chính thức", hint: TERMS.singleton, ok: true },
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
      key: "nonce", threat: "T8", label: "Ví không có giao dịch nào kể từ lúc nạp tiền", hint: TERMS.nonce, ok: unchanged,
      detail: `Nonce lúc nạp ${t.nonceAtFunding}, hiện tại ${t.currentNonce}`,
      fix: [{ text: "Người bán đã thực hiện giao dịch với ví sau khi bạn nạp tiền. Bàn giao bị khóa; hủy giao dịch để lấy lại tiền." }],
    },
    {
      key: "sellerOwner", label: "Người bán vẫn là owner của ví", ok: t.sellerIsOwner,
      fix: [{ text: "Người bán không còn là owner nên không thể bàn giao. Hủy giao dịch để lấy lại tiền." }],
    },
    { key: "guard", threat: "T4", label: "Không có guard", hint: TERMS.guard, ok: !has(BIT.GUARD_SET) },
    { key: "moduleGuard", threat: "T4b", label: "Không có module guard", hint: TERMS.moduleGuard, ok: !has(BIT.MODULE_GUARD_SET) },
    { key: "fallback", threat: "T5", label: "Fallback handler hợp lệ", hint: TERMS.fallback, ok: !has(BIT.FALLBACK_HANDLER) },
    ...assetChecks(t.expectedAssets, t.handoverAssetMask, "buyer"),
    { key: "owners", threat: "T1", label: "Chỉ còn owner mới", ok: !has(BIT.OWNERS_MISMATCH), pending: true },
    { key: "threshold", threat: "T2", label: "Đúng ngưỡng ký đã thỏa thuận", hint: TERMS.threshold, ok: !has(BIT.THRESHOLD_MISMATCH), pending: true },
    { key: "modules", threat: "T3", label: "Không còn module nào, kể cả hợp đồng ký quỹ", hint: TERMS.module, ok: !has(BIT.MODULES_ENABLED), pending: true },
  ];
}

/** Sau khi hoàn tất: xác nhận lại ví đã sạch. */
export function completedChecks(t: TradeData): Check[] {
  const m = t.handoverMask;
  const has = (b: bigint) => (m & b) !== 0n;
  return [
    { key: "owners", threat: "T1", label: "Chỉ còn owner mới", ok: !has(BIT.OWNERS_MISMATCH) },
    { key: "threshold", threat: "T2", label: "Đúng ngưỡng ký", hint: TERMS.threshold, ok: !has(BIT.THRESHOLD_MISMATCH) },
    { key: "modules", threat: "T3", label: "Không còn module", hint: TERMS.module, ok: !has(BIT.MODULES_ENABLED) },
    { key: "guard", threat: "T4", label: "Không có guard", hint: TERMS.guard, ok: !has(BIT.GUARD_SET) },
    { key: "moduleGuard", threat: "T4b", label: "Không có module guard", hint: TERMS.moduleGuard, ok: !has(BIT.MODULE_GUARD_SET) },
    { key: "fallback", threat: "T5", label: "Fallback handler hợp lệ", hint: TERMS.fallback, ok: !has(BIT.FALLBACK_HANDLER) },
    { key: "official", threat: "T7", label: "Ví chạy mã Safe chính thức", hint: TERMS.singleton, ok: !has(BIT.NOT_OFFICIAL_SAFE) },
    ...assetChecks(t.expectedAssets, t.handoverAssetMask, "buyer"),
  ];
}

export const sameAddr = (a?: Address | string, b?: Address | string) => !!a && !!b && a.toLowerCase() === b.toLowerCase();
