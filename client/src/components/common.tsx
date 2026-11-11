import { useState } from "react";
import { Check as CheckIcon, ChevronDown, CircleCheck, CircleX, Clock, Copy, ExternalLink, Info, Lock, ShieldAlert, ShieldCheck } from "lucide-react";
import { formatEther } from "viem";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
export function Addr({ a, full = false, className }: { a: string; full?: boolean; className?: string }) {
  const { copied, copy } = useCopy();
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-1.5 font-mono text-[13px]", className)}>
      <a href={explorerAddress(a)} target="_blank" rel="noreferrer" className="truncate hover:underline" title={a}>
        {full ? a : shortAddr(a)}
      </a>
      <button type="button" aria-label="Sao chép địa chỉ" onClick={() => copy(a)}
        className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground">
        {copied ? <CheckIcon className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
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

export function InfoTip({ text, label }: { text: string; label: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" aria-label={label} className="text-muted-foreground hover:text-foreground">
          <Info className="h-3.5 w-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs text-xs">{text}</TooltipContent>
    </Tooltip>
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

/** Thanh vòng đời trên dải xanh két: bước đã xong cùng một tông, bước hiện tại sáng màu tín hiệu. */
export function LifecycleRail({ done, cancelled, frozen, blocked }: { done: number; cancelled?: boolean; frozen?: boolean; blocked?: boolean }) {
  return (
    <ol className="grid grid-cols-4 gap-2" aria-label="Tiến trình giao dịch">
      {STEPS.map((s, i) => {
        const isDone = i < done;
        const isCurrent = !cancelled && i === done;
        return (
          <li key={s} aria-current={isCurrent ? "step" : undefined} className="min-w-0">
            <div className={cn("h-1.5 rounded-full transition-colors duration-500",
              isCurrent ? (blocked ? "bg-destructive" : "bg-shell-foreground ring-2 ring-shell-foreground/30 ring-offset-1 ring-offset-shell") : isDone ? "bg-shell-foreground/55" : "bg-shell-foreground/15")} />
            <div className={cn("mt-2 flex items-center gap-1.5 truncate text-xs sm:text-[13px]",
              isCurrent ? "font-semibold text-shell-foreground" : isDone ? "font-medium text-shell-foreground/85" : "text-shell-muted")}>
              {isDone && (i === 2 && frozen ? <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden /> : <CheckIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />)}
              {isCurrent && <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", blocked ? "bg-destructive" : "bg-shell-foreground")} aria-hidden />}
              <span className="truncate">{isCurrent && blocked ? `${s} (bị khóa)` : s}</span>
              <span className="sr-only">{isDone ? " (đã xong)" : isCurrent ? " (bước hiện tại)" : ""}</span>
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

function Verdict({ c }: { c: Check }) {
  const base = "inline-flex items-center gap-1 justify-self-start rounded px-1.5 py-0.5 text-[11px] font-bold tracking-wide";
  if (c.ok) return <span className={cn(base, "bg-signal/30 text-foreground")}><CircleCheck className="h-3.5 w-3.5" aria-hidden />ĐẠT</span>;
  if (c.pending) return <span className={cn(base, "bg-st-prepare/10 text-st-prepare")}><Clock className="h-3.5 w-3.5" aria-hidden />TỰ XỬ LÝ</span>;
  return <span className={cn(base, "bg-destructive/10 text-destructive")}><CircleX className="h-3.5 w-3.5" aria-hidden />CHƯA ĐẠT</span>;
}

function Finding({ c, open }: { c: Check; open?: boolean }) {
  return (
    <li className="grid items-start gap-x-3 gap-y-1.5 py-3 sm:grid-cols-[92px_1fr]">
      <Verdict c={c} />
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className={cn("text-[15px]", !c.ok && !c.pending ? "font-semibold" : "font-medium")}>
            {c.label}{c.asset && <> <AssetLabel a={c.asset} /></>}
          </span>
          {c.hint && <InfoTip text={c.hint} label={`Giải thích: ${c.label}`} />}
          {c.threat && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span tabIndex={0} className="cursor-help rounded border px-1.5 py-px text-[11px] font-medium text-muted-foreground tabular">{c.threat}</span>
              </TooltipTrigger>
              <TooltipContent className="text-xs">Kịch bản {c.threat}: {THREATS[c.threat] ?? ""}</TooltipContent>
            </Tooltip>
          )}
        </div>
        {c.detail && <p className="mt-0.5 break-words text-[13px] text-muted-foreground tabular">{c.detail.split(/(0x[0-9a-fA-F]+…[0-9a-fA-F]+|0x[0-9a-fA-F]{40})/).map((part, i) => i % 2 ? <span key={i} className="whitespace-nowrap font-mono text-[12px]">{part}</span> : part)}</p>}
        {c.pending && !c.ok && <p className="mt-0.5 text-sm text-muted-foreground">Hợp đồng sẽ tự đặt lại khi hoàn tất bàn giao.</p>}
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

/** Con dấu kết luận: khối đặc, có biểu tượng và số liệu, không trông như nút bấm. */
function Seal({ clean, label, failing }: { clean: boolean; label: string; failing: number }) {
  return (
    <div role="status" aria-live="polite"
      className={cn("flex items-center gap-2.5 rounded-lg px-3.5 py-2 transition-colors duration-500",
        clean ? "bg-signal text-foreground" : "bg-destructive/10 text-destructive")}>
      {clean ? <ShieldCheck className="h-6 w-6" aria-hidden /> : <ShieldAlert className="h-6 w-6" aria-hidden />}
      <span className="text-[15px] font-bold">{clean ? label : `${failing} điểm chưa đạt`}</span>
    </div>
  );
}

/** Kết luận kiểm định: lỗi lên đầu và mở sẵn hướng dẫn, mục đạt gộp lại. Nằm trong hồ sơ giao dịch, không phải thẻ riêng. */
export function AuditReport({ title, items, cleanLabel, note }: { title: string; items: Check[]; cleanLabel: string; note?: string }) {
  const failing = items.filter((c) => !c.ok && !c.pending);
  const pending = items.filter((c) => !c.ok && c.pending);
  const passed = items.filter((c) => c.ok);
  const clean = failing.length === 0;
  return (
    <section aria-labelledby="audit-title">
      <header className="flex flex-wrap items-center justify-between gap-4 pb-3">
        <div>
          <h2 id="audit-title" className="text-lg font-semibold">{title}</h2>
          <p className="mt-0.5 text-sm text-muted-foreground tabular">
            {passed.length}/{items.length} điều kiện đạt{pending.length ? `, ${pending.length} do hợp đồng tự xử lý` : ""}
          </p>
        </div>
        <Seal clean={clean} label={cleanLabel} failing={failing.length} />
      </header>
      <div className="border-y">
        {failing.length > 0 && <ul className="divide-y">{failing.map((c) => <Finding key={c.key} c={c} open />)}</ul>}
        {pending.length > 0 && <ul className={cn("divide-y", failing.length > 0 && "border-t")}>{pending.map((c) => <Finding key={c.key} c={c} />)}</ul>}
        {passed.length > 0 && (
          <Collapsible defaultOpen={clean} className={cn((failing.length > 0 || pending.length > 0) && "border-t")}>
            <CollapsibleTrigger className="group flex w-full items-center justify-between py-3 text-sm font-medium text-muted-foreground hover:text-foreground">
              <span className="flex items-center gap-1.5"><span className="flex h-4 w-4 items-center justify-center rounded-full bg-signal text-foreground"><CheckIcon className="h-3 w-3" aria-hidden /></span>{passed.length} điều kiện đã đạt</span>
              <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent><ul className="divide-y border-t">{passed.map((c) => <Finding key={c.key} c={c} />)}</ul></CollapsibleContent>
          </Collapsible>
        )}
      </div>
      {note && <p className="pt-3 text-sm text-muted-foreground">{note}</p>}
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
