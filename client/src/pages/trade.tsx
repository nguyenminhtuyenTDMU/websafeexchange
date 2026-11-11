import { useMemo } from "react";
import { Link } from "wouter";
import { useAccount } from "wagmi";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TradeView } from "@/components/trade-view";
import { useEvents, useTrade } from "@/hooks/use-escrow-data";
import { useEscrowWrite } from "@/hooks/use-escrow-write";
import { sameAddr } from "@/lib/conditions";
import { errorMessage } from "@/lib/format";

function Notice({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-xl space-y-3 px-4 py-16 text-center">
      <h1 className="text-xl font-semibold">{title}</h1>
      {children && <p className="text-muted-foreground">{children}</p>}
      <div className="flex justify-center gap-2 pt-2">
        <Button asChild variant="outline"><Link href="/trades">Danh sách giao dịch</Link></Button>
        <Button asChild><Link href="/">Trang chủ</Link></Button>
      </div>
    </div>
  );
}

export default function TradePage({ params }: { params: { id: string } }) {
  const id = /^\d+$/.test(params.id) ? BigInt(params.id) : null;
  const { address } = useAccount();
  const { data: t, isLoading, error } = useTrade(id);
  const ev = useEvents();
  const { send, busy } = useEscrowWrite();
  const timeline = useMemo(() => ev.data?.trades.find((x) => x.id === id)?.events ?? [], [ev.data, id]);

  if (id === null) return <Notice title="Mã giao dịch không hợp lệ">Mã giao dịch là một số, ví dụ 1.</Notice>;
  if (isLoading) return <div className="flex justify-center py-24"><Loader2 className="h-6 w-6 animate-spin" aria-label="Đang tải giao dịch" /></div>;
  if (error) return <Notice title="Không đọc được giao dịch">{errorMessage(error)}</Notice>;
  if (!t) return <Notice title={`Không có giao dịch #${params.id}`}>Hợp đồng chưa ghi nhận giao dịch nào với mã này.</Notice>;

  const role = sameAddr(address, t.seller) ? "seller" : sameAddr(address, t.buyer) ? "buyer" : "viewer";
  return <TradeView t={t} role={role} timeline={timeline} timelineLoaded={!!ev.data} send={(fn, args, value) => send(fn as never, args, value)} busy={busy} />;
}
