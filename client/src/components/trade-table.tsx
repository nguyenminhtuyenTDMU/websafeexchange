import { Link } from "wouter";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Addr, StatusBadge } from "@/components/common";
import type { TradeSummary } from "@/lib/escrow";
import { dateTime, eth } from "@/lib/format";

export function TradeTable({ trades, empty }: { trades: TradeSummary[]; empty: string }) {
  if (!trades.length) return <p className="text-muted-foreground">{empty}</p>;
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Mã</TableHead>
            <TableHead>Trạng thái</TableHead>
            <TableHead>Ví Safe</TableHead>
            <TableHead>Người bán</TableHead>
            <TableHead>Người mua</TableHead>
            <TableHead>Giá</TableHead>
            <TableHead>Hạn chót</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {trades.map((t) => (
            <TableRow key={t.id.toString()}>
              <TableCell>
                <Link href={`/trade/${t.id}`} className="font-medium text-primary hover:underline">#{t.id.toString()}</Link>
              </TableCell>
              <TableCell><StatusBadge status={t.status} />{t.cancelReason && <div className="mt-1 text-xs text-muted-foreground">{t.cancelReason}</div>}</TableCell>
              <TableCell><Addr a={t.wallet} /></TableCell>
              <TableCell><Addr a={t.seller} /></TableCell>
              <TableCell><Addr a={t.buyer} /></TableCell>
              <TableCell className="whitespace-nowrap">{eth(t.price)}</TableCell>
              <TableCell className="whitespace-nowrap">{dateTime(t.deadline)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
