import { createContext, useContext, useEffect, useState } from "react";
import { Link } from "wouter";
import { CircleCheck, CircleX, Clock, Lock } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LifecycleRail } from "@/components/common";
import { Mark } from "@/components/header";
import { cn } from "@/lib/utils";

// Hướng dẫn ban đầu: hiện một lần ở lần vào đầu tiên, bỏ qua được, mở lại từ nút "Hướng dẫn" trên header.
const KEY = "cleanhandover-guide-seen:v1";
const seen = () => { try { return localStorage.getItem(KEY) === "1"; } catch { return true; } };
const markSeen = () => { try { localStorage.setItem(KEY, "1"); } catch { /* bộ nhớ trình duyệt bị chặn: chỉ không nhớ được */ } };

const GuideContext = createContext<{ open: () => void }>({ open: () => {} });
export const useGuide = () => useContext(GuideContext);

function Pill({ tone, icon: Icon, children }: { tone: string; icon: typeof CircleCheck; children: React.ReactNode }) {
  return <span className={cn("inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-bold tracking-wide", tone)}><Icon className="h-3.5 w-3.5" aria-hidden />{children}</span>;
}

const STEPS: { title: string; body: React.ReactNode; visual: React.ReactNode }[] = [
  {
    title: "Hợp đồng làm trọng tài",
    body: "Người mua trả tiền vào hợp đồng ký quỹ. Hợp đồng tự chuyển ví Safe cho người mua, tự kiểm tra không còn cửa hậu, rồi mới trả tiền cho người bán. Không ai can thiệp được, kể cả trang web này.",
    visual: (
      <div className="flex items-center justify-center rounded-lg bg-shell py-8 text-shell-foreground">
        <Mark className="h-16 w-16" />
      </div>
    ),
  },
  {
    title: "Bốn bước của một giao dịch",
    body: "Người bán niêm yết và chuẩn bị ví. Người mua nạp tiền. Ai cũng bấm hoàn tất được, vì kết quả do hợp đồng quyết định.",
    visual: (
      <div className="rounded-lg bg-shell px-5 py-6"><LifecycleRail done={2} /></div>
    ),
  },
  {
    title: "Đọc báo cáo kiểm tra",
    body: "Mỗi giao dịch có một báo cáo đọc thẳng từ ví. Điểm chưa đạt nằm trên cùng, kèm từng bước khắc phục. Mã T1–T10 là kịch bản gian lận mà điểm đó chặn.",
    visual: (
      <ul className="space-y-2.5 rounded-lg border bg-card px-5 py-4 text-sm">
        <li className="flex items-center gap-3"><Pill tone="bg-signal/30 text-foreground" icon={CircleCheck}>ĐẠT</Pill>ví đúng như yêu cầu</li>
        <li className="flex items-center gap-3"><Pill tone="bg-destructive/10 text-destructive" icon={CircleX}>CHƯA ĐẠT</Pill>người bán cần xử lý</li>
        <li className="flex items-center gap-3"><Pill tone="bg-st-prepare/10 text-st-prepare" icon={Clock}>TỰ XỬ LÝ</Pill>hợp đồng sẽ tự đặt lại</li>
      </ul>
    ),
  },
  {
    title: "Nạp tiền xong, ví bị đóng băng",
    body: "Hợp đồng ghi lại bộ đếm giao dịch của ví lúc người mua nạp tiền. Nếu người bán động vào ví sau đó, bàn giao bị khóa và người mua được hủy để lấy lại tiền.",
    visual: (
      <div className="flex gap-3 rounded-lg bg-st-funded/10 px-5 py-4 text-sm ring-1 ring-st-funded/25">
        <Lock className="mt-0.5 h-5 w-5 shrink-0 text-st-funded" aria-hidden />
        <p><span className="font-semibold text-st-funded">Ví đang được đóng băng.</span> Một giao dịch bất kỳ của người bán sẽ mở quyền hủy cho người mua.</p>
      </div>
    ),
  },
];

export function GuideProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const hash = window.location.hash;
    const q = window.location.search;
    // dev: ?noguide bỏ qua, ?guidestep=N mở thẳng bước N (đặt trước dấu #) để chụp màn hình kiểm tra
    const skip = hash.startsWith("#/__preview") || (import.meta.env.DEV && q.includes("noguide"));
    const devStep = import.meta.env.DEV ? q.match(/guidestep=(\d)/) : null;
    if (devStep) { setStep(Math.min(Number(devStep[1]), STEPS.length - 1)); setOpen(true); return; }
    if (!seen() && !skip) setOpen(true);
  }, []);

  const close = () => { markSeen(); setOpen(false); };
  const open = () => { setStep(0); setOpen(true); };
  const last = step === STEPS.length - 1;
  const s = STEPS[step];

  return (
    <GuideContext.Provider value={{ open }}>
      {children}
      <Dialog open={isOpen} onOpenChange={(o) => (o ? setOpen(true) : close())}>
        <DialogContent className="max-w-md gap-0 p-0">
          <div className="p-6 pb-0">{s.visual}</div>
          <div className="space-y-2 p-6">
            <p className="text-xs font-medium text-muted-foreground tabular" aria-live="polite">{step + 1} / {STEPS.length}</p>
            <DialogTitle className="text-xl">{s.title}</DialogTitle>
            <DialogDescription className="text-[15px] leading-relaxed text-foreground/80">{s.body}</DialogDescription>
          </div>
          <div className="flex items-center justify-between gap-3 border-t px-6 py-4">
            <div className="flex gap-1.5" aria-hidden>
              {STEPS.map((_, i) => <span key={i} className={cn("h-1.5 rounded-full transition-all", i === step ? "w-5 bg-primary" : "w-1.5 bg-border")} />)}
            </div>
            <div className="flex gap-2">
              {step === 0
                ? <Button variant="ghost" onClick={close}>Bỏ qua</Button>
                : <Button variant="ghost" onClick={() => setStep(step - 1)}>Quay lại</Button>}
              {last
                ? <Button asChild onClick={close}><Link href="/trades">Bắt đầu</Link></Button>
                : <Button onClick={() => setStep(step + 1)}>Tiếp</Button>}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </GuideContext.Provider>
  );
}
