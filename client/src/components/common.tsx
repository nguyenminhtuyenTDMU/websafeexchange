import { useState } from "react";
import { Check, Copy, ExternalLink, CircleCheck, CircleX, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { explorerAddress } from "@/lib/config";
import type { Check as CheckItem } from "@/lib/conditions";
import { shortAddr, STATUS_LABEL } from "@/lib/format";

export function Addr({ a, full = false }: { a: string; full?: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <span className="inline-flex items-center gap-1 font-mono text-sm break-all">
      <a href={explorerAddress(a)} target="_blank" rel="noreferrer" className="hover:underline">
        {full ? a : shortAddr(a)}
      </a>
      <button
        type="button"
        aria-label="Sao chép địa chỉ"
        className="text-muted-foreground hover:text-foreground"
        onClick={() => { navigator.clipboard.writeText(a); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
      <a href={explorerAddress(a)} target="_blank" rel="noreferrer" aria-label="Xem trên Etherscan" className="text-muted-foreground">
        <ExternalLink className="h-3.5 w-3.5" />
      </a>
    </span>
  );
}

const STATUS_STYLE: Record<string, string> = {
  OPEN: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200",
  FUNDED: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  COMPLETED: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200",
  CANCELLED: "bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
};
export function StatusBadge({ status }: { status: string }) {
  return <Badge className={`${STATUS_STYLE[status] ?? ""} border-0`}>{STATUS_LABEL[status] ?? status}</Badge>;
}

/** Danh sách điều kiện đạt / chưa đạt, kèm hướng dẫn cho điều kiện chưa đạt. */
export function Checklist({ items }: { items: CheckItem[] }) {
  return (
    <ul className="space-y-2">
      {items.map((c) => (
        <li key={c.key} className="rounded-md border p-3">
          <div className="flex items-start gap-2">
            {c.ok ? <CircleCheck className="h-5 w-5 shrink-0 text-green-600" />
              : c.pending ? <Clock className="h-5 w-5 shrink-0 text-amber-600" />
              : <CircleX className="h-5 w-5 shrink-0 text-red-600" />}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{c.label}</span>
                {c.threat && <Badge variant="outline" className="text-xs">{c.threat}</Badge>}
              </div>
              {c.detail && <p className="mt-1 text-sm text-muted-foreground break-all">{c.detail}</p>}
              {!c.ok && c.pending && (
                <p className="mt-1 text-sm text-muted-foreground">Hợp đồng sẽ tự xử lý khi hoàn tất bàn giao.</p>
              )}
              {!c.ok && !c.pending && c.fix && (
                <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm break-words">
                  {c.fix.map((f, i) => <li key={i}>{f}</li>)}
                </ol>
              )}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
