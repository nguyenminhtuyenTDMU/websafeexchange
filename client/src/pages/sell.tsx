import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAccount, usePublicClient } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { isAddress, parseEther, parseEventLogs, type Address } from "viem";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CircleCheck, CircleX } from "lucide-react";
import { escrowAbi, verifierAbi } from "@/lib/abi";
import { CHECKERS, ESCROW, ZERO } from "@/lib/config";
import { readSafe } from "@/lib/escrow";
import { useEscrowWrite } from "@/hooks/use-escrow-write";

type AssetRow = { checkerId: number; token: string; value: string };

const defaultDeadline = () => {
  const d = new Date(Date.now() + 3 * 24 * 3600 * 1000);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};

function parseAsset(a: AssetRow) {
  const token = (CHECKERS[a.checkerId].needsToken ? a.token.trim() : ZERO) as Address;
  const value = a.checkerId === 0 ? parseEther(a.value || "0") : a.checkerId === 3 ? 0n : BigInt(a.value || "0");
  return { checkerId: a.checkerId, token, value };
}

/** Kiểm tra trước khi niêm yết: đọc từ hợp đồng, không tốn gas. */
function usePreflight(wallet: string) {
  const client = usePublicClient();
  const { address: me } = useAccount();
  return useQuery({
    queryKey: ["preflight", wallet, me],
    enabled: !!client && isAddress(wallet),
    queryFn: async () => {
      const w = wallet as Address;
      const verifier = await client!.readContract({ address: ESCROW, abi: escrowAbi, functionName: "verifierAt", args: [0n] });
      const [supported, isOwner, active, safe] = await Promise.all([
        client!.readContract({ address: verifier, abi: verifierAbi, functionName: "isSupportedWallet", args: [w] }),
        me ? client!.readContract({ address: verifier, abi: verifierAbi, functionName: "isController", args: [w, me] }) : Promise.resolve(false),
        client!.readContract({ address: ESCROW, abi: escrowAbi, functionName: "activeTradeOf", args: [w] }),
        readSafe(client!, w).catch(() => null),
      ]);
      return { supported, isOwner, active, safe };
    },
  });
}

export default function SellPage() {
  const [, navigate] = useLocation();
  const { address: me } = useAccount();
  const { send, busy } = useEscrowWrite();
  const [wallet, setWallet] = useState("");
  const [buyer, setBuyer] = useState("");
  const [price, setPrice] = useState("0.001");
  const [deadline, setDeadline] = useState(defaultDeadline);
  const [owners, setOwners] = useState("");
  const [threshold, setThreshold] = useState("1");
  const [handler, setHandler] = useState("");
  const [assets, setAssets] = useState<AssetRow[]>([]);
  const [formError, setFormError] = useState("");
  const pre = usePreflight(wallet.trim());

  // điền sẵn fallback handler hiện tại của ví và owner mới = người mua
  useEffect(() => { if (pre.data?.safe && !handler) setHandler(pre.data.safe.fallbackHandler); }, [pre.data]);
  useEffect(() => { if (isAddress(buyer.trim()) && !owners) setOwners(buyer.trim()); }, [buyer]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    let params;
    try {
      const newOwners = owners.split(/[\s,]+/).filter(Boolean);
      if (![wallet, buyer, handler || ZERO, ...newOwners].every((a) => isAddress(a.trim()))) throw new Error("Có địa chỉ không hợp lệ.");
      params = {
        wallet: wallet.trim() as Address,
        verifierId: 0,
        buyer: buyer.trim() as Address,
        price: parseEther(price),
        deadline: BigInt(Math.floor(new Date(deadline).getTime() / 1000)),
        newOwners: newOwners as Address[],
        threshold: BigInt(threshold),
        allowedFallbackHandler: (handler.trim() || ZERO) as Address,
        assets: assets.map(parseAsset),
      };
    } catch (err) {
      setFormError(err instanceof Error ? err.message : String(err));
      return;
    }
    const receipt = await send("createTrade", [params]);
    if (!receipt) return;
    const [created] = parseEventLogs({ abi: escrowAbi, eventName: "TradeCreated", logs: receipt.logs });
    if (created) navigate(`/trade/${created.args.tradeId}`);
  }

  const p = pre.data;
  const Pre = ({ ok, children }: { ok: boolean; children: React.ReactNode }) => (
    <li className="flex items-center gap-2 text-sm">{ok ? <CircleCheck className="h-4 w-4 text-green-600" /> : <CircleX className="h-4 w-4 text-red-600" />}{children}</li>
  );

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>Niêm yết ví Safe</CardTitle>
          <CardDescription>
            Bạn phải là owner của ví. Sau khi niêm yết, trợ lý bàn giao sẽ hướng dẫn bạn chuẩn bị ví để người mua nạp tiền.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-5" onSubmit={submit}>
            <div className="space-y-2">
              <Label htmlFor="wallet">Địa chỉ ví Safe</Label>
              <Input id="wallet" value={wallet} onChange={(e) => setWallet(e.target.value)} placeholder="0x…" className="font-mono" />
              {pre.isFetching && <Loader2 className="h-4 w-4 animate-spin" />}
              {p && (
                <ul className="space-y-1">
                  <Pre ok={p.supported}>Ví chạy trên singleton Safe chính thức</Pre>
                  <Pre ok={p.isOwner}>{me ? "Tài khoản đang kết nối là owner của ví" : "Kết nối ví để kiểm tra quyền owner"}</Pre>
                  <Pre ok={p.active === 0n}>{p.active === 0n ? "Ví chưa có giao dịch nào đang mở" : `Ví đang có giao dịch #${p.active}`}</Pre>
                </ul>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="buyer">Người mua</Label>
              <Input id="buyer" value={buyer} onChange={(e) => setBuyer(e.target.value)} placeholder="0x…" className="font-mono" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="price">Giá (ETH)</Label>
                <Input id="price" value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deadline">Hạn chót</Label>
                <Input id="deadline" type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="owners">Owner sau bàn giao (mỗi địa chỉ cách nhau bởi dấu phẩy)</Label>
              <Input id="owners" value={owners} onChange={(e) => setOwners(e.target.value)} placeholder="Mặc định là người mua" className="font-mono" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="threshold">Ngưỡng ký sau bàn giao</Label>
                <Input id="threshold" value={threshold} onChange={(e) => setThreshold(e.target.value)} inputMode="numeric" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="handler">Fallback handler chấp nhận</Label>
                <Input id="handler" value={handler} onChange={(e) => setHandler(e.target.value)} placeholder={ZERO} className="font-mono" />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Tài sản chào bán kèm ví</Label>
                <Button type="button" variant="outline" size="sm" onClick={() => setAssets((a) => [...a, { checkerId: 0, token: "", value: "" }])}>
                  <Plus className="mr-1 h-4 w-4" />Thêm
                </Button>
              </div>
              {assets.length === 0 && <p className="text-sm text-muted-foreground">Không kèm tài sản: chỉ bán quyền kiểm soát ví.</p>}
              {assets.map((a, i) => {
                const c = CHECKERS[a.checkerId];
                const set = (patch: Partial<AssetRow>) => setAssets((all) => all.map((x, j) => (j === i ? { ...x, ...patch } : x)));
                return (
                  <div key={i} className="grid gap-2 rounded-md border p-3 sm:grid-cols-[120px_1fr_1fr_auto]">
                    <Select value={String(a.checkerId)} onValueChange={(v) => set({ checkerId: Number(v) })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{CHECKERS.map((x) => <SelectItem key={x.id} value={String(x.id)}>{x.name}</SelectItem>)}</SelectContent>
                    </Select>
                    {c.needsToken ? <Input placeholder="Địa chỉ hợp đồng token" value={a.token} onChange={(e) => set({ token: e.target.value })} className="font-mono" /> : <span />}
                    {c.valueLabel ? <Input placeholder={c.valueLabel} value={a.value} onChange={(e) => set({ value: e.target.value })} /> : <span />}
                    <Button type="button" variant="ghost" size="icon" aria-label="Xóa" onClick={() => setAssets((all) => all.filter((_, j) => j !== i))}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
              <p className="text-xs text-muted-foreground">Hợp đồng kiểm tra ngay lúc niêm yết rằng ví đang giữ đủ từng tài sản.</p>
            </div>

            {formError && <p className="text-sm text-red-600">{formError}</p>}
            <Button type="submit" disabled={!me || !!busy}>
              {busy === "createTrade" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Niêm yết
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
