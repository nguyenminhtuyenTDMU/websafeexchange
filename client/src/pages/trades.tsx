import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { TradeTable } from "@/components/trade-table";
import { useEvents } from "@/hooks/use-escrow-data";

/** Màn hình tra cứu 1: danh sách giao dịch đang mở, dựng từ sự kiện của hợp đồng. */
export default function TradesPage() {
  const { data, isLoading, error } = useEvents();
  const [all, setAll] = useState(false);
  const trades = (data?.trades ?? []).filter((t) => all || t.status === "OPEN" || t.status === "FUNDED");

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>{all ? "Tất cả giao dịch" : "Giao dịch đang mở"}</CardTitle>
          <CardDescription>
            Đọc trực tiếp từ sự kiện của hợp đồng ký quỹ trên Sepolia, không qua máy chủ.
            {data && ` Cập nhật đến block ${data.latest.toString()}.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Switch id="all" checked={all} onCheckedChange={setAll} />
            <Label htmlFor="all">Hiện cả giao dịch đã hoàn tất hoặc đã hủy</Label>
          </div>
          {isLoading ? <Loader2 className="animate-spin" />
            : error ? <p className="text-red-600">Không quét được sự kiện: {String(error)}</p>
            : <TradeTable trades={trades} empty="Chưa có giao dịch nào." />}
        </CardContent>
      </Card>
    </div>
  );
}
