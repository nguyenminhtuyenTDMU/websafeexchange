import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { TradeStatusBadge } from "@/components/trade-status-badge";
import { Activity, BarChart3, FileText, Clock, CheckCircle2, XCircle, AlertTriangle, Shield } from "lucide-react";
import type { Trade, SystemLog } from "@shared/schema";

function formatAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatDate(date: string | Date): string {
  return new Date(date).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const logTypeConfig = {
  TRADE_EVENT: { icon: Activity, color: "text-info" },
  SECURITY: { icon: Shield, color: "text-warning" },
  SYSTEM: { icon: FileText, color: "text-muted-foreground" },
};

export default function Dashboard() {
  const { data: trades, isLoading: isLoadingTrades } = useQuery<Trade[]>({
    queryKey: ["/api/trades"],
  });

  const { data: logs, isLoading: isLoadingLogs } = useQuery<SystemLog[]>({
    queryKey: ["/api/logs"],
  });

  const stats = {
    total: trades?.length || 0,
    completed: trades?.filter((t) => t.status === "COMPLETED").length || 0,
    active: trades?.filter((t) => ["LISTED", "JOINED", "ARMED", "FUNDED"].includes(t.status)).length || 0,
    cancelled: trades?.filter((t) => t.status === "CANCELLED").length || 0,
  };

  return (
    <div className="container px-4 md:px-8 py-8 md:py-12">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">Bảng điều khiển minh bạch</h1>
          <p className="text-muted-foreground">
            Theo dõi tất cả giao dịch và hoạt động của hệ thống
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <BarChart3 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-sm text-muted-foreground">Tổng giao dịch</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-success/10 flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.completed}</p>
                  <p className="text-sm text-muted-foreground">Hoàn tất</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-warning/10 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.active}</p>
                  <p className="text-sm text-muted-foreground">Đang xử lý</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-destructive/10 flex items-center justify-center">
                  <XCircle className="h-6 w-6 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.cancelled}</p>
                  <p className="text-sm text-muted-foreground">Đã hủy</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="trades" className="space-y-6">
          <TabsList>
            <TabsTrigger value="trades" data-testid="tab-trades">
              <Activity className="mr-2 h-4 w-4" />
              Giao dịch
            </TabsTrigger>
            <TabsTrigger value="logs" data-testid="tab-logs">
              <FileText className="mr-2 h-4 w-4" />
              Nhật ký hệ thống
            </TabsTrigger>
          </TabsList>

          <TabsContent value="trades">
            <Card>
              <CardHeader>
                <CardTitle>Danh sách giao dịch</CardTitle>
                <CardDescription>
                  Tất cả các giao dịch trên hệ thống
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingTrades ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : trades && trades.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Mã GD</TableHead>
                          <TableHead>Safe</TableHead>
                          <TableHead>Người bán</TableHead>
                          <TableHead>Người mua</TableHead>
                          <TableHead>Giá</TableHead>
                          <TableHead>Trạng thái</TableHead>
                          <TableHead>Thời gian</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {trades.map((trade) => (
                          <TableRow key={trade.id} data-testid={`row-trade-${trade.id}`}>
                            <TableCell className="font-mono text-xs">
                              {formatAddress(trade.id)}
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              {formatAddress(trade.safeAddress)}
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              {formatAddress(trade.sellerAddress)}
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              {trade.buyerAddress ? formatAddress(trade.buyerAddress) : "-"}
                            </TableCell>
                            <TableCell className="font-semibold">
                              {trade.priceEth} ETH
                            </TableCell>
                            <TableCell>
                              <TradeStatusBadge status={trade.status} />
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {formatDate(trade.createdAt)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Chưa có giao dịch nào</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="logs">
            <Card>
              <CardHeader>
                <CardTitle>Nhật ký hệ thống</CardTitle>
                <CardDescription>
                  Lịch sử hoạt động của hệ thống
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingLogs ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : logs && logs.length > 0 ? (
                  <div className="space-y-3">
                    {logs.map((log) => {
                      const config = logTypeConfig[log.type];
                      const Icon = config.icon;
                      return (
                        <div
                          key={log.id}
                          className="flex items-start gap-4 p-4 bg-muted/50 rounded-lg"
                          data-testid={`log-${log.id}`}
                        >
                          <Icon className={`h-5 w-5 mt-0.5 ${config.color}`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-xs">
                                {log.type}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {formatDate(log.createdAt)}
                              </span>
                            </div>
                            <p className="text-sm">{log.message}</p>
                            {log.relatedTradeId && (
                              <p className="text-xs text-muted-foreground font-mono mt-1">
                                Giao dịch: {formatAddress(log.relatedTradeId)}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Chưa có nhật ký nào</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Card className="mt-8">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Mã phiên bản</p>
                <code className="text-xs font-mono bg-muted px-2 py-1 rounded">
                  {import.meta.env.VITE_COMMIT_HASH || "development"}
                </code>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Phiên bản</p>
                <Badge variant="outline">v1.0.0</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
