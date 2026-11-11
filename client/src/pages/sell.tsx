import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useAccount, useConnect, usePublicClient } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { isAddress, parseEther, parseEventLogs, type Address } from "viem";
import { ChevronDown, CircleCheck, CircleX, Loader2, Plus, Trash2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { InfoTip, PageHeader } from "@/components/common";
import { escrowAbi, verifierAbi } from "@/lib/abi";
import { CHECKERS, ESCROW, ZERO } from "@/lib/config";
import { TERMS } from "@/lib/conditions";
import { readSafe } from "@/lib/escrow";
import { shortAddr } from "@/lib/format";
import { useEscrowWrite } from "@/hooks/use-escrow-write";

type AssetRow = { checkerId: number; token: string; value: string };

const defaultDeadline = () => {
  const d = new Date(Date.now() + 3 * 24 * 3600 * 1000);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};

function assetError(a: AssetRow): string | null {
  const c = CHECKERS[a.checkerId];
  if (c.needsToken && !isAddress(a.token.trim())) return "Cần địa chỉ hợp đồng token hợp lệ.";
  if (a.checkerId === 0) { try { parseEther(a.value || "x"); } catch { return "Nhập số ETH, ví dụ 0.01."; } }
  if ((a.checkerId === 1 || a.checkerId === 2) && !/^\d+$/.test(a.value.trim())) return a.checkerId === 1 ? "Nhập số nguyên (đơn vị nhỏ nhất của token)." : "Nhập token ID là số nguyên.";
  return null;
}
function parseAsset(a: AssetRow) {
  const token = (CHECKERS[a.checkerId].needsToken ? a.token.trim() : ZERO) as Address;
  const value = a.checkerId === 0 ? parseEther(a.value) : a.checkerId === 3 ? 0n : BigInt(a.value.trim());
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

function Field({ id, label, hint, error, children }: { id: string; label: React.ReactNode; hint?: string; error?: string | null; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="flex items-center gap-1.5">{label}</Label>
      {children}
      {error ? <p className="text-sm text-destructive">{error}</p> : hint ? <p className="text-sm text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function Gate({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-sm">
      {ok ? <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden /> : <CircleX className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden />}
      <span><span className="sr-only">{ok ? "Đạt: " : "Chưa đạt: "}</span>{children}</span>
    </li>
  );
}

export default function SellPage() {
  const [, navigate] = useLocation();
  const { address: me } = useAccount();
  const { send, busy } = useEscrowWrite();
  const { connect, connectors, isPending: connecting } = useConnect();
  const [wallet, setWallet] = useState("");
  const [buyer, setBuyer] = useState("");
  const [price, setPrice] = useState("0.001");
  const [deadline, setDeadline] = useState(defaultDeadline);
  const [owners, setOwners] = useState("");
  const [ownersTouched, setOwnersTouched] = useState(false);
  const [threshold, setThreshold] = useState("1");
  const [handler, setHandler] = useState("");
  const [assets, setAssets] = useState<AssetRow[]>([]);
  const [tried, setTried] = useState(false);
  const w = wallet.trim();
  const pre = usePreflight(w);

  useEffect(() => { if (pre.data?.safe && !handler) setHandler(pre.data.safe.fallbackHandler); }, [pre.data]);
  useEffect(() => { if (!ownersTouched) setOwners(isAddress(buyer.trim()) ? buyer.trim() : ""); }, [buyer, ownersTouched]);

  const ownerList = owners.split(/[\s,]+/).filter(Boolean);
  const errors = useMemo(() => {
    const e: Record<string, string | null> = {};
    e.wallet = !w ? "Nhập địa chỉ ví Safe." : !isAddress(w) ? "Địa chỉ phải có dạng 0x và 40 ký tự hex." : null;
    e.buyer = !buyer.trim() ? "Nhập địa chỉ người mua." : !isAddress(buyer.trim()) ? "Địa chỉ người mua không hợp lệ."
      : me && buyer.trim().toLowerCase() === me.toLowerCase() ? "Người mua phải khác tài khoản người bán." : null;
    try { e.price = parseEther(price || "0") > 0n ? null : "Giá phải lớn hơn 0."; } catch { e.price = "Nhập số ETH, ví dụ 0.001."; }
    e.deadline = new Date(deadline).getTime() > Date.now() + 10 * 60 * 1000 ? null : "Hạn chót phải sau thời điểm hiện tại ít nhất 10 phút.";
    e.owners = ownerList.length === 0 ? "Cần ít nhất một owner mới." : ownerList.some((o) => !isAddress(o)) ? "Có địa chỉ owner không hợp lệ."
      : new Set(ownerList.map((o) => o.toLowerCase())).size !== ownerList.length ? "Danh sách owner bị trùng." : ownerList.length > 10 ? "Tối đa 10 owner." : null;
    e.handler = handler.trim() && !isAddress(handler.trim()) ? "Địa chỉ fallback handler không hợp lệ." : null;
    return e;
  }, [w, buyer, price, deadline, ownerList.join(","), handler, me]);
  const assetErrors = assets.map(assetError);
  const p = pre.data;
  const gateOk = !!p && p.supported && p.isOwner && p.active === 0n;
  const formOk = Object.values(errors).every((x) => !x) && assetErrors.every((x) => !x);
  const thresholdMax = Math.max(1, Math.min(ownerList.length, 10));
  useEffect(() => { if (Number(threshold) > thresholdMax) setThreshold(String(thresholdMax)); }, [thresholdMax]);

  const blocker = !me ? "Kết nối ví owner để niêm yết."
    : !formOk ? "Sửa các ô đang báo lỗi."
    : !p ? "Đang kiểm tra ví…"
    : !gateOk ? "Ví chưa qua bước kiểm tra ở trên." : null;
  const show = (k: string) => (tried || (k === "wallet" ? w.length > 0 : true) ? errors[k] : null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setTried(true);
    if (blocker) return;
    const receipt = await send("createTrade", [{
      wallet: w as Address,
      verifierId: 0,
      buyer: buyer.trim() as Address,
      price: parseEther(price),
      deadline: BigInt(Math.floor(new Date(deadline).getTime() / 1000)),
      newOwners: ownerList as Address[],
      threshold: BigInt(threshold),
      allowedFallbackHandler: (handler.trim() || ZERO) as Address,
      assets: assets.map(parseAsset),
    }]);
    if (!receipt) return;
    const [created] = parseEventLogs({ abi: escrowAbi, eventName: "TradeCreated", logs: receipt.logs });
    if (created) navigate(`/trade/${created.args.tradeId}`);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8">
      <PageHeader title="Niêm yết ví Safe" />

      <form onSubmit={submit} noValidate className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-10">
          <section className="space-y-4">
            <h2 className="text-lg font-semibold">Ví cần bán</h2>
            <Field id="wallet" label="Địa chỉ ví Safe" error={show("wallet")}>
              <Input id="wallet" value={wallet} onChange={(e) => setWallet(e.target.value)} placeholder="0x…" className="font-mono" aria-invalid={!!show("wallet")} />
            </Field>
            <div className="rounded-lg border bg-card px-4 py-3">
              <h3 className="mb-2 text-sm font-semibold">Kiểm tra ví</h3>
              {!isAddress(w) ? <p className="text-sm text-muted-foreground">Nhập địa chỉ ví để kiểm tra.</p>
                : pre.isFetching && !p ? <p className="text-sm text-muted-foreground"><Loader2 className="mr-1.5 inline h-4 w-4 animate-spin" aria-hidden />Đang đọc ví trên Sepolia…</p>
                : p ? (
                  <ul className="space-y-1.5">
                    <Gate ok={p.supported}>Ví chạy mã Safe chính thức</Gate>
                    <Gate ok={p.isOwner}>{me ? `Tài khoản ${shortAddr(me)} là owner của ví` : "Kết nối ví để kiểm tra quyền owner"}</Gate>
                    <Gate ok={p.active === 0n}>{p.active === 0n ? "Ví chưa có giao dịch nào đang mở" : `Ví đang có giao dịch #${p.active} chưa kết thúc`}</Gate>
                  </ul>
                ) : <p className="text-sm text-destructive">Không đọc được ví. Kiểm tra lại địa chỉ.</p>}
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-lg font-semibold">Người mua và giá</h2>
            <Field id="buyer" label="Địa chỉ người mua" error={tried ? errors.buyer : buyer && errors.buyer}>
              <Input id="buyer" value={buyer} onChange={(e) => setBuyer(e.target.value)} placeholder="0x…" className="font-mono" />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="price" label="Giá (ETH)" error={errors.price}>
                <Input id="price" value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" className="font-mono" />
              </Field>
              <Field id="deadline" label={<>Hạn chót <InfoTip text="Quá hạn mà chưa hoàn tất, bất kỳ ai cũng hủy được và tiền về người mua." label="Giải thích hạn chót" /></>} error={errors.deadline}>
                <Input id="deadline" type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
              </Field>
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-semibold">Tài sản chào bán kèm ví</h2>
              <Button type="button" variant="outline" size="sm" onClick={() => setAssets((a) => [...a, { checkerId: 0, token: "", value: "" }])}>
                <Plus className="mr-1 h-4 w-4" />Thêm tài sản
              </Button>
            </div>
            {assets.length === 0
              ? <p className="text-sm text-muted-foreground">Chỉ bán quyền kiểm soát ví.</p>
              : (
                <ul className="divide-y rounded-lg border bg-card">
                  {assets.map((a, i) => {
                    const c = CHECKERS[a.checkerId];
                    const set = (patch: Partial<AssetRow>) => setAssets((all) => all.map((x, j) => (j === i ? { ...x, ...patch } : x)));
                    return (
                      <li key={i} className="space-y-1.5 p-3">
                        <div className="grid gap-2 sm:grid-cols-[120px_1fr_1fr_auto]">
                          <Select value={String(a.checkerId)} onValueChange={(v) => set({ checkerId: Number(v) })}>
                            <SelectTrigger aria-label="Loại tài sản"><SelectValue /></SelectTrigger>
                            <SelectContent>{CHECKERS.map((x) => <SelectItem key={x.id} value={String(x.id)}>{x.name}</SelectItem>)}</SelectContent>
                          </Select>
                          {c.needsToken ? <Input aria-label="Địa chỉ hợp đồng token" placeholder="Địa chỉ hợp đồng 0x…" value={a.token} onChange={(e) => set({ token: e.target.value })} className="font-mono placeholder:font-sans" /> : <span className="hidden sm:block" />}
                          {c.valueLabel ? <Input aria-label={c.valueLabel} placeholder={c.valueLabel} value={a.value} onChange={(e) => set({ value: e.target.value })} className="font-mono placeholder:font-sans" /> : <span className="hidden sm:block" />}
                          <Button type="button" variant="ghost" size="icon" aria-label="Xóa tài sản" onClick={() => setAssets((all) => all.filter((_, j) => j !== i))}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        {(tried || a.value || a.token) && assetErrors[i] && <p className="text-sm text-destructive">{assetErrors[i]}</p>}
                      </li>
                    );
                  })}
                </ul>
              )}
          </section>

          <Collapsible defaultOpen={false} className="rounded-lg border bg-card">
            <CollapsibleTrigger className="group flex w-full items-center justify-between gap-4 px-4 py-3 text-left">
              <span>
                <span className="block font-semibold">Điều kiện bàn giao</span>
                <span className="block text-sm text-muted-foreground">
                  {ownerList.length ? `${ownerList.length} owner mới, ngưỡng ký ${threshold}/${ownerList.length}` : "Owner mới mặc định là người mua"}
                  {handler ? `, fallback handler ${shortAddr(handler)}` : ""}
                </span>
              </span>
              <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-data-[state=open]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 border-t px-4 py-4">
              <Field id="owners" label="Owner sau bàn giao" error={errors.owners}>
                <Input id="owners" value={owners} onChange={(e) => { setOwnersTouched(true); setOwners(e.target.value); }} placeholder="0x…, 0x…" className="font-mono" />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="threshold" label={<>Ngưỡng ký sau bàn giao <InfoTip text={TERMS.threshold} label="Giải thích ngưỡng ký" /></>}>
                  <Select value={threshold} onValueChange={setThreshold}>
                    <SelectTrigger id="threshold"><SelectValue /></SelectTrigger>
                    <SelectContent>{Array.from({ length: thresholdMax }, (_, i) => String(i + 1)).map((v) => <SelectItem key={v} value={v}>{v} / {Math.max(ownerList.length, 1)}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field id="handler" label={<>Fallback handler chấp nhận <InfoTip text={TERMS.fallback} label="Giải thích fallback handler" /></>}
                  error={errors.handler}>
                  <Input id="handler" value={handler} onChange={(e) => setHandler(e.target.value)} placeholder={ZERO} className="font-mono" />
                </Field>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        <aside className="lg:sticky lg:top-20 lg:self-start">
          <div className="space-y-4 rounded-lg border bg-card px-5 py-5 shadow-sm">
            <h2 className="font-semibold">Niêm yết</h2>
            {me ? (
              <Button type="submit" size="lg" className="w-full" disabled={!!busy}>
                {busy === "createTrade" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Niêm yết ví
              </Button>
            ) : (
              <Button type="button" size="lg" className="w-full" disabled={connecting} onClick={() => connect({ connector: connectors[0] })}>
                <Wallet className="mr-2 h-4 w-4" />{connecting ? "Đang kết nối…" : "Kết nối ví owner"}
              </Button>
            )}
            {blocker && me && <p className={tried ? "text-sm text-destructive" : "text-sm text-muted-foreground"} role="status">{blocker}</p>}
          </div>
        </aside>
      </form>
    </div>
  );
}
