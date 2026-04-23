import { useState, useEffect } from "react";

function formatDuration(ms: number): string {
  const totalMinutes = Math.round(ms / 60000);
  if (totalMinutes < 60) return `${totalMinutes} phút`;
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hours < 24) return mins > 0 ? `${hours} giờ ${mins} phút` : `${hours} giờ`;
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  return remHours > 0 ? `${days} ngày ${remHours} giờ` : `${days} ngày`;
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "Đã hết hạn";
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

interface DeadlineDisplayProps {
  deadline: Date | string;
  status: string;
  createdAt: Date | string;
}

export function DeadlineDisplay({ deadline, status, createdAt }: DeadlineDisplayProps) {
  const [now, setNow] = useState(Date.now());
  const isCountdown = status === "ARMED" || status === "FUNDED";

  useEffect(() => {
    if (!isCountdown) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [isCountdown]);

  if (status === "LISTED" || status === "JOINED") {
    const durationMs = new Date(deadline).getTime() - new Date(createdAt).getTime();
    return (
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">Thời hạn giao dịch</p>
        <p className="font-semibold">{formatDuration(durationMs)}</p>
        <p className="text-xs text-muted-foreground">Đồng hồ chạy khi seller kích hoạt</p>
      </div>
    );
  }

  if (isCountdown) {
    const remaining = new Date(deadline).getTime() - now;
    const isExpired = remaining <= 0;
    const isUrgent = !isExpired && remaining < 60 * 60 * 1000;
    return (
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">Thời hạn còn lại</p>
        <p className={`font-mono font-bold text-lg tabular-nums ${isExpired ? "text-destructive" : isUrgent ? "text-orange-500" : ""}`}>
          {formatCountdown(remaining)}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <p className="text-sm text-muted-foreground">Thời hạn</p>
      <p className="font-semibold">{new Date(deadline).toLocaleString("vi-VN")}</p>
    </div>
  );
}
