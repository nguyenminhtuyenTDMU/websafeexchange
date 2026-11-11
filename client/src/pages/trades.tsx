import { useState } from "react";
import { Link } from "wouter";
import { Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/common";
import { TradeTable } from "@/components/trade-table";
import { useEvents } from "@/hooks/use-escrow-data";
import { errorMessage } from "@/lib/format";

/** Màn hình tra cứu 1: danh sách giao dịch đang mở, dựng từ sự kiện của hợp đồng. */
export default function TradesPage() {
  const { data, isLoading, error } = useEvents();
  const [all, setAll] = useState(false);
  const trades = (data?.trades ?? []).filter((t) => all || t.status === "OPEN" || t.status === "FUNDED");

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <PageHeader title="Giao dịch đang mở"
        actions={
          <div className="flex items-center gap-2">
            <Switch id="all" checked={all} onCheckedChange={setAll} />
            <Label htmlFor="all">Gồm cả đã hoàn tất và đã hủy</Label>
          </div>
        }>
        Đọc trực tiếp từ sự kiện của hợp đồng ký quỹ trên Sepolia, không qua máy chủ.
        {data && <span className="tabular"> Đã quét đến block {data.latest.toString()}.</span>}
      </PageHeader>
      {isLoading ? <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" aria-label="Đang quét sự kiện" /></div>
        : error ? <p className="text-destructive">Không quét được sự kiện: {errorMessage(error)}</p>
        : <TradeTable trades={trades} empty={
            <>{all ? "Hợp đồng chưa ghi nhận giao dịch nào." : "Không có giao dịch nào đang mở."}{" "}
              <Link href="/sell" className="font-medium text-primary hover:underline">Niêm yết ví</Link></>
          } />}
    </div>
  );
}
