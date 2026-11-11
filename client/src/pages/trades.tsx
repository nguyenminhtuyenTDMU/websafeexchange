import { useState } from "react";
import { Link } from "wouter";
import { useAccount } from "wagmi";
import { Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/common";
import { TradeTable } from "@/components/trade-table";
import { useEvents } from "@/hooks/use-escrow-data";
import { sameAddr } from "@/lib/conditions";
import { errorMessage } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Màn hình tra cứu 1: danh sách giao dịch, dựng từ sự kiện của hợp đồng. Mặc định chỉ giao dịch đang mở. */
export default function TradesPage() {
  const { data, isLoading, error } = useEvents();
  const { address: me } = useAccount();
  const [all, setAll] = useState(false);
  const [mine, setMine] = useState(false);
  const trades = (data?.trades ?? [])
    .filter((t) => all || t.status === "OPEN" || t.status === "FUNDED")
    .filter((t) => !mine || [t.seller, t.buyer].some((a) => sameAddr(a, me)));
  const title = `${mine ? "Giao dịch của tôi" : all ? "Tất cả giao dịch" : "Giao dịch đang mở"}`;

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <PageHeader title={title}
        actions={
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
            {me && (
              <div role="group" aria-label="Phạm vi" className="inline-flex rounded-md border bg-card p-0.5 text-sm">
                {[["Mọi người", false], ["Của tôi", true]].map(([label, value]) => (
                  <button key={String(value)} type="button" aria-pressed={mine === value} onClick={() => setMine(value as boolean)}
                    className={cn("rounded px-3 py-1 font-medium", mine === value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
                    {label as string}
                  </button>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2">
              <Switch id="all" checked={all} onCheckedChange={setAll} />
              <Label htmlFor="all">Gồm cả đã hoàn tất và đã hủy</Label>
            </div>
          </div>
        }>
        {data && <span className="tabular">Đồng bộ đến block {data.latest.toString()}</span>}
      </PageHeader>
      {isLoading ? <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" aria-hidden />Đang quét sự kiện của hợp đồng…</div>
        : error ? <p className="text-destructive">Không quét được sự kiện: {errorMessage(error)}</p>
        : <TradeTable trades={trades} empty={
            <>{mine ? "Bạn chưa tham gia giao dịch nào" + (all ? "." : " đang mở.") : all ? "Hợp đồng chưa ghi nhận giao dịch nào." : "Không có giao dịch nào đang mở."}{" "}
              <Link href="/sell" className="font-medium text-primary hover:underline">Niêm yết ví</Link></>
          } />}
    </div>
  );
}
