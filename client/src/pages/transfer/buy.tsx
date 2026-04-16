import { useState, useEffect } from "react";
import { useAccount, useWriteContract, usePublicClient, useChainId, useSwitchChain } from "wagmi";
import { parseEther } from "viem";
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
import { Loader2, AlertCircle, CheckCircle2, Search, Shield, ExternalLink, AlertTriangle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useWebSocket } from "@/hooks/use-websocket";
import { escrowABI } from "@/lib/contracts/EscrowABI";
import { getEscrowAddress, SUPPORTED_CHAIN_ID } from "@/lib/contracts/addresses";
import { Link } from "wouter";
import type { Trade } from "@shared/schema";

const searchFormSchema = z.object({
  searchQuery: z.string().min(1, "Vui lòng nhập mã giao dịch hoặc địa chỉ Safe"),
});

type SearchFormValues = z.infer<typeof searchFormSchema>;

const buyerSteps = [
  { id: 1, title: "Tìm giao dịch",   description: "Tìm đơn bán" },
  { id: 2, title: "Tham gia",        description: "Xác nhận mua" },
  { id: 3, title: "Chờ kích hoạt",   description: "Người bán kích hoạt" },
  { id: 4, title: "Gửi ký quỹ",      description: "Gửi ETH on-chain" },
  { id: 5, title: "Hoàn tất",        description: "Nhận sở hữu" },
];

function getStepFromStatus(status: string): number {
  switch (status) {
    case "LISTED":    return 2;
    case "JOINED":    return 3;
    case "ARMED":     return 4;
    case "FUNDED":    return 5;
    case "COMPLETED":
    case "CANCELLED": return 6;
    default:          return 1;
  }
}

export default function Buy() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const { switchChain, isPending: isSwitchingChain } = useSwitchChain();
  const { toast } = useToast();
  const { lastMessage } = useWebSocket();
  const isWrongNetwork = isConnected && chainId !== SUPPORTED_CHAIN_ID;

  const [foundTrade, setFoundTrade] = useState<Trade | null>(null);
  const [suspiciousDetected, setSuspiciousDetected] = useState(false);
  const [ownershipTransferred, setOwnershipTransferred] = useState(false);

  const form = useForm<SearchFormValues>({
    resolver: zodResolver(searchFormSchema),
    defaultValues: { searchQuery: "" },
  });

  const { data: trade, isLoading: isLoadingTrade } = useQuery<Trade>({
    queryKey: ["/api/trades", foundTrade?.id],
    enabled: !!foundTrade?.id,
    refetchInterval: 5000,
  });

  // ── Listen to WebSocket events for FUNDED trades ───────────────────────────
  useEffect(() => {
    if (!lastMessage || lastMessage.type !== "trade_update") return;
    const data = lastMessage.data;
    if (!data || data.tradeId !== foundTrade?.id) return;

    if (data.status === "SUSPICIOUS_ACTIVITY") {
      setSuspiciousDetected(true);
      toast({
        variant: "destructive",
        title: "Cảnh báo bất thường",
        description: data.message || "Ví đã thực hiện giao dịch bất thường.",
      });
    }

    if (data.status === "OWNERSHIP_TRANSFERRED") {
      setOwnershipTransferred(true);
      toast({
        title: "Quyền sở hữu đã chuyển",
        description: data.message || "Safe đã được chuyển về tên bạn.",
      });
    }
  }, [lastMessage, foundTrade?.id, toast]);

  // ── Reset WS flags when we switch trade ────────────────────────────────────
  useEffect(() => {
    setSuspiciousDetected(false);
    setOwnershipTransferred(false);
  }, [foundTrade?.id]);

  const searchMutation = useMutation({
    mutationFn: async (values: SearchFormValues) => {
      const res = await fetch(`/api/trades/search?q=${encodeURIComponent(values.searchQuery)}`);
      if (!res.ok) throw new Error("Không tìm thấy trade");
      return res.json();
    },
    onSuccess: (data) => setFoundTrade(data),
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Không tìm thấy", description: error.message });
      setFoundTrade(null);
    },
  });

  const joinTradeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/trades/${foundTrade?.id}/join`, {
        buyerAddress: address,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Tham gia thành công", description: "Chờ người bán kích hoạt giao dịch." });
      queryClient.invalidateQueries({ queryKey: ["/api/trades", foundTrade?.id] });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Lỗi", description: error.message || "Không thể tham gia trade" });
    },
  });

  // ── Step 4: Deposit ETH on-chain rồi sync backend ─────────────────────────
  const depositMutation = useMutation({
    mutationFn: async () => {
      const currentTrade = trade || foundTrade;
      if (!currentTrade?.onchainTradeId) throw new Error("Chưa có trade ID trên blockchain");
      if (!currentTrade.priceEth) throw new Error("Chưa có giá giao dịch");

      const contractAddress = getEscrowAddress(chainId);
      const onchainTradeId = currentTrade.onchainTradeId as `0x${string}`;

      // 1. Gọi deposit() trên SC kèm ETH
      const txHash = await writeContractAsync({
        address: contractAddress,
        abi: escrowABI,
        functionName: "deposit",
        args: [onchainTradeId],
        value: parseEther(currentTrade.priceEth),
      });

      // 2. Chờ receipt
      const receipt = await publicClient!.waitForTransactionReceipt({ hash: txHash });
      if (receipt.status === "reverted") throw new Error("Transaction bị revert");

      // 3. Sync backend
      const res = await apiRequest("POST", `/api/trades/${currentTrade.id}/deposit`, {});
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Gửi ký quỹ thành công",
        description: "ETH đã được gửi vào escrow. Chờ người bán chuyển quyền sở hữu.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/trades", foundTrade?.id] });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Lỗi gửi ký quỹ", description: error.message });
    },
  });

  // ── Release: SC verify isOwner(buyer) && !isOwner(seller) rồi giải ngân ───
  const releaseFundsMutation = useMutation({
    mutationFn: async () => {
      const currentTrade = trade || foundTrade;
      if (!currentTrade?.onchainTradeId) throw new Error("Chưa có trade ID trên blockchain");

      const contractAddress = getEscrowAddress(chainId);
      const onchainTradeId = currentTrade.onchainTradeId as `0x${string}`;

      const txHash = await writeContractAsync({
        address: contractAddress,
        abi: escrowABI,
        functionName: "releaseFunds",
        args: [onchainTradeId],
      });

      const receipt = await publicClient!.waitForTransactionReceipt({ hash: txHash });
      if (receipt.status === "reverted") throw new Error("Transaction bị revert — SC chưa xác nhận quyền sở hữu");

      const res = await apiRequest("POST", `/api/trades/${currentTrade.id}/complete`, { txHash });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Giải ngân thành công", description: "Giao dịch hoàn tất!" });
      queryClient.invalidateQueries({ queryKey: ["/api/trades", foundTrade?.id] });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Lỗi giải ngân", description: error.message });
    },
  });

  // ── Cancel: SC verify nonce tăng && buyer không phải owner ────────────────
  const buyerCancelMutation = useMutation({
    mutationFn: async () => {
      const currentTrade = trade || foundTrade;
      if (!currentTrade?.onchainTradeId) throw new Error("Chưa có trade ID trên blockchain");

      const contractAddress = getEscrowAddress(chainId);
      const onchainTradeId = currentTrade.onchainTradeId as `0x${string}`;

      const txHash = await writeContractAsync({
        address: contractAddress,
        abi: escrowABI,
        functionName: "buyerRequestCancel",
        args: [onchainTradeId],
      });
      console.log(contractAddress)
      const receipt = await publicClient!.waitForTransactionReceipt({ hash: txHash });
      if (receipt.status === "reverted") throw new Error("SC từ chối hủy — chưa đủ điều kiện bất thường");

      const res = await apiRequest("POST", `/api/trades/${currentTrade.id}/cancel`, {
        reason: "Buyer yêu cầu hủy do phát hiện hoạt động bất thường",
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Đã hủy giao dịch", description: "ETH ký quỹ sẽ được hoàn trả." });
      queryClient.invalidateQueries({ queryKey: ["/api/trades", foundTrade?.id] });
      setSuspiciousDetected(false);
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Lỗi hủy giao dịch", description: error.message });
    },
  });

  // ── cancelTimeout: buyer dùng khi deadline qua mà chưa ai xử lý ────────────
  const cancelTimeoutMutation = useMutation({
    mutationFn: async () => {
      const currentTrade = trade || foundTrade;
      if (!currentTrade?.onchainTradeId) throw new Error("Chưa có trade ID trên blockchain");

      const contractAddress = getEscrowAddress(chainId);
      const onchainTradeId = currentTrade.onchainTradeId as `0x${string}`;

      const txHash = await writeContractAsync({
        address: contractAddress,
        abi: escrowABI,
        functionName: "cancelTimeout",
        args: [onchainTradeId],
      });

      const receipt = await publicClient!.waitForTransactionReceipt({ hash: txHash });
      if (receipt.status === "reverted") throw new Error("SC từ chối — deadline chưa qua");

      const res = await apiRequest("POST", `/api/trades/${currentTrade.id}/cancel`, {
        reason: "Hủy do hết thời hạn giao dịch",
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Đã hủy giao dịch", description: "ETH ký quỹ đã được hoàn trả về ví của bạn." });
      queryClient.invalidateQueries({ queryKey: ["/api/trades", foundTrade?.id] });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Lỗi hủy timeout", description: error.message });
    },
  });

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

  if (isWrongNetwork) {
    return (
      <div className="container px-4 md:px-8 py-12 md:py-16">
        <div className="max-w-lg mx-auto text-center">
          <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-6" />
          <h1 className="text-2xl font-bold mb-4">Sai mạng</h1>
          <p className="text-muted-foreground mb-6">
            Ứng dụng chạy trên <strong>Sepolia testnet</strong>. Vui lòng chuyển mạng để tiếp tục.
          </p>
          <Button
            onClick={() => switchChain({ chainId: SUPPORTED_CHAIN_ID })}
            disabled={isSwitchingChain}
          >
            {isSwitchingChain ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Đang chuyển mạng...</>
            ) : (
              "Chuyển sang Sepolia"
            )}
          </Button>
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
                <form onSubmit={form.handleSubmit((v) => searchMutation.mutate(v))} className="space-y-6">
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
                    <CardDescription>Chi tiết về Safe wallet bạn muốn mua</CardDescription>
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

                    {/* ── LISTED: Buyer tham gia ───────────────────────────── */}
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

                    {/* ── JOINED: Chờ seller arm ───────────────────────────── */}
                    {currentTrade.status === "JOINED" && (
                      <Alert>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <AlertTitle>Chờ người bán kích hoạt</AlertTitle>
                        <AlertDescription>
                          Người bán cần kích hoạt (arm) giao dịch trên blockchain. Khi hoàn tất, bạn có thể gửi ký quỹ ETH.
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* ── ARMED: Buyer deposit ETH on-chain ───────────────── */}
                    {currentTrade.status === "ARMED" && (
                      <div className="space-y-4 pt-4">
                        <Alert>
                          <CheckCircle2 className="h-4 w-4" />
                          <AlertTitle>Giao dịch đã được kích hoạt</AlertTitle>
                          <AlertDescription>
                            Safe đã bị khóa trên blockchain. Gửi ký quỹ ETH để tiếp tục — SC sẽ giữ tiền an toàn.
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
                              Đang gửi lên blockchain...
                            </>
                          ) : (
                            `Gửi ký quỹ ${currentTrade.priceEth} ETH`
                          )}
                        </Button>
                      </div>
                    )}

                    {/* ── FUNDED: Chờ chuyển owner + WS alerts ────────────── */}
                    {currentTrade.status === "FUNDED" && (
                      <div className="space-y-4 pt-4">
                        {!suspiciousDetected && !ownershipTransferred && (
                          <Alert>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <AlertTitle>Chờ chuyển quyền sở hữu</AlertTitle>
                            <AlertDescription>
                              ETH đã được gửi vào ký quỹ. Chờ người bán thực hiện chuyển quyền sở hữu Safe.
                            </AlertDescription>
                          </Alert>
                        )}

                        {suspiciousDetected && !ownershipTransferred && (
                          <div className="space-y-3">
                            <Alert variant="destructive">
                              <AlertTriangle className="h-4 w-4" />
                              <AlertTitle>Phát hiện hoạt động bất thường</AlertTitle>
                              <AlertDescription>
                                Ví đã thực hiện giao dịch mà không chuyển quyền sở hữu cho bạn. Bạn có thể yêu cầu SC xác minh và hoàn tiền.
                              </AlertDescription>
                            </Alert>
                            <Button
                              variant="destructive"
                              className="w-full"
                              onClick={() => buyerCancelMutation.mutate()}
                              disabled={buyerCancelMutation.isPending}
                              data-testid="button-buyer-cancel"
                            >
                              {buyerCancelMutation.isPending ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Đang xác minh trên blockchain...
                                </>
                              ) : (
                                "Yêu cầu hoàn tiền (SC xác minh)"
                              )}
                            </Button>
                          </div>
                        )}

                        {ownershipTransferred && (
                          <div className="space-y-3">
                            <Alert className="border-green-500">
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                              <AlertTitle>Quyền sở hữu đã chuyển!</AlertTitle>
                              <AlertDescription>
                                Safe đã được chuyển tên bạn. Nhấn bên dưới để SC xác minh và giải ngân cho người bán.
                              </AlertDescription>
                            </Alert>
                            <Button
                              className="w-full"
                              onClick={() => releaseFundsMutation.mutate()}
                              disabled={releaseFundsMutation.isPending}
                              data-testid="button-release-funds"
                            >
                              {releaseFundsMutation.isPending ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Đang xác minh trên blockchain...
                                </>
                              ) : (
                                "Xác nhận & Giải ngân"
                              )}
                            </Button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* ── COMPLETED ────────────────────────────────────────── */}
                    {currentTrade.status === "COMPLETED" && (
                      <Alert className="border-green-500">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <AlertTitle>Giao dịch hoàn tất</AlertTitle>
                        <AlertDescription>
                          Bạn đã trở thành owner của Safe wallet này.
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* ── Timeout: hủy khi deadline qua (ARMED hoặc FUNDED) ── */}
                    {(currentTrade.status === "ARMED" || currentTrade.status === "FUNDED") &&
                      new Date(currentTrade.deadline) < new Date() && (
                      <div className="space-y-3 pt-2 border-t">
                        <Alert variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertTitle>Hết thời hạn giao dịch</AlertTitle>
                          <AlertDescription>
                            Deadline đã qua. Bạn có thể yêu cầu hủy và nhận lại ETH ký quỹ.
                          </AlertDescription>
                        </Alert>
                        <Button
                          variant="destructive"
                          className="w-full"
                          onClick={() => cancelTimeoutMutation.mutate()}
                          disabled={cancelTimeoutMutation.isPending}
                          data-testid="button-cancel-timeout"
                        >
                          {cancelTimeoutMutation.isPending
                            ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Đang hủy on-chain...</>
                            : "Hủy giao dịch & nhận lại ETH"}
                        </Button>
                      </div>
                    )}

                    {/* ── CANCELLED ────────────────────────────────────────── */}
                    {currentTrade.status === "CANCELLED" && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Giao dịch đã bị hủy</AlertTitle>
                        <AlertDescription>
                          Giao dịch đã bị hủy. Nếu bạn đã gửi ký quỹ, hãy gọi SC để rút lại ETH.
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
