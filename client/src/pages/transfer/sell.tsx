import { useState, useEffect } from "react";
import { useAccount, useWriteContract, usePublicClient, useChainId, useSwitchChain, useSignMessage } from "wagmi";
import { parseEther, keccak256, encodeAbiParameters, parseAbiParameters } from "viem";
import { buildAuthPayload } from "@/lib/web3-auth";
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
import { Loader2, AlertCircle, CheckCircle2, Copy, Shield } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useSafeSdk } from "@/hooks/use-safe-sdk";
import { escrowABI } from "@/lib/contracts/EscrowABI";
import { getEscrowAddress, SUPPORTED_CHAIN_ID } from "@/lib/contracts/addresses";
import { DeadlineDisplay } from "@/components/deadline-display";
import type { Trade } from "@shared/schema";
import type { SafeInfo } from "@/lib/safe-sdk";

const sellFormSchema = z.object({
  safeAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Địa chỉ Safe không hợp lệ"),
  priceEth: z.string().min(1, "Vui lòng nhập giá").refine(
    (val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0,
    "Giá phải lớn hơn 0"
  ),
  deadlineMinutes: z.string().min(1, "Vui lòng chọn thời hạn").refine(
    (val) => !isNaN(parseInt(val)) && parseInt(val) >= 5,
    "Thời hạn phải ít nhất 5 phút"
  ),
});

type SellFormValues = z.infer<typeof sellFormSchema>;

const sellerSteps = [
  { id: 1, title: "Tạo đơn bán",   description: "Nhập thông tin" },
  { id: 2, title: "Chờ người mua", description: "Người mua tham gia" },
  { id: 3, title: "Kích hoạt",     description: "Arm on-chain" },
  { id: 4, title: "Chờ ký quỹ",   description: "Người mua gửi ETH" },
  { id: 5, title: "Hoàn tất",      description: "Chuyển sở hữu & nhận tiền" },
];

function getStepFromStatus(status: string): number {
  switch (status) {
    case "DRAFT":
    case "LISTED":  return 2;
    case "JOINED":  return 3;
    case "ARMED":   return 4;
    case "FUNDED":  return 5;
    default:        return status === "COMPLETED" || status === "CANCELLED" ? 6 : 1;
  }
}

export default function Sell() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const { signMessageAsync } = useSignMessage();
  const { switchChain, isPending: isSwitchingChain } = useSwitchChain();
  const { toast } = useToast();
  const isWrongNetwork = isConnected && chainId !== SUPPORTED_CHAIN_ID;

  const [createdTradeId, setCreatedTradeId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search).get("tradeId") || null;
  });
  const [safeInfo, setSafeInfo] = useState<SafeInfo | null>(null);
  const [isCheckingSafe, setIsCheckingSafe] = useState(false);
  const [isSwappingOwner, setIsSwappingOwner] = useState(false);

  const { getSafeInfo, swapOwner, isOwner } = useSafeSdk();

  // ── Persist / restore trade session ──────────────────────────────────────
  // Restore from localStorage when wallet connects (only if URL param didn't already set it)
  useEffect(() => {
    if (createdTradeId || !address) return;
    const saved = localStorage.getItem(`sel_trade_${address}`);
    if (saved) setCreatedTradeId(saved);
  }, [address]);

  // Save whenever tradeId is set
  useEffect(() => {
    if (!address || !createdTradeId) return;
    localStorage.setItem(`sel_trade_${address}`, createdTradeId);
  }, [createdTradeId, address]);

  const form = useForm<SellFormValues>({
    resolver: zodResolver(sellFormSchema),
    defaultValues: { safeAddress: "", priceEth: "", deadlineMinutes: "1440" },
  });

  const { data: trade, isLoading: isLoadingTrade } = useQuery<Trade>({
    queryKey: ["/api/trades", createdTradeId],
    enabled: !!createdTradeId,
    refetchInterval: 5000,
  });

  // Clear localStorage on terminal state (after trade is declared)
  useEffect(() => {
    if (!address || !trade) return;
    if (trade.status === "COMPLETED" || trade.status === "CANCELLED") {
      localStorage.removeItem(`sel_trade_${address}`);
    }
  }, [trade?.status, address]);

  // ── Step 1: Tạo listing trên backend ─────────────────────────────────────
  const createTradeMutation = useMutation({
    mutationFn: async (values: SellFormValues) => {
      const deadline = new Date();
      deadline.setMinutes(deadline.getMinutes() + parseInt(values.deadlineMinutes));
      // Ký để chứng minh là owner của ví sellerAddress
      const auth = await buildAuthPayload(signMessageAsync, "create-trade", values.safeAddress.toLowerCase());
      const res = await apiRequest("POST", "/api/trades", {
        safeAddress: values.safeAddress,
        sellerAddress: address,
        priceEth: values.priceEth,
        deadline: deadline.toISOString(),
        status: "LISTED",
        ...auth,
      });
      return res.json();
    },
    onSuccess: (data) => {
      setCreatedTradeId(data.id);
      toast({ title: "Tạo đơn bán thành công", description: "Chờ người mua tham gia." });
      queryClient.invalidateQueries({ queryKey: ["/api/trades"] });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Lỗi", description: error.message });
    },
  });

  // ── Step 3: Arm on-chain rồi sync backend ────────────────────────────────
  const armTradeMutation = useMutation({
    mutationFn: async () => {
      if (!trade?.buyerAddress || !address) throw new Error("Thiếu thông tin buyer hoặc seller");

      const contractAddress = getEscrowAddress(chainId);
      const safeAddr = trade.safeAddress as `0x${string}`;
      const buyerAddr = trade.buyerAddress as `0x${string}`;
      const amount = parseEther(trade.priceEth);
      const deadlineTs = BigInt(Math.floor(new Date(trade.deadline).getTime() / 1000));

      // 0. Client-side deadline check
      const nowSec = BigInt(Math.floor(Date.now() / 1000));
      if (deadlineTs <= nowSec) {
        throw new Error("Thời hạn giao dịch đã hết. Vui lòng tạo giao dịch mới với thời hạn dài hơn.");
      }

      // Compute onchain tradeId: khớp với contract dùng abi.encode (padded 32 bytes mỗi address)
      const onchainTradeId = keccak256(
        encodeAbiParameters(
          parseAbiParameters("address, address, address"),
          [buyerAddr, address as `0x${string}`, safeAddr]
        )
      );

      // 1. Simulate để decode lỗi revert rõ ràng trước khi gửi TX
      let alreadyArmed = false;
      try {
        await publicClient!.simulateContract({
          address: contractAddress,
          abi: escrowABI,
          functionName: "armTrade",
          args: [safeAddr, buyerAddr, amount, deadlineTs],
          account: address as `0x${string}`,
        });
      } catch (simErr: any) {
        const errName: string =
          simErr?.cause?.data?.errorName ??
          simErr?.data?.errorName ??
          simErr?.name ??
          "";

        if (errName === "InvalidState") {
          // Kiểm tra xem trade này đã được arm on-chain chưa (partial failure khi sync backend)
          const activeId = await publicClient!.readContract({
            address: contractAddress,
            abi: escrowABI,
            functionName: "activeTradeBySafe",
            args: [safeAddr],
          }) as `0x${string}`;

          if (activeId === onchainTradeId) {
            // Trade đã được arm on-chain — chỉ cần re-sync backend
            alreadyArmed = true;
          } else {
            throw new Error(
              "Safe này đã có giao dịch khác đang diễn ra trên blockchain. " +
              "Hãy đợi giao dịch đó hoàn tất hoặc hết hạn trước."
            );
          }
        } else {
          const MESSAGES: Record<string, string> = {
            DeadlinePassed: "Thời hạn giao dịch đã hết. Vui lòng tạo giao dịch mới.",
            NotSeller:      "Ví hiện tại không phải owner của Safe này.",
            Invalid:        "Thông tin giao dịch không hợp lệ (địa chỉ hoặc amount sai).",
          };
          throw new Error(MESSAGES[errName] ?? simErr?.shortMessage ?? simErr?.message ?? "Giao dịch bị revert");
        }
      }

      // 2. Gọi armTrade() on-chain (bỏ qua nếu đã arm rồi)
      if (!alreadyArmed) {
        const txHash = await writeContractAsync({
          address: contractAddress,
          abi: escrowABI,
          functionName: "armTrade",
          args: [safeAddr, buyerAddr, amount, deadlineTs],
        });

        const receipt = await publicClient!.waitForTransactionReceipt({ hash: txHash });
        if (receipt.status === "reverted") throw new Error("Transaction bị revert");
      }

      // Đọc snapshotNonce từ trades() getter
      const tradeData = await publicClient!.readContract({
        address: contractAddress,
        abi: escrowABI,
        functionName: "trades",
        args: [onchainTradeId],
      }) as readonly [string, string, string, bigint, bigint, bigint, number, boolean];
      const snapshotNonce = tradeData[5]; // index 5

      // 3. Sync backend
      const res = await apiRequest("POST", `/api/trades/${createdTradeId}/arm`, {
        onchainTradeId,
        snapshotNonce: snapshotNonce.toString(),
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Kích hoạt thành công", description: "Giao dịch đã được arm trên blockchain." });
      queryClient.invalidateQueries({ queryKey: ["/api/trades", createdTradeId] });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Lỗi arm trade", description: error.message });
    },
  });

  // ── Step 5: Chuyển owner Safe rồi gọi releaseFunds() trên SC ─────────────
  const handleTransferAndRelease = async () => {
    if (!trade?.buyerAddress || !address) return;

    setIsSwappingOwner(true);
    try {
      // 1. Chuyển owner qua Safe SDK
      const swapResult = await swapOwner(trade.safeAddress, address, trade.buyerAddress);
      if (!swapResult.success) throw new Error(swapResult.error || "Chuyển owner thất bại");

      toast({ title: "Đã chuyển quyền sở hữu", description: "Đang giải ngân ký quỹ..." });

      // 2. Gọi releaseFunds() — SC tự verify isOwner(buyer) && !isOwner(seller)
      const contractAddress = getEscrowAddress(chainId);
      const onchainTradeId = trade.onchainTradeId as `0x${string}`;

      const txHash = await writeContractAsync({
        address: contractAddress,
        abi: escrowABI,
        functionName: "releaseFunds",
        args: [onchainTradeId],
      });

      await publicClient!.waitForTransactionReceipt({ hash: txHash });

      // 3. Sync backend
      await apiRequest("POST", `/api/trades/${trade.id}/complete`, { txHash });
      queryClient.invalidateQueries({ queryKey: ["/api/trades", createdTradeId] });

      toast({ title: "Hoàn tất!", description: "ETH đã được chuyển vào ví của bạn." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Lỗi", description: error.message });
    } finally {
      setIsSwappingOwner(false);
    }
  };

  // ── Seller cancel: hủy ở mọi giai đoạn trước khi chuyển nhượng ──────────────
  const sellerCancelMutation = useMutation({
    mutationFn: async () => {
      if (!trade) throw new Error("Không tìm thấy giao dịch");

      // LISTED/JOINED: chưa có on-chain state → chỉ cần hủy trên server
      if (trade.status === "LISTED" || trade.status === "JOINED") {
        const res = await apiRequest("POST", `/api/trades/${trade.id}/cancel`, {
          reason: "Người bán hủy đơn",
          walletAddress: address,
        });
        return res.json();
      }

      // ARMED/FUNDED: cần hủy on-chain trước, sau đó sync server
      const contractAddress = getEscrowAddress(chainId);
      const onchainTradeId = trade.onchainTradeId as `0x${string}`;
      if (!onchainTradeId) throw new Error("Chưa có trade ID trên blockchain");

      const txHash = await writeContractAsync({
        address: contractAddress,
        abi: escrowABI,
        functionName: "sellerCancel",
        args: [onchainTradeId],
      });

      const receipt = await publicClient!.waitForTransactionReceipt({ hash: txHash });
      if (receipt.status === "reverted") throw new Error("Transaction bị revert");

      const res = await apiRequest("POST", `/api/trades/${trade.id}/cancel`, {
        reason: "Người bán hủy đơn",
        walletAddress: address,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Đã hủy giao dịch", description: "Giao dịch đã được hủy thành công." });
      queryClient.invalidateQueries({ queryKey: ["/api/trades", createdTradeId] });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Lỗi hủy giao dịch", description: error.message });
    },
  });

  // ── cancelTimeout: ai cũng có thể gọi sau khi deadline qua ──────────────────
  const cancelTimeoutMutation = useMutation({
    mutationFn: async () => {
      const contractAddress = getEscrowAddress(chainId);
      const onchainTradeId = trade?.onchainTradeId as `0x${string}`;
      if (!onchainTradeId) throw new Error("Chưa có trade ID trên blockchain");

      const txHash = await writeContractAsync({
        address: contractAddress,
        abi: escrowABI,
        functionName: "cancelTimeout",
        args: [onchainTradeId],
      });

      const receipt = await publicClient!.waitForTransactionReceipt({ hash: txHash });
      if (receipt.status === "reverted") throw new Error("Transaction bị revert — deadline chưa qua");

      // Sync backend
      const res = await apiRequest("POST", `/api/trades/${createdTradeId}/cancel`, {
        reason: "Hủy do hết thời hạn giao dịch",
        walletAddress: address,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Đã hủy giao dịch", description: "Hết thời hạn. ETH ký quỹ (nếu có) đã hoàn về buyer." });
      queryClient.invalidateQueries({ queryKey: ["/api/trades", createdTradeId] });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Lỗi hủy timeout", description: error.message });
    },
  });

  // ── Safe info auto-check ───────────────────────────────────────────────────
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
    } catch (err) {
      console.error("Lỗi khi lấy thông tin Safe:", err);
    } finally {
      setIsCheckingSafe(false);
    }
  };

  const safeAddress = form.watch("safeAddress");
  useEffect(() => {
    const t = setTimeout(() => {
      if (safeAddress && /^0x[a-fA-F0-9]{40}$/.test(safeAddress)) {
        checkSafeInfo(safeAddress);
      } else {
        setSafeInfo(null);
      }
    }, 500);
    return () => clearTimeout(t);
  }, [safeAddress]);

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
          <p className="text-muted-foreground mb-6">Bạn cần kết nối ví MetaMask để đăng bán Safe wallet.</p>
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

  const currentStep = trade ? getStepFromStatus(trade.status) : 1;

  return (
    <div className="container px-4 md:px-8 py-8 md:py-12">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">Bán Safe Wallet</h1>
          <p className="text-muted-foreground">Tạo đơn bán để chuyển nhượng quyền sở hữu Safe wallet</p>
        </div>

        <Stepper steps={sellerSteps} currentStep={currentStep} className="mb-8" />

        {!createdTradeId ? (
          // ── Form tạo listing ────────────────────────────────────────────
          <Card>
            <CardHeader>
              <CardTitle>Bước 1: Tạo đơn bán</CardTitle>
              <CardDescription>Nhập thông tin Safe wallet bạn muốn bán</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit((v) => createTradeMutation.mutate(v))} className="space-y-6">
                  <FormField control={form.control} name="safeAddress" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Địa chỉ Safe</FormLabel>
                      <FormControl>
                        <Input placeholder="0x..." className="font-mono" {...field} data-testid="input-safe-address" />
                      </FormControl>
                      <FormDescription>Địa chỉ của Safe wallet bạn muốn bán</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="priceEth" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Giá bán (ETH)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input type="number" step="0.001" placeholder="0.5" {...field} data-testid="input-price" />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">ETH</span>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="deadlineMinutes" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Thời hạn (phút)</FormLabel>
                      <FormControl>
                        <Input type="number" min="5" placeholder="1440" {...field} data-testid="input-deadline" />
                      </FormControl>
                      <FormDescription>Tối thiểu 5 phút · 1440 = 24 giờ · 10080 = 7 ngày</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )} />

                  {safeInfo && (
                    <Card className="bg-muted/50">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Shield className="h-4 w-4" />
                          Thông tin Safe
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {isCheckingSafe ? (
                          <div className="flex items-center gap-2 text-sm">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Đang kiểm tra...</span>
                          </div>
                        ) : (
                          <div className="grid grid-cols-3 gap-2 text-sm">
                            <div>
                              <p className="text-muted-foreground">Số owner</p>
                              <p className="font-medium">{safeInfo.owners.length}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Ngưỡng ký</p>
                              <p className="font-medium">{safeInfo.threshold}/{safeInfo.owners.length}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Nonce hiện tại</p>
                              <p className="font-medium">{safeInfo.nonce}</p>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Lưu ý quan trọng</AlertTitle>
                    <AlertDescription>
                      Sau khi arm giao dịch, Safe sẽ được "đóng băng" về mặt hợp đồng — không nên thực hiện
                      bất kỳ transaction nào trên Safe cho đến khi chuyển quyền cho người mua.
                    </AlertDescription>
                  </Alert>

                  <Button type="submit" className="w-full" disabled={createTradeMutation.isPending} data-testid="button-create-listing">
                    {createTradeMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Đang tạo...</> : "Tạo đơn bán"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        ) : (
          // ── Trade flow ──────────────────────────────────────────────────
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <CardTitle>Thông tin giao dịch</CardTitle>
                    <CardDescription>Theo dõi trạng thái giao dịch</CardDescription>
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
                          <code className="text-sm font-mono bg-muted px-2 py-1 rounded truncate max-w-[200px]">{trade.id}</code>
                          <Button variant="ghost" size="icon" onClick={copyTradeId} data-testid="button-copy-trade-id">
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Safe Address</p>
                        <code className="text-sm font-mono bg-muted px-2 py-1 rounded block truncate">{trade.safeAddress}</code>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Giá bán</p>
                        <p className="font-semibold">{trade.priceEth} ETH</p>
                      </div>
                      <DeadlineDisplay
                        deadline={trade.deadline}
                        status={trade.status}
                        createdAt={trade.createdAt}
                      />
                      {trade.buyerAddress && (
                        <div className="space-y-1 md:col-span-2">
                          <p className="text-sm text-muted-foreground">Người mua</p>
                          <code className="text-sm font-mono bg-muted px-2 py-1 rounded block truncate">{trade.buyerAddress}</code>
                        </div>
                      )}
                      {trade.onchainTradeId && (
                        <div className="space-y-1 md:col-span-2">
                          <p className="text-sm text-muted-foreground">Onchain Trade ID</p>
                          <code className="text-sm font-mono bg-muted px-2 py-1 rounded block truncate">{trade.onchainTradeId}</code>
                        </div>
                      )}
                    </div>

                    {/* LISTED: chờ buyer */}
                    {trade.status === "LISTED" && (
                      <div className="space-y-3">
                        <Alert>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <AlertTitle>Chờ người mua tham gia</AlertTitle>
                          <AlertDescription>Chia sẻ mã giao dịch cho người muốn mua Safe của bạn.</AlertDescription>
                        </Alert>
                        <Button
                          variant="outline"
                          className="w-full text-destructive hover:bg-destructive/10"
                          onClick={() => sellerCancelMutation.mutate()}
                          disabled={sellerCancelMutation.isPending}
                          data-testid="button-unlist"
                        >
                          {sellerCancelMutation.isPending
                            ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Đang hủy...</>
                            : "Hủy đơn bán"}
                        </Button>
                      </div>
                    )}

                    {/* JOINED: arm on-chain */}
                    {trade.status === "JOINED" && (
                      <div className="space-y-4">
                        <Alert className="border-warning">
                          <CheckCircle2 className="h-4 w-4 text-warning" />
                          <AlertTitle>Người mua đã tham gia</AlertTitle>
                          <AlertDescription>
                            Kích hoạt giao dịch trên blockchain để "đóng băng" Safe và chờ buyer gửi ký quỹ.
                          </AlertDescription>
                        </Alert>
                        <Button
                          className="w-full"
                          onClick={() => armTradeMutation.mutate()}
                          disabled={armTradeMutation.isPending}
                          data-testid="button-arm-trade"
                        >
                          {armTradeMutation.isPending
                            ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Đang arm on-chain...</>
                            : "Kích hoạt giao dịch (on-chain)"}
                        </Button>
                        <Button
                          variant="outline"
                          className="w-full text-destructive hover:bg-destructive/10"
                          onClick={() => sellerCancelMutation.mutate()}
                          disabled={sellerCancelMutation.isPending}
                          data-testid="button-seller-cancel-joined"
                        >
                          {sellerCancelMutation.isPending
                            ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Đang hủy...</>
                            : "Hủy giao dịch"}
                        </Button>
                      </div>
                    )}

                    {/* ARMED: chờ deposit */}
                    {trade.status === "ARMED" && (
                      <div className="space-y-3">
                        <Alert>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <AlertTitle>Chờ người mua gửi ký quỹ ETH</AlertTitle>
                          <AlertDescription>
                            Giao dịch đã được arm. Safe đang trong trạng thái "đóng băng".
                            Không thực hiện bất kỳ transaction nào trên Safe cho đến khi chuyển quyền.
                          </AlertDescription>
                        </Alert>
                        <Button
                          variant="outline"
                          className="w-full text-destructive hover:bg-destructive/10"
                          onClick={() => sellerCancelMutation.mutate()}
                          disabled={sellerCancelMutation.isPending}
                          data-testid="button-seller-cancel-armed"
                        >
                          {sellerCancelMutation.isPending
                            ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Đang hủy on-chain...</>
                            : "Hủy giao dịch"}
                        </Button>
                      </div>
                    )}

                    {/* FUNDED: chuyển owner + release */}
                    {trade.status === "FUNDED" && (
                      <div className="space-y-4">
                        <Alert className="border-success">
                          <CheckCircle2 className="h-4 w-4 text-success" />
                          <AlertTitle>Người mua đã gửi ký quỹ {trade.priceEth} ETH</AlertTitle>
                          <AlertDescription>
                            Bấm nút bên dưới để chuyển quyền sở hữu Safe cho người mua.
                            Sau khi chuyển thành công, ETH sẽ tự động được giải ngân vào ví của bạn.
                          </AlertDescription>
                        </Alert>
                        <Button
                          className="w-full"
                          onClick={handleTransferAndRelease}
                          disabled={isSwappingOwner}
                          data-testid="button-swap-owner"
                        >
                          {isSwappingOwner
                            ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Đang xử lý...</>
                            : "Chuyển quyền sở hữu & nhận ETH"}
                        </Button>
                        <Button
                          variant="outline"
                          className="w-full text-destructive hover:bg-destructive/10"
                          onClick={() => sellerCancelMutation.mutate()}
                          disabled={sellerCancelMutation.isPending || isSwappingOwner}
                          data-testid="button-seller-cancel-funded"
                        >
                          {sellerCancelMutation.isPending
                            ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Đang hủy on-chain...</>
                            : "Hủy giao dịch (hoàn ETH cho người mua)"}
                        </Button>
                      </div>
                    )}

                    {/* Timeout: hủy khi deadline đã qua (ARMED hoặc FUNDED) */}
                    {(trade.status === "ARMED" || trade.status === "FUNDED") &&
                      new Date(trade.deadline) < new Date() && (
                      <div className="space-y-3 pt-2 border-t">
                        <Alert variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertTitle>Hết thời hạn giao dịch</AlertTitle>
                          <AlertDescription>
                            Deadline đã qua. Bạn có thể hủy giao dịch trên blockchain.
                            {trade.status === "FUNDED" && " ETH ký quỹ sẽ được hoàn trả về ví người mua."}
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
                            : "Hủy giao dịch (hết hạn)"}
                        </Button>
                      </div>
                    )}

                    {trade.status === "COMPLETED" && (
                      <div className="space-y-3">
                        <Alert className="border-success">
                          <CheckCircle2 className="h-4 w-4 text-success" />
                          <AlertTitle>Giao dịch hoàn tất</AlertTitle>
                          <AlertDescription>Quyền sở hữu đã được chuyển và bạn đã nhận được thanh toán.</AlertDescription>
                        </Alert>
                        <Button variant="outline" className="w-full" onClick={() => setCreatedTradeId(null)}>
                          Bắt đầu giao dịch mới
                        </Button>
                      </div>
                    )}

                    {trade.status === "CANCELLED" && (
                      <div className="space-y-3">
                        <Alert variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertTitle>Giao dịch đã bị hủy</AlertTitle>
                          <AlertDescription>Giao dịch đã bị hủy. Ký quỹ (nếu có) đã được hoàn trả cho người mua.</AlertDescription>
                        </Alert>
                        <Button variant="outline" className="w-full" onClick={() => setCreatedTradeId(null)}>
                          Bắt đầu giao dịch mới
                        </Button>
                      </div>
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
