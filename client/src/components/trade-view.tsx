import { useEffect, useState } from "react";
import { Ban, ChevronDown, CircleCheck, ExternalLink, Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Addr, AssetLabel, AuditReport, CopyChip, InfoTip, LifecycleRail, stepsDone } from "@/components/common";
import { completedChecks, fundedChecks, readinessChecks } from "@/lib/conditions";
import type { AssetSpec, TradeData } from "@/lib/escrow";
import { ESCROW, explorerTx } from "@/lib/config";
import { dateTime, eth, isExpired, STATUS_LABEL } from "@/lib/format";
import { cn } from "@/lib/utils";

export type Role = "seller" | "buyer" | "viewer";
export type TimelineEvent = { kind: string; block: bigint; tx: string; detail?: string };
type Send = (fn: string, args: readonly unknown[], value?: bigint) => unknown;

const STATUS_FILL: Record<string, string> = { OPEN: "bg-st-listed", FUNDED: "bg-st-funded", COMPLETED: "bg-st-done", CANCELLED: "bg-st-cancel" };
const ROLE_LABEL: Record<Role, string> = { seller: "Bạn là người bán", buyer: "Bạn là người mua", viewer: "Bạn đang xem" };

function Ledger({ rows }: { rows: [string, React.ReactNode][] }) {
  return (
    <dl className="divide-y text-sm">
      {rows.map(([k, v]) => (
        <div key={k} className="grid grid-cols-[minmax(0,9.5rem)_1fr] gap-3 py-2.5">
          <dt className="text-muted-foreground">{k}</dt>
          <dd className="min-w-0 break-words">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

const assetList = (list: readonly AssetSpec[], empty: string) =>
  list.length ? <ul className="space-y-1">{list.map((a, i) => <li key={i}><AssetLabel a={a} /></li>)}</ul> : <span className="text-muted-foreground">{empty}</span>;

function Confirm({ trigger, title, children, action, onConfirm, needsAck, destructive }: {
  trigger: React.ReactNode; title: string; children: React.ReactNode; action: string;
  onConfirm: () => void; needsAck?: string; destructive?: boolean;
}) {
  const [ack, setAck] = useState(false);
  return (
    <AlertDialog onOpenChange={(o) => !o && setAck(false)}>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription asChild><div className="space-y-3 text-sm text-foreground">{children}</div></AlertDialogDescription>
        </AlertDialogHeader>
        {needsAck && (
          <label className="flex items-start gap-2.5 rounded-md bg-muted p-3 text-sm">
            <Checkbox checked={ack} onCheckedChange={(v) => setAck(!!v)} className="mt-0.5" />
            <span>{needsAck}</span>
          </label>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel>Quay lại</AlertDialogCancel>
          <AlertDialogAction disabled={!!needsAck && !ack} onClick={onConfirm}
            className={cn(destructive && "bg-destructive text-destructive-foreground hover:bg-destructive/90")}>
            {action}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function NextAction({ t, role, send, busy }: { t: TradeData; role: Role; send: Send; busy: string | null }) {
  const [picked, setPicked] = useState<boolean[]>([]);
  useEffect(() => setPicked(t.assets.map(() => true)), [t.assets.length]);
  const expected = t.assets.filter((_, i) => picked[i] ?? true);
  const expired = isExpired(t.deadline);
  const ready = t.readinessMask === 0n && t.readinessAssetMask === 0n;
  const suspicious = t.currentNonce !== t.nonceAtFunding || t.handoverAssetMask !== 0n;
  const spin = (fn: string) => busy === fn && <Loader2 className="mr-2 h-4 w-4 animate-spin" />;
  const live = t.status === "OPEN" || t.status === "FUNDED";

  let primary: React.ReactNode = null;
  if (role === "buyer" && t.status === "OPEN") {
    primary = (
      <div className="space-y-4">
        <div>
          <h3 className="flex items-center gap-1.5 font-semibold">Tài sản bạn kỳ vọng nhận cùng ví
            <InfoTip text="Lúc giải ngân, hợp đồng kiểm tra đúng những tài sản bạn chọn. Bỏ chọn hết nghĩa là chỉ mua ví." label="Giải thích tài sản kỳ vọng" /></h3>
          {t.assets.length ? (
            <div className="mt-3 space-y-2">
              {t.assets.map((a, i) => (
                <label key={i} className="flex items-center gap-2.5 text-sm">
                  <Checkbox checked={picked[i] ?? true} onCheckedChange={(v) => setPicked((p) => p.map((x, j) => (j === i ? !!v : x)))} />
                  <AssetLabel a={a} />
                </label>
              ))}
            </div>
          ) : <p className="mt-2 text-sm">Người bán không chào kèm tài sản nào.</p>}
        </div>
        <Confirm
          title="Xem lại trước khi nạp tiền"
          action={`Nạp ${eth(t.price)}`}
          needsAck="Tôi hiểu: tiền chỉ đến người bán khi hợp đồng xác nhận ví sạch; nếu người bán động vào ví sau lúc này, tôi được hủy và lấy lại tiền."
          onConfirm={() => send("deposit", [t.id, t.termsHash, expected.map((a) => ({ checkerId: a.checkerId, token: a.token, value: a.value }))], t.price)}
          trigger={
            <Button size="lg" disabled={!ready || expired || !!busy}>{spin("deposit")}Xem lại và nạp {eth(t.price)}</Button>
          }>
          <Ledger rows={[
            ["Bạn trả", <span className="font-mono font-semibold">{eth(t.price)}</span>],
            ["Ví nhận", <Addr a={t.wallet} />],
            ["Owner sau bàn giao", <div className="flex flex-col gap-1">{t.newOwners.map((o) => <Addr key={o} a={o} />)}</div>],
            ["Ngưỡng ký", `${t.threshold} / ${t.newOwners.length}`],
            ["Tài sản kỳ vọng", assetList(expected, "Chỉ mua ví")],
            ["Hạn chót", dateTime(t.deadline)],
          ]} />
        </Confirm>
        {!ready && <p className="text-sm text-muted-foreground">Chưa nạp được: ví chưa đạt mọi điều kiện trong báo cáo kiểm tra.</p>}
        {expired && <p className="text-sm text-destructive">Giao dịch đã quá hạn.</p>}
      </div>
    );
  } else if (role === "seller" && t.status === "OPEN") {
    primary = (
      <div className="space-y-2">
        <h3 className="font-semibold">{ready ? "Ví đã sẵn sàng, chờ người mua nạp tiền" : "Đưa ví về trạng thái sẵn sàng"}</h3>
        {ready && <p className="text-sm">Từ lúc người mua nạp tiền, đừng thực hiện giao dịch nào với ví.</p>}
        <p className="pt-1 text-sm">Gửi đường dẫn giao dịch cho người mua:</p>
        <CopyChip value={typeof window !== "undefined" ? window.location.href : ""} />
      </div>
    );
  } else if (t.status === "FUNDED") {
    primary = (
      <div className="space-y-3">
        <h3 className="font-semibold">Hoàn tất bàn giao</h3>
        <Confirm
          title="Hợp đồng sẽ làm gì khi hoàn tất"
          action="Hoàn tất bàn giao"
          onConfirm={() => send("finalizeHandover", [t.id])}
          trigger={<Button size="lg" disabled={!!busy}>{spin("finalizeHandover")}Hoàn tất bàn giao</Button>}>
          <ol className="list-decimal space-y-1.5 pl-5">
            <li>Thêm owner mới, xóa mọi owner cũ, đặt ngưỡng ký {t.threshold.toString()}.</li>
            <li>Tự gỡ hợp đồng ký quỹ khỏi danh sách module của ví.</li>
            <li>Kiểm tra lại toàn bộ điều kiện bàn giao sạch và tài sản kỳ vọng.</li>
            <li>Chỉ khi mọi điều kiện đạt: ghi có {eth(t.price)} cho người bán.</li>
          </ol>
        </Confirm>
      </div>
    );
  }

  const withdraw = t.myCredit > 0n && (
    <div className="space-y-2">
      <h3 className="font-semibold">Bạn có {eth(t.myCredit)} chờ rút</h3>
      <Button size="lg" disabled={!!busy} onClick={() => send("withdraw", [])}>{spin("withdraw")}Rút {eth(t.myCredit)}</Button>
    </div>
  );

  const cancels: React.ReactNode[] = [];
  const refund = t.status === "FUNDED" ? `${eth(t.price)} được ghi có lại cho người mua để rút.` : "Chưa ai nạp tiền nên không có khoản hoàn.";

  // Ví bị động vào sau khi nạp: việc đúng của người mua là lấy lại tiền, nên đây thành thao tác chính
  if (role === "buyer" && t.status === "FUNDED" && suspicious) {
    primary = (
      <div className="space-y-3">
        <h3 className="font-semibold text-destructive">Ví đã bị thay đổi sau khi bạn nạp tiền</h3>
        <p className="text-sm text-muted-foreground">Bàn giao không thể hoàn tất. Hủy giao dịch để {eth(t.price)} được ghi có lại cho bạn, rồi rút về ví.</p>
        <Confirm destructive title="Hủy và lấy lại tiền?" action="Hủy và lấy lại tiền" onConfirm={() => send("cancelByBuyer", [t.id])}
          trigger={<Button size="lg" variant="destructive" disabled={!!busy}>{spin("cancelByBuyer")}Hủy và lấy lại {eth(t.price)}</Button>}>
          <p>Hợp đồng đã ghi nhận ví bị thay đổi hoặc thiếu tài sản kỳ vọng. {refund}</p>
        </Confirm>
      </div>
    );
  }

  if (role === "seller" && live) cancels.push(
    <Confirm key="s" destructive title="Hủy giao dịch?" action="Hủy giao dịch" onConfirm={() => send("cancelBySeller", [t.id])}
      trigger={<Button variant="outline" disabled={!!busy}>{spin("cancelBySeller")}Hủy giao dịch</Button>}>
      <p>Ví được giải phóng để niêm yết lại. {refund}</p>
    </Confirm>);
  if (role === "buyer" && t.status === "OPEN") cancels.push(
    <Confirm key="b" destructive title="Hủy giao dịch?" action="Hủy giao dịch" onConfirm={() => send("cancelByBuyer", [t.id])}
      trigger={<Button variant="outline" disabled={!!busy}>{spin("cancelByBuyer")}Hủy giao dịch</Button>}>
      <p>{refund}</p>
    </Confirm>);
  if (expired && live) cancels.push(
    <Confirm key="e" destructive title="Hủy giao dịch quá hạn?" action="Hủy giao dịch quá hạn" onConfirm={() => send("cancelExpired", [t.id])}
      trigger={<Button variant="outline" disabled={!!busy}>{spin("cancelExpired")}Hủy giao dịch quá hạn</Button>}>
      <p>Hạn chót đã qua nên ai cũng hủy được. {refund}</p>
    </Confirm>);

  if (!primary && !withdraw && !cancels.length) {
    return <p className="text-sm text-muted-foreground">Không có thao tác nào cho bạn ở trạng thái này.</p>;
  }
  return (
    <section aria-label="Bước tiếp theo" className="space-y-5">
      {primary}
      {withdraw}
      {cancels.length > 0 && (
        <Collapsible className={cn((primary || withdraw) && "border-t pt-4")}>
          <CollapsibleTrigger className="group flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
            Lựa chọn hủy giao dịch<ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3 flex flex-wrap gap-2">{cancels}</CollapsibleContent>
        </Collapsible>
      )}
    </section>
  );
}

function StateBand({ t, role }: { t: TradeData; role: Role }) {
  if (t.status === "FUNDED" && (t.currentNonce !== t.nonceAtFunding || t.handoverAssetMask !== 0n)) {
    return (
      <div role="alert" className="flex gap-3 border-b bg-destructive/10 px-5 py-4 text-sm sm:px-7">
        <Lock className="mt-0.5 h-5 w-5 shrink-0 text-destructive" aria-hidden />
        <div>
          <p className="font-semibold text-destructive">Ví đã bị động vào sau khi nạp tiền</p>
          <p className="mt-0.5">
            {t.currentNonce !== t.nonceAtFunding ? `Nonce của ví đổi từ ${t.nonceAtFunding} thành ${t.currentNonce}. ` : "Ví thiếu tài sản kỳ vọng. "}
            {role === "buyer" ? "Hợp đồng khóa việc bàn giao; bạn được hủy để lấy lại tiền." : "Hợp đồng khóa việc bàn giao; người mua được hủy để lấy lại tiền."}
          </p>
        </div>
      </div>
    );
  }
  if (t.status === "FUNDED") {
    return (
      <div className="flex gap-3 border-b bg-st-funded/10 px-5 py-4 text-sm sm:px-7">
        <Lock className="mt-0.5 h-5 w-5 shrink-0 text-st-funded" aria-hidden />
        <div>
          <p className="font-semibold text-st-funded">Ví đang được đóng băng</p>
          <p className="mt-0.5">
            {role === "seller" ? "Người mua đã nạp tiền. Đừng thực hiện thêm giao dịch nào với ví: một giao dịch bất kỳ sẽ khóa việc bàn giao và cho phép người mua hủy."
              : `Hợp đồng đã ghi lại nonce ${t.nonceAtFunding} của ví lúc nạp tiền. Nonce đổi nghĩa là người bán đã động vào ví.`}
          </p>
        </div>
      </div>
    );
  }
  if (t.status === "COMPLETED") {
    return (
      <div className="flex gap-3 border-b bg-st-done/10 px-5 py-4 text-sm sm:px-7">
        <CircleCheck className="mt-0.5 h-5 w-5 shrink-0 text-st-done" aria-hidden />
        <div>
          <p className="font-semibold text-st-done">Ví đã được bàn giao sạch</p>
          <p className="mt-0.5">{role === "buyer" ? "Bạn là owner duy nhất cùng tập owner đã thỏa thuận; hợp đồng ký quỹ đã tự gỡ khỏi ví." : "Hợp đồng đã chuyển quyền kiểm soát và ghi có tiền cho người bán."}</p>
        </div>
      </div>
    );
  }
  if (t.status === "CANCELLED") {
    return (
      <div className="flex gap-3 border-b bg-muted px-5 py-4 text-sm sm:px-7">
        <Ban className="mt-0.5 h-5 w-5 shrink-0 text-st-cancel" aria-hidden />
        <p><span className="font-semibold">Giao dịch đã hủy.</span> Ví đã được giải phóng; khoản nạp (nếu có) đã ghi có cho người mua để rút.</p>
      </div>
    );
  }
  return null;
}

export function TradeView({ t, role, timeline, timelineLoaded, send, busy }: {
  t: TradeData; role: Role; timeline: TimelineEvent[]; timelineLoaded: boolean; send: Send; busy: string | null;
}) {
  const ready = t.readinessMask === 0n && t.readinessAssetMask === 0n;
  const done = stepsDone(t.status, ready);
  const audit = t.status === "OPEN"
    ? { title: "Báo cáo kiểm tra ví trước khi nạp tiền", items: readinessChecks(t), clean: "Ví sẵn sàng",
        note: undefined }
    : t.status === "FUNDED"
    ? { title: "Báo cáo kiểm tra trước khi hoàn tất", items: fundedChecks(t), clean: "Có thể hoàn tất", note: undefined }
    : t.status === "COMPLETED"
    ? { title: "Kiểm tra lại ví sau bàn giao", items: completedChecks(t), clean: "Ví sạch", note: undefined }
    : null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <article className="overflow-hidden rounded-xl border bg-card shadow-md">
        <header className="space-y-5 bg-shell px-5 py-5 text-shell-foreground sm:px-7">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <h1 className="text-2xl font-semibold tracking-tight">Giao dịch #{t.id.toString()}</h1>
              <span className={cn("rounded-full px-2.5 py-0.5 text-sm font-semibold text-white dark:text-primary-foreground", STATUS_FILL[t.status])}>{STATUS_LABEL[t.status]}</span>
            </div>
            <p className="text-sm text-shell-muted tabular">
              {ROLE_LABEL[role]} · {eth(t.price)} · hạn {dateTime(t.deadline)}
              {isExpired(t.deadline) && (t.status === "OPEN" || t.status === "FUNDED") && <span className="ml-1 font-semibold text-shell-foreground">(đã quá hạn)</span>}
            </p>
          </div>
          <LifecycleRail done={done} cancelled={t.status === "CANCELLED"} frozen={t.status === "FUNDED"}
            blocked={t.status === "FUNDED" && (t.currentNonce !== t.nonceAtFunding || t.handoverAssetMask !== 0n)} />
        </header>

        <StateBand t={t} role={role} />

        <div className="grid lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0 space-y-8 px-5 py-6 sm:px-7">
            {audit && <AuditReport title={audit.title} items={audit.items} cleanLabel={audit.clean} note={audit.note} />}
            <NextAction t={t} role={role} send={send} busy={busy} />
          </div>

          <aside className="min-w-0 space-y-8 border-t bg-muted/30 px-5 py-6 sm:px-7 lg:border-l lg:border-t-0">
            <section>
              <h2 className="mb-1 font-semibold">Điều kiện giao dịch</h2>
              <Ledger rows={[
                ["Ví Safe", <Addr a={t.wallet} />],
                ["Người bán", <Addr a={t.seller} />],
                ["Người mua", <Addr a={t.buyer} />],
                ["Giá", <span className="font-mono">{eth(t.price)}</span>],
                ["Owner sau bàn giao", <div className="flex flex-col gap-1">{t.newOwners.map((o) => <Addr key={o} a={o} />)}</div>],
                ["Ngưỡng ký", <span className="tabular">{t.threshold.toString()} / {t.newOwners.length}</span>],
                ["Tài sản chào bán", assetList(t.assets, "Không kèm tài sản")],
                ...((t.status === "FUNDED" || t.status === "COMPLETED") ? [["Tài sản kỳ vọng", assetList(t.expectedAssets, "Chỉ mua ví")] as [string, React.ReactNode]] : []),
              ]} />
              <Collapsible className="mt-1 border-t pt-3">
                <CollapsibleTrigger className="group flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
                  Chi tiết kỹ thuật<ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2">
                  <Ledger rows={[
                    ["Hợp đồng ký quỹ", <Addr a={ESCROW} />],
                    ["Bộ xác minh ví", <Addr a={t.verifier} />],
                    ["Fallback handler chấp nhận", <Addr a={t.allowedFallbackHandler} />],
                    ["termsHash", <span className="break-all font-mono text-xs">{t.termsHash}</span>],
                    ...(t.status !== "OPEN" ? [["Nonce lúc nạp", <span className="font-mono">{t.nonceAtFunding.toString()}</span>] as [string, React.ReactNode]] : []),
                  ]} />
                </CollapsibleContent>
              </Collapsible>
            </section>

            <section>
              <h2 className="mb-3 font-semibold">Nhật ký trên chuỗi</h2>
              {!timelineLoaded ? <p className="text-sm text-muted-foreground"><Loader2 className="mr-1.5 inline h-4 w-4 animate-spin" aria-label="Đang tải" />Đang quét sự kiện…</p>
                : timeline.length === 0 ? <p className="text-sm text-muted-foreground">Chưa có sự kiện nào được ghi nhận.</p>
                : (
                  <ol className="space-y-3 border-l pl-4">
                    {timeline.map((e) => (
                      <li key={e.tx + e.kind} className="text-sm">
                        <a className="inline-flex items-center gap-1 font-medium underline decoration-border underline-offset-4 hover:decoration-foreground" href={explorerTx(e.tx)} target="_blank" rel="noreferrer">
                          {e.kind}<ExternalLink className="h-3 w-3 text-muted-foreground" aria-label="Xem giao dịch trên Etherscan" />
                        </a>
                        <div className="text-xs text-muted-foreground tabular">block {e.block.toString()}</div>
                        {e.detail && <div className="text-xs text-muted-foreground">{e.detail}</div>}
                      </li>
                    ))}
                  </ol>
                )}
            </section>
          </aside>
        </div>
      </article>
    </div>
  );
}
