import { useState } from "react";
import { useAccount } from "wagmi";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Stepper } from "@/components/stepper";
import { TradeStatusBadge } from "@/components/trade-status-badge";
import { ConnectWallet } from "@/components/connect-wallet";
import { Loader2, AlertCircle, CheckCircle2, Search, Shield, ExternalLink } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import type { Trade } from "@shared/schema";

const searchFormSchema = z.object({
  searchQuery: z.string().min(1, "Vui lòng nhập mã giao dịch hoặc địa chỉ Safe"),
});

type SearchFormValues = z.infer<typeof searchFormSchema>;

const buyerSteps = [
  { id: 1, title: "Tìm giao dịch", description: "Tìm đơn bán" },
  { id: 2, title: "Tham gia", description: "Xác nhận mua" },
  { id: 3, title: "Chờ kích hoạt", description: "Người bán kích hoạt" },
  { id: 4, title: "Gửi ký quỹ", description: "Gửi ETH" },
  { id: 5, title: "Hoàn tất", description: "Nhận sở hữu" },
];

function getStepFromStatus(status: string): number {
  switch (status) {
    case "LISTED":
      return 2;
    case "JOINED":
      return 3;
    case "ARMED":
      return 4;
    case "FUNDED":
      return 5;
    case "COMPLETED":
    case "CANCELLED":
      return 6;
    default:
      return 1;
  }
}

export default function Buy() {
  const { address, isConnected } = useAccount();
  const { toast } = useToast();
  const [foundTrade, setFoundTrade] = useState<Trade | null>(null);

  const form = useForm<SearchFormValues>({
    resolver: zodResolver(searchFormSchema),
    defaultValues: {
      searchQuery: "",
    },
  });

  const searchMutation = useMutation({
    mutationFn: async (values: SearchFormValues) => {
      const res = await fetch(`/api/trades/search?q=${encodeURIComponent(values.searchQuery)}`);
      if (!res.ok) throw new Error("Không tìm thấy trade");
      return res.json();
    },
    onSuccess: (data) => {
      setFoundTrade(data);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Không tìm thấy",
        description: error.message,
      });
      setFoundTrade(null);
    },
  });

  const { data: trade, isLoading: isLoadingTrade } = useQuery<Trade>({
    queryKey: ["/api/trades", foundTrade?.id],
    enabled: !!foundTrade?.id,
    refetchInterval: 5000,
  });

  const joinTradeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/trades/${foundTrade?.id}/join`, {
        buyerAddress: address,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Tham gia thành công",
        description: "Bạn đã tham gia trade. Chờ seller kích hoạt.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/trades", foundTrade?.id] });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: error.message || "Không thể tham gia trade",
      });
    },
  });

  const depositMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/trades/${foundTrade?.id}/deposit`, {
        buyerAddress: address,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Gửi ký quỹ thành công",
        description: "ETH đã được gửi vào ký quỹ. Chờ người bán chuyển quyền sở hữu.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/trades", foundTrade?.id] });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: error.message || "Không thể gửi ký quỹ",
      });
    },
  });

  const onSearch = (values: SearchFormValues) => {
    searchMutation.mutate(values);
  };

  if (!isConnected) {
    return (
      <div className="container px-4 md:px-8 py-12 md:py-16">
        <div className="max-w-lg mx-auto text-center">
          <Shield className="h-16 w-16 text-muted-foreground mx-auto mb-6" />
          <h1 className="text-2xl font-bold mb-4">Kết nối ví để bắt đầu</h1>
          <p className="text-muted-foreground mb-6">
            Bạn cần kết nối ví MetaMask để mua Safe wallet.
          </p>
          <ConnectWallet />
        </div>
      </div>
    );
  }

  const currentTrade = trade || foundTrade;
  const currentStep = currentTrade ? getStepFromStatus(currentTrade.status) : 1;

  return (
    <div className="container px-4 md:px-8 py-8 md:py-12">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">Mua Safe Wallet</h1>
          <p className="text-muted-foreground">
            Tìm và mua quyền sở hữu Safe wallet từ người bán
          </p>
        </div>

        {currentTrade && (
          <Stepper steps={buyerSteps} currentStep={currentStep} className="mb-8" />
        )}

        {!foundTrade ? (
          <Card>
            <CardHeader>
              <CardTitle>Tìm kiếm giao dịch</CardTitle>
              <CardDescription>
                Nhập mã giao dịch hoặc địa chỉ Safe để tìm đơn bán
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSearch)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="searchQuery"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mã giao dịch hoặc địa chỉ Safe</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder="Nhập mã giao dịch hoặc 0x..."
                              className="pl-10 font-mono"
                              {...field}
                              data-testid="input-search"
                            />
                          </div>
                        </FormControl>
                        <FormDescription>
                          Nhập mã giao dịch từ người bán hoặc địa chỉ Safe bạn muốn mua
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={searchMutation.isPending}
                    data-testid="button-search"
                  >
                    {searchMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Đang tìm...
                      </>
                    ) : (
                      <>
                        <Search className="mr-2 h-4 w-4" />
                        Tìm kiếm
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <CardTitle>Thông tin giao dịch</CardTitle>
                    <CardDescription>
                      Chi tiết về Safe wallet bạn muốn mua
                    </CardDescription>
                  </div>
                  {currentTrade && <TradeStatusBadge status={currentTrade.status} />}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoadingTrade ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : currentTrade ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Safe Address</p>
                        <code className="text-sm font-mono bg-muted px-2 py-1 rounded block truncate">
                          {currentTrade.safeAddress}
                        </code>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Giá bán</p>
                        <p className="font-semibold text-lg">{currentTrade.priceEth} ETH</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Người bán</p>
                        <code className="text-sm font-mono bg-muted px-2 py-1 rounded block truncate">
                          {currentTrade.sellerAddress}
                        </code>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Thời hạn</p>
                        <p className="font-semibold">
                          {new Date(currentTrade.deadline).toLocaleString("vi-VN")}
                        </p>
                      </div>
                    </div>

                    <div className="pt-4 border-t">
                      <Link href={`/wallet-transparency?safe=${currentTrade.safeAddress}`}>
                        <Button variant="outline" className="w-full" data-testid="button-check-transparency">
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Kiểm tra thông tin minh bạch Safe
                        </Button>
                      </Link>
                    </div>

                    {currentTrade.status === "LISTED" && (
                      <div className="space-y-4 pt-4">
                        <Alert>
                          <AlertCircle className="h-4 w-4" />
                          <AlertTitle>Xác nhận mua</AlertTitle>
                          <AlertDescription>
                            Kiểm tra kỹ thông tin Safe trước khi tham gia giao dịch.
                          </AlertDescription>
                        </Alert>
                        <Button
                          className="w-full"
                          onClick={() => joinTradeMutation.mutate()}
                          disabled={joinTradeMutation.isPending}
                          data-testid="button-join-trade"
                        >
                          {joinTradeMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Đang xử lý...
                            </>
                          ) : (
                            "Tham gia giao dịch"
                          )}
                        </Button>
                      </div>
                    )}

                    {currentTrade.status === "JOINED" && (
                      <Alert>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <AlertTitle>Chờ người bán kích hoạt</AlertTitle>
                        <AlertDescription>
                          Người bán cần thiết lập Guard và kích hoạt giao dịch trên blockchain.
                        </AlertDescription>
                      </Alert>
                    )}

                    {currentTrade.status === "ARMED" && (
                      <div className="space-y-4 pt-4">
                        <Alert className="border-warning">
                          <CheckCircle2 className="h-4 w-4 text-warning" />
                          <AlertTitle>Giao dịch đã được kích hoạt</AlertTitle>
                          <AlertDescription>
                            Safe đã bị khóa. Bạn có thể gửi ký quỹ ETH để tiếp tục.
                          </AlertDescription>
                        </Alert>
                        <Button
                          className="w-full"
                          onClick={() => depositMutation.mutate()}
                          disabled={depositMutation.isPending}
                          data-testid="button-deposit"
                        >
                          {depositMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Đang xử lý...
                            </>
                          ) : (
                            `Gửi ký quỹ ${currentTrade.priceEth} ETH`
                          )}
                        </Button>
                      </div>
                    )}

                    {currentTrade.status === "FUNDED" && (
                      <Alert>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <AlertTitle>Chờ chuyển quyền sở hữu</AlertTitle>
                        <AlertDescription>
                          ETH đã được gửi vào ký quỹ. Chờ người bán thực hiện chuyển quyền.
                        </AlertDescription>
                      </Alert>
                    )}

                    {currentTrade.status === "COMPLETED" && (
                      <Alert className="border-success">
                        <CheckCircle2 className="h-4 w-4 text-success" />
                        <AlertTitle>Giao dịch hoàn tất</AlertTitle>
                        <AlertDescription>
                          Bạn đã trở thành owner của Safe wallet này. 
                          Bạn có thể gỡ bỏ Guard contract nếu muốn.
                        </AlertDescription>
                      </Alert>
                    )}

                    {currentTrade.status === "CANCELLED" && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Giao dịch đã bị hủy</AlertTitle>
                        <AlertDescription>
                          Giao dịch đã bị hủy. Nếu bạn đã gửi ký quỹ, ETH sẽ được hoàn trả.
                        </AlertDescription>
                      </Alert>
                    )}
                  </>
                ) : null}
              </CardContent>
            </Card>

            <Button
              variant="outline"
              onClick={() => {
                setFoundTrade(null);
                form.reset();
              }}
              data-testid="button-new-search"
            >
              Tìm kiếm giao dịch khác
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
