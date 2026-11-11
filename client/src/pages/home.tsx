import { useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Addr, ExternalLinkText, StatusBadge } from "@/components/common";
import { useEvents } from "@/hooks/use-escrow-data";
import { ESCROW, explorerAddress } from "@/lib/config";
import { eth } from "@/lib/format";

const LIFECYCLE = [
  { step: "Niêm yết", color: "bg-st-listed", who: "Người bán",
    checks: "Hợp đồng kiểm tra ví là Safe chính thức, người gọi là owner, và ví đang giữ từng tài sản chào bán." },
  { step: "Chuẩn bị ví", color: "bg-st-prepare", who: "Người bán",
    checks: "Bật hợp đồng ký quỹ làm module duy nhất, gỡ guard và handler lạ. Trợ lý chỉ ra từng điểm chưa đạt." },
  { step: "Nạp tiền", color: "bg-st-funded", who: "Người mua",
    checks: "Người mua khai báo tài sản kỳ vọng và nạp tiền. Hợp đồng ghi lại nonce: từ đây ví bị đóng băng." },
  { step: "Hoàn tất", color: "bg-st-done", who: "Bất kỳ ai",
    checks: "Hợp đồng tự đổi owner, kiểm tra ví sạch và tài sản còn đủ, rồi mới ghi có tiền cho người bán, trong một giao dịch." },
];

function OpenTrades() {
  const { data, isLoading } = useEvents();
  const open = (data?.trades ?? []).filter((t) => t.status === "OPEN" || t.status === "FUNDED").slice(0, 4);
  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">Đang mở trên Sepolia</h2>
        <Link href="/trades" className="text-sm font-medium text-primary hover:underline">Xem tất cả</Link>
      </div>
      {isLoading ? <p className="text-sm text-muted-foreground">Đang quét sự kiện của hợp đồng…</p>
        : open.length === 0 ? (
          <p className="rounded-lg border border-dashed px-4 py-5 text-sm text-muted-foreground">
            Chưa có giao dịch nào đang mở. <Link href="/sell" className="font-medium text-primary hover:underline">Niêm yết ví đầu tiên</Link>
          </p>
        ) : (
          <ul className="divide-y rounded-lg border bg-card">
            {open.map((t) => (
              <li key={t.id.toString()}>
                <Link href={`/trade/${t.id}`} className="grid grid-cols-[3rem_1fr_auto] items-center gap-3 px-4 py-3 hover:bg-accent/60">
                  <span className="font-mono text-sm font-medium">#{t.id.toString()}</span>
                  <span className="min-w-0 truncate font-mono text-sm text-muted-foreground">{t.wallet}</span>
                  <span className="flex items-center gap-4"><span className="font-mono text-sm">{eth(t.price)}</span><StatusBadge status={t.status} /></span>
                </Link>
              </li>
            ))}
          </ul>
        )}
    </section>
  );
}

export default function Home() {
  const [, navigate] = useLocation();
  const [id, setId] = useState("");
  const valid = /^\d+$/.test(id);
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 lg:py-14">
      <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-16">
        <div className="space-y-8">
          <div className="space-y-4">
            <h1 className="text-[32px] font-semibold leading-[1.15] tracking-tight sm:text-[40px]">
              Mua bán quyền kiểm soát ví Safe, tiền chỉ giải ngân khi ví đã sạch
            </h1>
            <p className="max-w-xl text-[17px] leading-relaxed text-muted-foreground">
              Hợp đồng ký quỹ tự chuyển ví cho người mua và tự kiểm tra không còn cửa hậu nào, trong cùng giao dịch trả tiền cho người bán.
              Không trung gian, không máy chủ.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg"><Link href="/sell">Niêm yết ví của bạn</Link></Button>
            <Button asChild size="lg" variant="outline"><Link href="/trades">Xem giao dịch đang mở<ArrowRight className="ml-1.5 h-4 w-4" /></Link></Button>
          </div>
          <form className="max-w-sm space-y-2" onSubmit={(e) => { e.preventDefault(); if (valid) navigate(`/trade/${id}`); }}>
            <label htmlFor="trade-id" className="text-sm font-medium">Đã có mã giao dịch từ người bán?</label>
            <div className="flex gap-2">
              <Input id="trade-id" value={id} onChange={(e) => setId(e.target.value.trim())} placeholder="Ví dụ: 1" inputMode="numeric" />
              <Button type="submit" variant="secondary" disabled={!valid}>Mở</Button>
            </div>
          </form>
          <OpenTrades />
        </div>

        <section aria-labelledby="how" className="self-start rounded-xl bg-shell p-6 text-shell-foreground shadow-lg sm:p-8">
          <h2 id="how" className="text-lg font-semibold">Hợp đồng kiểm tra gì ở mỗi bước</h2>
          <ol className="mt-6 space-y-0">
            {LIFECYCLE.map((s, i) => (
              <li key={s.step} className="relative grid grid-cols-[1.25rem_1fr] gap-4 pb-7 last:pb-0">
                {i < LIFECYCLE.length - 1 && <span className="absolute left-[9px] top-6 h-[calc(100%-1rem)] w-px bg-shell-foreground/20" aria-hidden />}
                <span className={`mt-1 h-[18px] w-[18px] rounded-full ring-4 ring-shell ${s.color}`} aria-hidden />
                <div>
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="font-semibold">{s.step}</span>
                    <span className="text-sm text-shell-muted">{s.who}</span>
                  </div>
                  <p className="mt-1 text-[15px] leading-relaxed text-shell-foreground/85">{s.checks}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-8 space-y-1 border-t border-shell-foreground/15 pt-5 text-sm">
            <p className="text-shell-muted">Hợp đồng ký quỹ (không có owner, không nâng cấp được)</p>
            <Addr a={ESCROW} full className="text-shell-foreground [&_a]:text-shell-foreground [&_button]:text-shell-muted [&_button:hover]:bg-shell-foreground/10" />
            <p className="pt-1 text-shell-muted [&_a]:text-shell-foreground">
              <ExternalLinkText href={`${explorerAddress(ESCROW)}#code`}>Mã nguồn đã xác minh trên Etherscan</ExternalLinkText>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
