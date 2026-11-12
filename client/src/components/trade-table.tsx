import { Link, useLocation } from "wouter";
import { Addr, StatusBadge } from "@/components/common";
import type { TradeSummary } from "@/lib/escrow";
import { dateTime, eth } from "@/lib/format";

export function TradeTable({ trades, empty }: { trades: TradeSummary[]; empty: React.ReactNode }) {
  const [, navigate] = useLocation();
  if (!trades.length) return <div className="rounded-lg border border-dashed px-5 py-8 text-center text-sm text-muted-foreground">{empty}</div>;
  return (
    <div className="overflow-x-auto rounded-lg border bg-card shadow-sm">
      <table className="w-full min-w-[760px] text-sm">
        <thead>
          <tr className="border-b bg-muted/50 text-left text-xs font-semibold text-muted-foreground">
            <th scope="col" className="px-4 py-2.5">Mã</th>
            <th scope="col" className="px-4 py-2.5">Trạng thái</th>
            <th scope="col" className="px-4 py-2.5">Ví Safe</th>
            <th scope="col" className="px-4 py-2.5">Người bán</th>
            <th scope="col" className="px-4 py-2.5">Người mua</th>
            <th scope="col" className="px-4 py-2.5 text-right">Giá</th>
            <th scope="col" className="px-4 py-2.5">Hạn chót</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {trades.map((t) => (
            <tr key={t.id.toString()} className="cursor-pointer hover:bg-accent/40"
              // cả hàng mở giao dịch; nút sao chép và liên kết bên trong vẫn làm việc của chúng. Bàn phím dùng liên kết #id.
              onClick={(e) => { if (!(e.target as HTMLElement).closest("a,button")) navigate(`/trade/${t.id}`); }}>
              <td className="px-4 py-3">
                <Link href={`/trade/${t.id}`} className="font-mono font-semibold text-primary hover:underline">#{t.id.toString()}</Link>
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={t.status} />
                {t.cancelReason && <div className="mt-0.5 text-xs text-muted-foreground">{t.cancelReason}</div>}
              </td>
              <td className="px-4 py-3"><Addr a={t.wallet} /></td>
              <td className="px-4 py-3"><Addr a={t.seller} /></td>
              <td className="px-4 py-3"><Addr a={t.buyer} /></td>
              <td className="whitespace-nowrap px-4 py-3 text-right font-mono">{eth(t.price)}</td>
              <td className="whitespace-nowrap px-4 py-3 tabular">
                {t.status === "OPEN" || t.status === "FUNDED" ? dateTime(t.deadline) : <span className="text-muted-foreground" aria-label="Đã kết thúc">—</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
