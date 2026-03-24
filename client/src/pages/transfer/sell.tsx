import { useState, useEffect } from "react";
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
import { Loader2, AlertCircle, CheckCircle2, Copy, Shield, Settings2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useSafeSdk } from "@/hooks/use-safe-sdk";
import type { Trade } from "@shared/schema";
import type { SafeInfo } from "@/lib/safe-sdk";

const sellFormSchema = z.object({
  safeAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Địa chỉ Safe không hợp lệ"),
  priceEth: z.string().min(1, "Vui lòng nhập giá").refine(
    (val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0,
    "Giá phải lớn hơn 0"
  ),
  deadlineHours: z.string().min(1, "Vui lòng chọn thời hạn").refine(
    (val) => !isNaN(parseInt(val)) && parseInt(val) >= 1,
    "Thời hạn phải ít nhất 1 giờ"
  ),
});

type SellFormValues = z.infer<typeof sellFormSchema>;

const sellerSteps = [
  { id: 1, title: "Tạo đơn bán", description: "Nhập thông tin" },
  { id: 2, title: "Chờ người mua", description: "Người mua tham gia" },
  { id: 3, title: "Kích hoạt", description: "Kích hoạt on-chain" },
  { id: 4, title: "Chờ ký quỹ", description: "Người mua gửi ETH" },
  { id: 5, title: "Hoàn tất", description: "Chuyển sở hữu" },
];

function getStepFromStatus(status: string): number {
  switch (status) {
    case "DRAFT":
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

const GUARD_CONTRACT_ADDRESS = "0xB5F8BC6FA44BE0A44C1f0328E5bEF48b4e0645d6";
// import.meta.env.VITE_GUARD_CONTRACT_ADDRESS ||
console.log("Guard Contract Address:", GUARD_CONTRACT_ADDRESS);
export default function Sell() {
  const { address, isConnected } = useAccount();
  const { toast } = useToast();
  const [createdTradeId, setCreatedTradeId] = useState<string | null>(null);
  const [safeInfo, setSafeInfo] = useState<SafeInfo | null>(null);
  const [isCheckingSafe, setIsCheckingSafe] = useState(false);
  const [isSettingGuard, setIsSettingGuard] = useState(false);
  const [isSwappingOwner, setIsSwappingOwner] = useState(false);
  
  const { getSafeInfo, setGuard, swapOwner, isOwner, loading: safeSdkLoading } = useSafeSdk();

  const form = useForm<SellFormValues>({
    resolver: zodResolver(sellFormSchema),
    defaultValues: {
      safeAddress: "",
      priceEth: "",
      deadlineHours: "24",
    },
  });

  const { data: trade, isLoading: isLoadingTrade } = useQuery<Trade>({
    queryKey: ["/api/trades", createdTradeId],
    enabled: !!createdTradeId,
    refetchInterval: 5000,
  });

  const createTradeMutation = useMutation({
    mutationFn: async (values: SellFormValues) => {
      const deadline = new Date();
      deadline.setHours(deadline.getHours() + parseInt(values.deadlineHours));
      
      const res = await apiRequest("POST", "/api/trades", {
        safeAddress: values.safeAddress,
        sellerAddress: address,
        priceEth: values.priceEth,
        deadline: deadline.toISOString(),
        status: "LISTED",
      });
      return res.json();
    },
    onSuccess: (data) => {
      setCreatedTradeId(data.id);
      toast({
        title: "Tạo đơn bán thành công",
        description: "Đơn bán của bạn đã được tạo. Chờ người mua tham gia.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/trades"] });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: error.message || "Không thể tạo đơn bán",
      });
    },
  });

  const armTradeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/trades/${createdTradeId}/arm`, {});
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Kích hoạt thành công",
        description: "Giao dịch đã được kích hoạt trên blockchain.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/trades", createdTradeId] });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: error.message || "Không thể arm trade",
      });
    },
  });

  const onSubmit = (values: SellFormValues) => {
    createTradeMutation.mutate(values);
  };

  const checkSafeInfo = async (safeAddress: string) => {
    if (!safeAddress || !/^0x[a-fA-F0-9]{40}$/.test(safeAddress)) return;
    
    setIsCheckingSafe(true);
    try {
      const info = await getSafeInfo(safeAddress);
      setSafeInfo(info);
      
      if (info && address) {
        const ownerCheck = await isOwner(safeAddress, address);
        if (!ownerCheck) {
          toast({
            variant: "destructive",
            title: "Không phải chủ sở hữu",
            description: "Địa chỉ ví của bạn không phải là owner của Safe này.",
          });
        }
      }
    } catch (error) {
      console.error("Lỗi khi lấy thông tin Safe:", error);
    } finally {
      setIsCheckingSafe(false);
    }
  };

  const handleSetGuard = async () => {
    const safeAddressValue = form.getValues("safeAddress");
    if (!safeAddressValue) return;
    
    setIsSettingGuard(true);
    try {
      const result = await setGuard(safeAddressValue, GUARD_CONTRACT_ADDRESS);
      
      if (result.success) {
        toast({
          title: "Thiết lập Guard thành công",
          description: "Guard contract đã được thiết lập cho Safe của bạn.",
        });
        await checkSafeInfo(safeAddressValue);
      } else {
        toast({
          variant: "destructive",
          title: "Lỗi",
          description: result.error || "Không thể thiết lập Guard",
        });
      }
    } finally {
      setIsSettingGuard(false);
    }
  };

  const safeAddress = form.watch("safeAddress");
  
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (safeAddress && /^0x[a-fA-F0-9]{40}$/.test(safeAddress)) {
        checkSafeInfo(safeAddress);
      } else {
        setSafeInfo(null);
      }
    }, 500);
    
    return () => clearTimeout(timeoutId);
  }, [safeAddress]);

  const isGuardSet = safeInfo?.guard && safeInfo.guard !== "0x0000000000000000000000000000000000000000";
  const isCorrectGuard = isGuardSet && safeInfo?.guard?.toLowerCase() === GUARD_CONTRACT_ADDRESS.toLowerCase();

  const handleSwapOwner = async () => {
    if (!trade?.buyerAddress || !address) {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: "Thiếu thông tin người mua hoặc người bán",
      });
      return;
    }
    
    setIsSwappingOwner(true);
    try {
      const result = await swapOwner(trade.safeAddress, address, trade.buyerAddress);
      
      if (result.success) {
        toast({
          title: "Chuyển quyền sở hữu thành công",
          description: "Quyền sở hữu Safe đã được chuyển cho người mua.",
        });
        
        await apiRequest("POST", `/api/trades/${trade.id}/complete`, {
          txHash: result.txHash,
        });
        queryClient.invalidateQueries({ queryKey: ["/api/trades", createdTradeId] });
      } else {
        toast({
          variant: "destructive",
          title: "Lỗi",
          description: result.error || "Không thể chuyển quyền sở hữu",
        });
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: error.message || "Không thể chuyển quyền sở hữu",
      });
    } finally {
      setIsSwappingOwner(false);
    }
  };

  const copyTradeId = () => {
    if (createdTradeId) {
      navigator.clipboard.writeText(createdTradeId);
      toast({ title: "Đã sao chép mã giao dịch" });
    }
  };

  if (!isConnected) {
    return (
      <div className="container px-4 md:px-8 py-12 md:py-16">
        <div className="max-w-lg mx-auto text-center">
          <Shield className="h-16 w-16 text-muted-foreground mx-auto mb-6" />
          <h1 className="text-2xl font-bold mb-4">Kết nối ví để bắt đầu</h1>
          <p className="text-muted-foreground mb-6">
            Bạn cần kết nối ví MetaMask để đăng bán Safe wallet.
          </p>
          <ConnectWallet />
        </div>
      </div>
    );
  }

  const currentStep = trade ? getStepFromStatus(trade.status) : 1;

  return (
    <div className="container px-4 md:px-8 py-8 md:py-12">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">Bán Safe Wallet</h1>
          <p className="text-muted-foreground">
            Tạo đơn bán để chuyển nhượng quyền sở hữu Safe wallet của bạn
          </p>
        </div>

        <Stepper steps={sellerSteps} currentStep={currentStep} className="mb-8" />

        {!createdTradeId ? (
          <Card>
            <CardHeader>
              <CardTitle>Bước 1: Tạo đơn bán</CardTitle>
              <CardDescription>
                Nhập thông tin Safe wallet bạn muốn bán
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="safeAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Địa chỉ Safe</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="0x..."
                            className="font-mono"
                            {...field}
                            data-testid="input-safe-address"
                          />
                        </FormControl>
                        <FormDescription>
                          Địa chỉ của Safe wallet bạn muốn bán
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="priceEth"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Giá bán (ETH)</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type="number"
                              step="0.001"
                              placeholder="0.5"
                              {...field}
                              data-testid="input-price"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                              ETH
                            </span>
                          </div>
                        </FormControl>
                        <FormDescription>
                          Số ETH bạn muốn nhận khi bán Safe
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="deadlineHours"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Thời hạn (giờ)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            placeholder="24"
                            {...field}
                            data-testid="input-deadline"
                          />
                        </FormControl>
                        <FormDescription>
                          Thời gian để hoàn tất giao dịch (tính từ khi arm trade)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {safeInfo && (
                    <Card className="bg-muted/50">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Shield className="h-4 w-4" />
                          Thông tin Safe
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <p className="text-muted-foreground">Số owner</p>
                            <p className="font-medium">{safeInfo.owners.length}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Ngưỡng ký</p>
                            <p className="font-medium">{safeInfo.threshold}/{safeInfo.owners.length}</p>
                          </div>
                        </div>
                        
                        <div className="text-sm">
                          <p className="text-muted-foreground mb-1">Trạng thái Guard</p>
                          {isCheckingSafe ? (
                            <div className="flex items-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span>Đang kiểm tra...</span>
                            </div>
                          ) : isCorrectGuard ? (
                            <div className="flex items-center gap-2 text-success">
                              <CheckCircle2 className="h-4 w-4" />
                              <span>Guard đã được thiết lập đúng</span>
                            </div>
                          ) : isGuardSet ? (
                            <div className="flex items-center gap-2 text-warning">
                              <AlertCircle className="h-4 w-4" />
                              <span>Guard khác đang được sử dụng</span>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <span className="text-muted-foreground">Chưa có Guard</span>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleSetGuard}
                                disabled={isSettingGuard}
                                data-testid="button-set-guard"
                              >
                                {isSettingGuard ? (
                                  <>
                                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                    Đang thiết lập...
                                  </>
                                ) : (
                                  <>
                                    <Settings2 className="mr-2 h-3 w-3" />
                                    Thiết lập Guard
                                  </>
                                )}
                              </Button>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Lưu ý quan trọng</AlertTitle>
                    <AlertDescription>
                      Bạn cần phải là owner của Safe wallet này để có thể bán. 
                      Guard contract sẽ được thiết lập tự động khi tạo đơn bán.
                    </AlertDescription>
                  </Alert>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={createTradeMutation.isPending}
                    data-testid="button-create-listing"
                  >
                    {createTradeMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Đang tạo...
                      </>
                    ) : (
                      "Tạo đơn bán"
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
                      Theo dõi trạng thái giao dịch
                    </CardDescription>
                  </div>
                  {trade && <TradeStatusBadge status={trade.status} />}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoadingTrade ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : trade ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Mã giao dịch</p>
                        <div className="flex items-center gap-2">
                          <code className="text-sm font-mono bg-muted px-2 py-1 rounded truncate max-w-[200px]">
                            {trade.id}
                          </code>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={copyTradeId}
                            data-testid="button-copy-trade-id"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Safe Address</p>
                        <code className="text-sm font-mono bg-muted px-2 py-1 rounded block truncate">
                          {trade.safeAddress}
                        </code>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Giá bán</p>
                        <p className="font-semibold">{trade.priceEth} ETH</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Thời hạn</p>
                        <p className="font-semibold">
                          {new Date(trade.deadline).toLocaleString("vi-VN")}
                        </p>
                      </div>
                      {trade.buyerAddress && (
                        <div className="space-y-1 md:col-span-2">
                          <p className="text-sm text-muted-foreground">Người mua</p>
                          <code className="text-sm font-mono bg-muted px-2 py-1 rounded block truncate">
                            {trade.buyerAddress}
                          </code>
                        </div>
                      )}
                    </div>

                    {trade.status === "LISTED" && (
                      <Alert>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <AlertTitle>Chờ người mua tham gia</AlertTitle>
                        <AlertDescription>
                          Chia sẻ mã giao dịch cho người muốn mua Safe của bạn.
                        </AlertDescription>
                      </Alert>
                    )}

                    {trade.status === "JOINED" && (
                      <div className="space-y-4">
                        <Alert className="border-warning">
                          <CheckCircle2 className="h-4 w-4 text-warning" />
                          <AlertTitle>Người mua đã tham gia</AlertTitle>
                          <AlertDescription>
                            Bước tiếp theo: Thiết lập Guard contract và kích hoạt giao dịch trên blockchain.
                          </AlertDescription>
                        </Alert>
                        <Button
                          className="w-full"
                          onClick={() => armTradeMutation.mutate()}
                          disabled={armTradeMutation.isPending}
                          data-testid="button-arm-trade"
                        >
                          {armTradeMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Đang xử lý...
                            </>
                          ) : (
                            "Kích hoạt giao dịch"
                          )}
                        </Button>
                      </div>
                    )}

                    {trade.status === "ARMED" && (
                      <Alert>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <AlertTitle>Chờ người mua gửi ký quỹ ETH</AlertTitle>
                        <AlertDescription>
                          Safe đã bị khóa bởi Guard. Chờ người mua gửi ETH vào ký quỹ.
                        </AlertDescription>
                      </Alert>
                    )}

                    {trade.status === "FUNDED" && (
                      <div className="space-y-4">
                        <Alert className="border-success">
                          <CheckCircle2 className="h-4 w-4 text-success" />
                          <AlertTitle>Người mua đã gửi ký quỹ</AlertTitle>
                          <AlertDescription>
                            Bấm nút bên dưới để tự động chuyển quyền sở hữu Safe cho người mua và nhận ETH.
                          </AlertDescription>
                        </Alert>
                        <Button
                          className="w-full"
                          onClick={handleSwapOwner}
                          disabled={isSwappingOwner}
                          data-testid="button-swap-owner"
                        >
                          {isSwappingOwner ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Đang chuyển quyền sở hữu...
                            </>
                          ) : (
                            "Chuyển quyền sở hữu cho người mua"
                          )}
                        </Button>
                      </div>
                    )}

                    {trade.status === "COMPLETED" && (
                      <Alert className="border-success">
                        <CheckCircle2 className="h-4 w-4 text-success" />
                        <AlertTitle>Giao dịch hoàn tất</AlertTitle>
                        <AlertDescription>
                          Quyền sở hữu đã được chuyển và bạn đã nhận được thanh toán.
                        </AlertDescription>
                      </Alert>
                    )}

                    {trade.status === "CANCELLED" && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Giao dịch đã bị hủy</AlertTitle>
                        <AlertDescription>
                          Giao dịch đã bị hủy do hết thời hạn hoặc vi phạm điều khoản.
                        </AlertDescription>
                      </Alert>
                    )}
                  </>
                ) : null}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
