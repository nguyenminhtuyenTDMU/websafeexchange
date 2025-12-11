import { Badge } from "@/components/ui/badge";
import type { TradeStatus } from "@shared/schema";

const statusConfig: Record<TradeStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  DRAFT: { label: "Nháp", variant: "secondary" },
  LISTED: { label: "Đã đăng", variant: "outline" },
  JOINED: { label: "Đã tham gia", variant: "outline" },
  ARMED: { label: "Đã kích hoạt", variant: "default" },
  FUNDED: { label: "Đã ký quỹ", variant: "default" },
  COMPLETED: { label: "Hoàn tất", variant: "default" },
  CANCELLED: { label: "Đã hủy", variant: "destructive" },
};

interface TradeStatusBadgeProps {
  status: TradeStatus;
}

export function TradeStatusBadge({ status }: TradeStatusBadgeProps) {
  const config = statusConfig[status];
  
  return (
    <Badge 
      variant={config.variant}
      className={
        status === "COMPLETED" ? "bg-success text-success-foreground" :
        status === "ARMED" || status === "FUNDED" ? "bg-warning text-warning-foreground" :
        undefined
      }
      data-testid={`badge-status-${status.toLowerCase()}`}
    >
      {config.label}
    </Badge>
  );
}
