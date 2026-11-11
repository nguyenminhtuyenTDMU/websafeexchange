import { useState } from "react";
import { useLocation } from "wouter";
import { useAccount } from "wagmi";
import { isAddress } from "viem";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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

  const trades = target ? (data?.trades ?? []).filter((t) => [t.seller, t.buyer, t.wallet].some((a) => sameAddr(a, target))) : [];
  const withdrawals = target ? (data?.withdrawals ?? []).filter((w) => sameAddr(w.account, target)) : [];

  return (
    <div className="container mx-auto max-w-6xl space-y-6 px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>Lịch sử bàn giao theo địa chỉ</CardTitle>
          <CardDescription>Nhập địa chỉ người bán, người mua hoặc địa chỉ ví Safe.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-col gap-2 sm:flex-row"
            onSubmit={(e) => { e.preventDefault(); if (isAddress(input.trim())) navigate(`/history/${input.trim()}`); }}
          >
            <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="0x…" className="font-mono" />
            <Button type="submit" disabled={!isAddress(input.trim())}>Tra cứu</Button>
            {me && <Button type="button" variant="outline" onClick={() => { setInput(me); navigate(`/history/${me}`); }}>Ví của tôi</Button>}
          </form>
        </CardContent>
      </Card>

      {target && (
        <Card>
          <CardHeader>
            <CardTitle>Giao dịch liên quan</CardTitle>
            <CardDescription className="font-mono break-all">{target}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {isLoading ? <Loader2 className="animate-spin" /> : <TradeTable trades={trades} empty="Địa chỉ này chưa tham gia giao dịch nào." />}
            {withdrawals.length > 0 && (
              <div>
                <h3 className="mb-2 font-semibold">Các lần rút tiền</h3>
                <ul className="space-y-1 text-sm">
                  {withdrawals.map((w) => (
                    <li key={w.tx}>
                      <a href={explorerTx(w.tx)} target="_blank" rel="noreferrer" className="hover:underline">{eth(w.amount)}</a>
                      <span className="text-muted-foreground"> · block {w.block.toString()}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
