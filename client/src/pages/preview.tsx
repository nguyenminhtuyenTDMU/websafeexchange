// CHỈ DÙNG KHI PHÁT TRIỂN (import.meta.env.DEV): xem giao diện trang giao dịch ở mọi trạng thái bằng dữ liệu mẫu.
// Không có trong bản build triển khai. Mọi địa chỉ dưới đây là dữ liệu mẫu, không phải giao dịch thật.
import { TradeView, type Role } from "@/components/trade-view";
import type { TradeData } from "@/lib/escrow";

const A = (n: number) => `0x${n.toString(16).padStart(4, "0").repeat(10)}` as `0x${string}`;
const base: TradeData = {
  id: 7n, seller: A(0x1ea8), buyer: A(0xba82), wallet: A(0xa766), verifier: A(0x4a6a), status: "OPEN",
  deadline: BigInt(Math.floor(Date.now() / 1000) + 2 * 86400), price: 10n ** 15n, threshold: 1n,
  allowedFallbackHandler: A(0x3efc), nonceAtFunding: 0n, termsHash: `0x${"5ab3".repeat(16)}`,
  newOwners: [A(0xba82)],
  assets: [{ checkerId: 0, token: "0x0000000000000000000000000000000000000000", value: 10n ** 16n },
    { checkerId: 2, token: A(0x0721), value: 42n }],
  expectedAssets: [{ checkerId: 0, token: "0x0000000000000000000000000000000000000000", value: 10n ** 16n }],
  readinessMask: (1n << 7n) | (1n << 4n), readinessAssetMask: 2n, handoverMask: 0n, handoverAssetMask: 0n,
  currentNonce: 1n, sellerIsOwner: true,
  safe: { owners: [A(0x1ea8)], threshold: 1n, nonce: 1n, modules: [], guard: A(0x9a4d), moduleGuard: "0x0000000000000000000000000000000000000000", fallbackHandler: A(0x3efc) },
  myCredit: 0n,
};

const T = (kind: string, block: bigint, b: string, detail?: string) => ({ kind, block, tx: `0x${b.repeat(32)}`, detail });
const LISTED = [T("Niêm yết", 12093601n, "a1")];
const FUNDED = [...LISTED, T("Người mua nạp tiền", 12094410n, "b2")];
const safeClean = { ...base.safe!, guard: "0x0000000000000000000000000000000000000000" as const };

const STATES: Record<string, { t: TradeData; role: Role; timeline: typeof LISTED }> = {
  "open-seller": { t: base, role: "seller", timeline: LISTED },
  "open-buyer-ready": { t: { ...base, readinessMask: 0n, readinessAssetMask: 0n, safe: safeClean }, role: "buyer", timeline: LISTED },
  "funded-buyer": { t: { ...base, status: "FUNDED", nonceAtFunding: 1n, currentNonce: 1n, readinessMask: 0n, readinessAssetMask: 0n, safe: safeClean, handoverMask: (1n << 1n) | (1n << 3n) }, role: "buyer", timeline: FUNDED },
  "funded-tampered": { t: { ...base, status: "FUNDED", nonceAtFunding: 1n, currentNonce: 2n, readinessMask: 0n, readinessAssetMask: 0n, safe: safeClean, handoverMask: (1n << 1n) | (1n << 3n), handoverAssetMask: 1n }, role: "buyer", timeline: FUNDED },
  "completed-seller": { t: { ...base, status: "COMPLETED", nonceAtFunding: 1n, readinessMask: 0n, readinessAssetMask: 0n, safe: safeClean, myCredit: 10n ** 15n }, role: "seller", timeline: [...FUNDED, T("Hoàn tất bàn giao", 12094502n, "c3")] },
  "cancelled": { t: { ...base, status: "CANCELLED", readinessMask: 0n, readinessAssetMask: 0n, safe: safeClean }, role: "viewer", timeline: [...LISTED, T("Hủy giao dịch", 12094050n, "d4", "Người bán hủy")] },
};

export default function PreviewPage({ params }: { params: { state: string } }) {
  const s = STATES[params.state] ?? STATES["open-seller"];
  return (
    <div>
      <p className="bg-warning px-4 py-1 text-center text-xs font-semibold text-warning-foreground">Dữ liệu mẫu, chỉ để xem giao diện ({params.state})</p>
      <TradeView t={s.t} role={s.role} timeline={s.timeline} timelineLoaded send={() => {}} busy={null} />
    </div>
  );
}
