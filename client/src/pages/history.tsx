import { useState } from "react";
import { useLocation } from "wouter";
import { useAccount } from "wagmi";
import { isAddress } from "viem";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/common";
import { TradeTable } from "@/components/trade-table";
import { useEvents } from "@/hooks/use-escrow-data";
import { sameAddr } from "@/lib/conditions";
import { explorerTx } from "@/lib/config";
import { eth } from "@/lib/format";

/** Màn hình tra cứu 3: lịch sử bàn giao theo địa chỉ (người bán, người mua hoặc ví Safe). */
export default function HistoryPage({ params }: { params: { address?: string } }) {
  const [, navigate] = useLocation();
  const { address: me } = useAccount();
  const [input, setInput] = useState(params.address ?? "");
  const target = params.address && isAddress(params.address) ? params.address : null;
  const { data, isLoading } = useEvents();
  const value = input.trim();
  const invalid = value.length > 0 && !isAddress(value);

  const trades = target ? (data?.trades ?? []).filter((t) => [t.seller, t.buyer, t.wallet].some((a) => sameAddr(a, target))) : [];
  const withdrawals = target ? (data?.withdrawals ?? []).filter((w) => sameAddr(w.account, target)) : [];

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <PageHeader title="Lịch sử theo địa chỉ" />

      <form className="space-y-1.5" onSubmit={(e) => { e.preventDefault(); if (isAddress(value)) navigate(`/history/${value}`); }}>
        <label htmlFor="addr" className="text-sm font-medium">Địa chỉ người bán, người mua hoặc ví Safe</label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input id="addr" value={input} onChange={(e) => setInput(e.target.value)} placeholder="0x…" aria-invalid={invalid}
            className="font-mono sm:max-w-xl" />
          <Button type="submit" disabled={!isAddress(value)}>Tra cứu</Button>
          {me && <Button type="button" variant="outline" onClick={() => { setInput(me); navigate(`/history/${me}`); }}>Ví của tôi</Button>}
        </div>
        {invalid && <p className="text-sm text-destructive">Địa chỉ phải có dạng 0x và 40 ký tự hex.</p>}
      </form>

      {target && (
        <section className="space-y-4">
          {isLoading ? <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" aria-label="Đang quét sự kiện" /></div>
            : <TradeTable trades={trades} empty="Địa chỉ này chưa tham gia giao dịch nào." />}
          {withdrawals.length > 0 && (
            <div className="rounded-lg border bg-card px-5 py-4 shadow-sm">
              <h3 className="mb-2 font-semibold">Các lần rút tiền</h3>
              <ul className="divide-y text-sm">
                {withdrawals.map((w) => (
                  <li key={w.tx} className="flex items-center justify-between py-2">
                    <a href={explorerTx(w.tx)} target="_blank" rel="noreferrer" className="font-mono hover:underline">{eth(w.amount)}</a>
                    <span className="font-mono text-xs text-muted-foreground">block {w.block.toString()}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
