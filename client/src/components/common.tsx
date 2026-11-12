import { useRef, useState } from "react";
import { Check as CheckIcon, ChevronDown, CircleCheck, CircleX, Cog, Copy, ExternalLink, History, Info, Lock, ShieldAlert, ShieldCheck, X } from "lucide-react";
import { Link } from "wouter";
import { formatEther } from "viem";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { explorerAddress } from "@/lib/config";
import { THREATS, type Check } from "@/lib/conditions";
import type { AssetSpec } from "@/lib/escrow";
import { shortAddr, STATUS_LABEL } from "@/lib/format";
import { cn } from "@/lib/utils";

function useCopy() {
  const [copied, setCopied] = useState(false);
  const copy = (v: string) => {
    navigator.clipboard.writeText(v);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return { copied, copy };
}

/** Địa chỉ rút gọn, sao chép được, mở Etherscan. */
export function Addr({ a, full = false, className, history }: { a: string; full?: boolean; className?: string; history?: boolean }) {
  const { copied, copy } = useCopy();
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-1.5 font-mono text-[13px]", className)}>
      <a href={explorerAddress(a)} target="_blank" rel="noreferrer" className="truncate hover:underline" title={a}>
        {full ? a : shortAddr(a)}
      </a>
      <button type="button" aria-label="Sao chép địa chỉ" onClick={() => copy(a)}
        className="-my-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground">
        {copied ? <CheckIcon className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
      {history && (
        <Link href={`/history/${a}`} aria-label="Lịch sử giao dịch của địa chỉ này" title="Lịch sử giao dịch"
          className="-my-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground">
          <History className="h-3.5 w-3.5" />
        </Link>
      )}
      <span className="sr-only" aria-live="polite">{copied ? "Đã sao chép" : ""}</span>
    </span>
  );
}

/** Giá trị cần dán vào nơi khác (địa chỉ, tham số hàm): hiển thị đầy đủ, một nút sao chép rõ ràng. */
export function CopyChip({ value }: { value: string }) {
  const { copied, copy } = useCopy();
  return (
    <span className="mt-1.5 flex max-w-full items-stretch overflow-hidden rounded-md border bg-muted/60">
      <code className="min-w-0 flex-1 truncate px-2.5 py-1.5 font-mono text-[12.5px]" title={value}>{value}</code>
      <button type="button" onClick={() => copy(value)}
        className="flex shrink-0 items-center gap-1 border-l bg-card px-2.5 text-xs font-medium hover:bg-accent">
        {copied ? <CheckIcon className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? "Đã chép" : "Sao chép"}
      </button>
    </span>
  );
}

/** Giải thích theo yêu cầu: mở khi rê chuột hoặc khi bấm (dùng được trên máy chiếu, màn hình cảm ứng). */
export function HoverPop({ trigger, children, label }: { trigger: React.ReactElement; children: React.ReactNode; label: string }) {
  const [open, setOpen] = useState(false);
  const pinned = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const enter = () => { clearTimeout(timer.current); setOpen(true); };
  const leave = () => { if (!pinned.current) timer.current = setTimeout(() => setOpen(false), 120); };
  const close = () => { pinned.current = false; setOpen(false); };
  return (
    <Popover open={open} onOpenChange={(o) => (o ? setOpen(true) : close())}>
      <PopoverTrigger asChild aria-label={label}
        onPointerEnter={(e) => { if (e.pointerType === "mouse") enter(); }}
        onPointerLeave={(e) => { if (e.pointerType === "mouse") leave(); }}
        onFocus={(e) => { if (e.currentTarget.matches(":focus-visible")) enter(); }}
        onBlur={() => { if (!pinned.current) setOpen(false); }}
        onClick={(e) => {
          e.preventDefault(); // tự xử lý thay cho cơ chế bật/tắt của Popover
          if (pinned.current) close(); else { pinned.current = true; clearTimeout(timer.current); setOpen(true); }
        }}>{trigger}</PopoverTrigger>
      <PopoverContent side="top" className="w-auto max-w-xs px-3 py-2 text-[13px] leading-relaxed"
        onMouseEnter={enter} onMouseLeave={leave} onOpenAutoFocus={(e) => e.preventDefault()}>
        {children}
      </PopoverContent>
    </Popover>
  );
}

export function InfoTip({ text, label, className }: { text: React.ReactNode; label: string; className?: string }) {
  return (
    <HoverPop label={label} trigger={
      <button type="button" className={cn("-m-1 inline-flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground", className)}>
        <Info className="h-4 w-4" />
      </button>
    }>{text}</HoverPop>
  );
}

const STATUS_DOT: Record<string, string> = {
  OPEN: "bg-st-listed", FUNDED: "bg-st-funded", COMPLETED: "bg-st-done", CANCELLED: "bg-st-cancel",
};
const STATUS_TEXT: Record<string, string> = {
  OPEN: "text-st-listed", FUNDED: "text-st-funded", COMPLETED: "text-st-done", CANCELLED: "text-st-cancel",
};
export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap text-sm font-semibold", STATUS_TEXT[status])}>
      <span className={cn("h-2 w-2 rounded-full", STATUS_DOT[status])} aria-hidden />
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

export function PageHeader({ title, children, actions }: { title: string; children?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-[28px]">{title}</h1>
        {children && <div className="max-w-2xl text-[15px] text-muted-foreground">{children}</div>}
      </div>
      {actions}
    </div>
  );
}

// ───────── Vòng đời giao dịch ─────────

const STEPS = ["Niêm yết", "Chuẩn bị ví", "Nạp tiền", "Hoàn tất"] as const;

/** Số bước đã xong (0–4) theo trạng thái hợp đồng. */
export function stepsDone(status: string, ready: boolean): number {
  if (status === "COMPLETED") return 4;
  if (status === "FUNDED") return 3;
  if (status === "OPEN") return ready ? 2 : 1;
  return 0;
}

/** Thanh vòng đời trên dải xanh két. cancelledAt: bước mà giao dịch dừng lại; blocked: bước hoàn tất bị khóa. */
export function LifecycleRail({ done, cancelledAt, frozen, blocked }: { done: number; cancelledAt?: number; frozen?: boolean; blocked?: boolean }) {
  return (
    <ol className="grid grid-cols-4 gap-2" aria-label="Tiến trình giao dịch">
      {STEPS.map((s, i) => {
        const isDone = i < done;
        const isStop = cancelledAt === i;
        const isCurrent = cancelledAt === undefined && i === done;
        return (
          <li key={s} aria-current={isCurrent ? "step" : undefined} className="min-w-0">
            <div className={cn("h-1.5 rounded-full transition-colors duration-500",
              isStop ? "bg-shell-foreground/30"
                : isCurrent ? (blocked ? "bg-shell-foreground/30" : "bg-shell-foreground ring-2 ring-shell-foreground/30 ring-offset-1 ring-offset-shell")
                : isDone ? "bg-shell-foreground/55" : "bg-shell-foreground/15")} />
            <div className={cn("mt-2 flex items-center gap-1.5 truncate text-xs sm:text-[13px]",
              isCurrent || isStop ? "font-semibold text-shell-foreground" : isDone ? "font-medium text-shell-foreground/85" : "text-shell-muted")}>
              {isDone && (i === 2 && frozen ? <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden /> : <CheckIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />)}
              {isStop && <X className="h-3.5 w-3.5 shrink-0" aria-hidden />}
              {isCurrent && (blocked ? <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden /> : <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-shell-foreground" aria-hidden />)}
              <span className="truncate">{isStop ? "Đã hủy" : isCurrent && blocked ? "Bị khóa" : s}</span>
              <span className="sr-only">{isDone ? " (đã xong)" : isStop ? " (dừng ở đây)" : isCurrent ? " (bước hiện tại)" : ""}</span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** Tài sản: chữ thường cho loại và số lượng, địa chỉ hợp đồng giữ nguyên một khối mono. */
export function AssetLabel({ a }: { a: AssetSpec }) {
  const tok = <span className="whitespace-nowrap font-mono text-[0.92em]">{shortAddr(a.token)}</span>;
  if (a.checkerId === 0) return <span className="tabular">ETH ≥ {formatEther(a.value)}</span>;
  if (a.checkerId === 1) return <span>ERC-20 {tok} ≥ <span className="tabular">{a.value.toString()}</span></span>;
  if (a.checkerId === 2) return <span>NFT <span className="tabular">#{a.value.toString()}</span> của {tok}</span>;
  return <span>quyền owner của {tok}</span>;
}

// ───────── Báo cáo kiểm định (trợ lý bàn giao) ─────────

const PILL = "inline-flex items-center gap-1 justify-self-start rounded px-1.5 py-0.5 text-[11px] font-bold tracking-wide";
const PassPill = () => <span className={cn(PILL, "bg-signal/30 text-foreground")}><CircleCheck className="h-3.5 w-3.5" aria-hidden />ĐẠT</span>;
const FailPill = () => <span className={cn(PILL, "bg-destructive/10 text-destructive")}><CircleX className="h-3.5 w-3.5" aria-hidden />CHƯA ĐẠT</span>;
const ContractPill = () => <span className={cn(PILL, "bg-muted text-foreground/80")}><Cog className="h-3.5 w-3.5" aria-hidden />HỢP ĐỒNG LÀM</span>;

function Verdict({ c }: { c: Check }) {
  if (c.ok) return <PassPill />;
  if (c.pending) return <ContractPill />;
  return <FailPill />;
}

function Finding({ c, open }: { c: Check; open?: boolean }) {
  return (
    <li className="grid items-start gap-x-3 gap-y-1.5 py-3 sm:grid-cols-[112px_1fr]">
      <Verdict c={c} />
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className={cn("text-[15px]", !c.ok && !c.pending ? "font-semibold" : "font-medium")}>
            {c.label}{c.asset && <> <AssetLabel a={c.asset} /></>}
          </span>
          {(c.hint || (c.detail && (c.ok || c.pending))) && (
            <InfoTip label={`Giải thích: ${c.label}`} text={
              <span className="flex flex-col gap-1">
                {c.hint && <span>{c.hint}</span>}
                {(c.ok || c.pending) && c.detail && <span>{c.detail}</span>}
              </span>
            } />
          )}
          {c.threat && (
            <HoverPop label={`Kịch bản ${c.threat}`} trigger={
              <button type="button" className="inline-flex h-6 min-w-6 items-center justify-center rounded border px-1.5 text-[11px] font-medium text-muted-foreground tabular hover:bg-muted">{c.threat}</button>
            }>Kịch bản {c.threat}: {THREATS[c.threat] ?? ""}</HoverPop>
          )}
        </div>
        {c.detail && !c.ok && !c.pending && <p className="mt-0.5 break-words text-[13px] text-muted-foreground tabular">{c.detail.split(/(0x[0-9a-fA-F]+…[0-9a-fA-F]+|0x[0-9a-fA-F]{40})/).map((part, i) => i % 2 ? <span key={i} className="whitespace-nowrap font-mono text-[12px]">{part}</span> : part)}</p>}
        {!c.ok && !c.pending && c.cause && <p className="mt-1 text-sm">{c.cause}</p>}
        {open && !c.ok && !c.pending && c.fix && (
          <ol className="mt-2 space-y-2 border-l border-border pl-3 text-sm">
            {c.fix.map((f, i) => (
              <li key={i} className="break-words">
                <span className="mr-1.5 text-xs font-semibold text-muted-foreground tabular">{i + 1}.</span>{f.text}{f.link && <> <ExternalLinkText href={f.link.href}>{f.link.label}</ExternalLinkText>.</>}
                {f.copy && <CopyChip value={f.copy} />}
              </li>
            ))}
          </ol>
        )}
      </div>
    </li>
  );
}

/** Con dấu kết luận: biểu tượng tròn nhạt và chữ lớn, không phải khối bấm được. */
/** final: kết luận sau bàn giao, phóng lớn như dấu xác nhận vì đây là kết quả cuối cùng của giao dịch. */
function Seal({ clean, label, failing, blocked, final }: { clean: boolean; label: string; failing: number; blocked?: boolean; final?: boolean }) {
  return (
    <div role="status" className={cn("flex items-center gap-2 transition-colors duration-500", clean ? "text-success" : "text-destructive")}>
      {clean
        ? <span className={cn("flex items-center justify-center rounded-full bg-signal/25", final ? "h-12 w-12 ring-4 ring-signal/20" : "h-8 w-8")}><ShieldCheck className={final ? "h-7 w-7" : "h-5 w-5"} aria-hidden /></span>
        : <span className="flex h-8 w-8 items-center justify-center rounded-full bg-destructive/10"><ShieldAlert className="h-5 w-5" aria-hidden /></span>}
      <span className={cn("font-bold tracking-tight", final && clean ? "text-[28px] leading-none" : "text-lg")}>{clean ? label : blocked ? "Không thể hoàn tất" : `${failing} điểm chưa đạt`}</span>
    </div>
  );
}

function GroupToggle({ children }: { children: React.ReactNode }) {
  return (
    <CollapsibleTrigger className="group flex w-full items-center justify-between py-3 text-sm font-medium text-muted-foreground hover:text-foreground">
      <span className="flex items-center gap-1.5">{children}</span>
      <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
    </CollapsibleTrigger>
  );
}

/**
 * Kết luận kiểm định: điểm chưa đạt lên đầu và mở sẵn hướng dẫn; điểm đã đạt và việc hợp đồng sẽ làm gộp lại
 * để thao tác chính nằm gần. Chú giải ngay dưới tiêu đề, không phải nhớ từ phần hướng dẫn.
 */
export function AuditReport({ title, items, cleanLabel, blocked, expandPassed, final }: {
  title: string; items: Check[]; cleanLabel: string; blocked?: boolean; expandPassed?: boolean; final?: boolean;
}) {
  const failing = items.filter((c) => !c.ok && !c.pending);
  const pending = items.filter((c) => !c.ok && c.pending);
  const passed = items.filter((c) => c.ok);
  const clean = failing.length === 0;
  return (
    <section aria-labelledby="audit-title">
      <header className="flex flex-wrap items-center justify-between gap-4 pb-3">
        <div>
          <h2 id="audit-title" className="text-lg font-semibold">{title}</h2>
          <p className="mt-0.5 text-sm text-muted-foreground tabular">{passed.length}/{items.length - pending.length} điều kiện đạt{pending.length > 0 && ` · ${pending.length} việc hợp đồng sẽ làm`}</p>
        </div>
        <Seal clean={clean} label={cleanLabel} failing={failing.length} blocked={blocked} final={final} />
      </header>
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1.5 pb-3 text-xs text-muted-foreground" aria-label="Chú giải">
        {passed.length > 0 && <span className="flex items-center gap-1"><PassPill /> ví đúng yêu cầu</span>}
        {failing.length > 0 && <span className="flex items-center gap-1"><FailPill /> cần xử lý</span>}
        {pending.length > 0 && <span className="flex items-center gap-1"><ContractPill /> hợp đồng tự làm khi hoàn tất</span>}
        <span className="flex items-center gap-1"><span className="rounded border px-1.5 py-px text-[11px] font-medium">T1–T8</span> kịch bản gian lận bị chặn</span>
      </p>
      <div className="border-y">
        {failing.length > 0 && <ul className="divide-y">{failing.map((c) => <Finding key={c.key} c={c} open={!blocked} />)}</ul>}
        {passed.length > 0 && (
          <Collapsible defaultOpen={expandPassed} className={cn(failing.length > 0 && "border-t")}>
            <GroupToggle>
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-signal text-foreground"><CheckIcon className="h-3 w-3" aria-hidden /></span>
              {passed.length} điều kiện đã đạt
            </GroupToggle>
            <CollapsibleContent><ul className="divide-y border-t">{passed.map((c) => <Finding key={c.key} c={c} />)}</ul></CollapsibleContent>
          </Collapsible>
        )}
        {pending.length > 0 && (
          <Collapsible className="border-t">
            <GroupToggle><Cog className="h-4 w-4" aria-hidden />{pending.length} việc hợp đồng sẽ làm khi hoàn tất</GroupToggle>
            <CollapsibleContent><ul className="divide-y border-t">{pending.map((c) => <Finding key={c.key} c={c} />)}</ul></CollapsibleContent>
          </Collapsible>
        )}
      </div>
    </section>
  );
}

export function ExternalLinkText({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline decoration-border hover:decoration-foreground">
      {children}<ExternalLink className="h-3 w-3" aria-hidden />
    </a>
  );
}
