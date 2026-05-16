import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  useAccount,
  useConnect,
  useWriteContract,
  usePublicClient,
  useChainId,
  useSignMessage,
} from "wagmi";
import {
  parseEther,
  keccak256,
  encodeAbiParameters,
  parseAbiParameters,
} from "viem";
import { MessageCircle, X, Send, Loader2, Bot, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useChat, type ChatMessage, type UiAction } from "@/hooks/use-chat";
import { useLocation } from "wouter";
import { buildAuthPayload } from "@/lib/web3-auth";
import { apiRequest } from "@/lib/queryClient";
import { escrowABI } from "@/lib/contracts/EscrowABI";
import { getEscrowAddress } from "@/lib/contracts/addresses";
import { useSafeSdk } from "@/hooks/use-safe-sdk";
import type { Trade } from "@shared/schema";

// ─── UiAction Renderer ────────────────────────────────────────────────────────

const ACTION_LABELS: Record<string, string> = {
  sign_deposit:    "Gửi ETH ký quỹ",
  sign_arm:        "Kích hoạt trade",
  sign_release:    "Hoàn tất & Giải ngân",
  sign_cancel:     "Hủy trade",
  connect_wallet:  "Kết nối ví",
  view_trade:      "Xem trade",
  create_trade:    "Tạo trade bán",
  join_trade:      "Tham gia mua",
};

const ACTION_VARIANTS: Record<string, "default" | "destructive" | "outline" | "secondary"> = {
  sign_deposit:   "default",
  sign_arm:       "default",
  sign_release:   "default",
  sign_cancel:    "destructive",
  connect_wallet: "outline",
  view_trade:     "secondary",
  create_trade:   "default",
  join_trade:     "default",
};

interface UiActionRendererProps {
  action: UiAction;
  onDone: (result: string) => void;
}

function UiActionRenderer({ action, onDone }: UiActionRendererProps) {
  const [, navigate] = useLocation();
  const { address, isConnected } = useAccount();
  const { connectAsync, connectors } = useConnect();
  const { writeContractAsync } = useWriteContract();
  const { signMessageAsync } = useSignMessage();
  const publicClient = usePublicClient();
  const chainId = useChainId();
  const { swapOwner } = useSafeSdk();
  const [pending, setPending] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const fetchTrade = async (tradeId: string): Promise<Trade> => {
    const res = await fetch(`/api/trades/${tradeId}`);
    if (!res.ok) throw new Error("Không tìm thấy trade");
    return res.json();
  };

  const handleClick = async () => {
    setPending(true);
    setStatusMsg(null);
    try {
      const tradeId = action.params?.tradeId ? String(action.params.tradeId) : null;
      const actor = String(action.params?.actor ?? action.params?.role ?? "").toLowerCase();

      // ── Kết nối ví ────────────────────────────────────────────────────────
      if (action.type === "connect_wallet") {
        if (!isConnected) {
          const connector = connectors[0];
          if (!connector) throw new Error("Không tìm thấy wallet connector");
          await connectAsync({ connector });
        }
        onDone("Ví đã được kết nối.");
        return;
      }

      // ── Xem trade (vẫn navigate, chỉ để xem) ─────────────────────────────
      if (action.type === "view_trade") {
        const query = new URLSearchParams();
        if (tradeId) query.set("tradeId", tradeId);
        navigate(`/transfer/${actor === "seller" ? "sell" : "buy"}${query.toString() ? `?${query.toString()}` : ""}`);
        onDone(tradeId ? `Đã mở trade #${tradeId}.` : "Đã mở trang trade.");
        return;
      }

      if (!address) throw new Error("Vui lòng kết nối ví trước.");

      // ── Tạo trade (seller) ─────────────────────────────────────────────────
      if (action.type === "create_trade") {
        const safeAddress = action.params?.safeAddress ? String(action.params.safeAddress) : null;
        const priceEth    = action.params?.priceEth    ? String(action.params.priceEth)    : null;
        const deadlineMins = action.params?.deadlineMinutes ? String(action.params.deadlineMinutes) : "1440";
        if (!safeAddress || !priceEth) throw new Error("Thiếu Safe address hoặc giá bán. Vui lòng cung cấp đủ thông tin.");
        setStatusMsg("MetaMask đang mở để ký xác nhận...");
        const auth = await buildAuthPayload(signMessageAsync, "create-trade", safeAddress.toLowerCase());
        const deadline = new Date();
        deadline.setMinutes(deadline.getMinutes() + parseInt(deadlineMins));
        setStatusMsg("Đang tạo listing trên server...");
        const res = await apiRequest("POST", "/api/trades", {
          safeAddress,
          sellerAddress: address,
          priceEth,
          deadline: deadline.toISOString(),
          status: "LISTED",
          ...auth,
        });
        const data = await res.json();
        onDone(`Tạo trade thành công!\n\nMã trade: ${data.id}\n\nChia sẻ mã này cho người mua để họ tham gia.`);
        return;
      }

      if (!tradeId) throw new Error("Thiếu tradeId. Vui lòng thử lại.");

      // ── Tham gia mua (buyer join) ──────────────────────────────────────────
      if (action.type === "join_trade") {
        setStatusMsg("Đang lấy thông tin trade...");
        const trade = await fetchTrade(tradeId);
        if (trade.status !== "LISTED")
          throw new Error(`Trade đang ở trạng thái "${trade.status}", không thể tham gia.`);
        setStatusMsg("MetaMask đang mở để ký xác nhận...");
        const auth = await buildAuthPayload(signMessageAsync, "join-trade", trade.id);
        setStatusMsg("Đang gửi lên server...");
        const res = await apiRequest("POST", `/api/trades/${trade.id}/join`, {
          buyerAddress: address,
          ...auth,
        });
        await res.json();
        onDone("Đã tham gia trade thành công! Chờ người bán kích hoạt (arm) giao dịch trên blockchain.");
        return;
      }

      // ── Gửi ETH ký quỹ (buyer deposit) ────────────────────────────────────
      if (action.type === "sign_deposit") {
        setStatusMsg("Đang lấy thông tin trade...");
        const trade = await fetchTrade(tradeId);
        if (!trade.onchainTradeId)
          throw new Error("Trade chưa được arm on-chain. Chờ người bán kích hoạt trước.");
        if (!trade.priceEth) throw new Error("Chưa có giá giao dịch.");
        const contractAddress = getEscrowAddress(chainId);
        const onchainTradeId = trade.onchainTradeId as `0x${string}`;
        setStatusMsg(`MetaMask đang mở để gửi ${trade.priceEth} ETH...`);
        const txHash = await writeContractAsync({
          address: contractAddress,
          abi: escrowABI,
          functionName: "deposit",
          args: [onchainTradeId],
          value: parseEther(trade.priceEth),
        });
        setStatusMsg("Đang chờ xác nhận trên blockchain...");
        const receipt = await publicClient!.waitForTransactionReceipt({ hash: txHash });
        if (receipt.status === "reverted") throw new Error("Transaction bị revert trên blockchain.");
        setStatusMsg("Đang đồng bộ với server...");
        await apiRequest("POST", `/api/trades/${trade.id}/deposit`, {});
        onDone(`Đã gửi ${trade.priceEth} ETH ký quỹ thành công! Chờ người bán chuyển quyền sở hữu Safe.`);
        return;
      }

      // ── Kích hoạt giao dịch (seller arm) ──────────────────────────────────
      if (action.type === "sign_arm") {
        setStatusMsg("Đang lấy thông tin trade...");
        const trade = await fetchTrade(tradeId);
        if (!trade.buyerAddress) throw new Error("Chưa có người mua tham gia.");
        const contractAddress = getEscrowAddress(chainId);
        const safeAddr  = trade.safeAddress as `0x${string}`;
        const buyerAddr = trade.buyerAddress as `0x${string}`;
        const amount    = parseEther(trade.priceEth);
        const deadlineTs = BigInt(Math.floor(new Date(trade.deadline).getTime() / 1000));
        if (deadlineTs <= BigInt(Math.floor(Date.now() / 1000)))
          throw new Error("Thời hạn giao dịch đã hết. Vui lòng tạo giao dịch mới.");
        const onchainTradeId = keccak256(
          encodeAbiParameters(
            parseAbiParameters("address, address, address"),
            [buyerAddr, address as `0x${string}`, safeAddr]
          )
        );
        let alreadyArmed = false;
        setStatusMsg("Đang kiểm tra trạng thái blockchain...");
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
            simErr?.cause?.data?.errorName ?? simErr?.data?.errorName ?? simErr?.name ?? "";
          if (errName === "InvalidState") {
            const activeId = await publicClient!.readContract({
              address: contractAddress,
              abi: escrowABI,
              functionName: "activeTradeBySafe",
              args: [safeAddr],
            }) as `0x${string}`;
            if (activeId === onchainTradeId) {
              alreadyArmed = true;
            } else {
              throw new Error("Safe này đã có giao dịch khác đang diễn ra trên blockchain.");
            }
          } else {
            const MSGS: Record<string, string> = {
              DeadlinePassed: "Thời hạn giao dịch đã hết.",
              NotSeller:      "Ví hiện tại không phải owner của Safe này.",
              Invalid:        "Thông tin giao dịch không hợp lệ.",
            };
            throw new Error(MSGS[errName] ?? simErr?.shortMessage ?? simErr?.message ?? "Giao dịch bị revert.");
          }
        }
        if (!alreadyArmed) {
          setStatusMsg("MetaMask đang mở để kích hoạt giao dịch...");
          const txHash = await writeContractAsync({
            address: contractAddress,
            abi: escrowABI,
            functionName: "armTrade",
            args: [safeAddr, buyerAddr, amount, deadlineTs],
          });
          setStatusMsg("Đang chờ xác nhận trên blockchain...");
          const receipt = await publicClient!.waitForTransactionReceipt({ hash: txHash });
          if (receipt.status === "reverted") throw new Error("Transaction bị revert.");
        }
        const tradeData = await publicClient!.readContract({
          address: contractAddress,
          abi: escrowABI,
          functionName: "trades",
          args: [onchainTradeId],
        }) as readonly [string, string, string, bigint, bigint, bigint, number, boolean];
        setStatusMsg("Đang đồng bộ với server...");
        await apiRequest("POST", `/api/trades/${trade.id}/arm`, {
          onchainTradeId,
          snapshotNonce: tradeData[5].toString(),
        });
        onDone("Đã kích hoạt giao dịch on-chain thành công! Safe đang bị khóa. Chờ người mua gửi ETH ký quỹ.");
        return;
      }

      // ── Giải ngân / Hoàn tất (release) ────────────────────────────────────
      if (action.type === "sign_release") {
        setStatusMsg("Đang lấy thông tin trade...");
        const trade = await fetchTrade(tradeId);
        if (!trade.onchainTradeId) throw new Error("Trade chưa có trên blockchain.");
        const contractAddress = getEscrowAddress(chainId);
        const onchainTradeId  = trade.onchainTradeId as `0x${string}`;

        if (actor === "seller") {
          if (!trade.buyerAddress) throw new Error("Chưa có thông tin người mua.");
          setStatusMsg("MetaMask đang mở để chuyển quyền sở hữu Safe...");
          const swapResult = await swapOwner(trade.safeAddress, address, trade.buyerAddress);
          if (!swapResult.success) throw new Error(swapResult.error || "Chuyển owner thất bại.");
          setStatusMsg("MetaMask đang mở để giải ngân ETH...");
          const txHash = await writeContractAsync({
            address: contractAddress,
            abi: escrowABI,
            functionName: "releaseFunds",
            args: [onchainTradeId],
          });
          setStatusMsg("Đang chờ xác nhận...");
          await publicClient!.waitForTransactionReceipt({ hash: txHash });
          await apiRequest("POST", `/api/trades/${trade.id}/complete`, { txHash });
          onDone("Đã chuyển quyền sở hữu Safe và nhận ETH thành công! Giao dịch hoàn tất.");
        } else {
          setStatusMsg("MetaMask đang mở để xác nhận giải ngân...");
          const txHash = await writeContractAsync({
            address: contractAddress,
            abi: escrowABI,
            functionName: "releaseFunds",
            args: [onchainTradeId],
          });
          setStatusMsg("Đang chờ xác nhận...");
          const receipt = await publicClient!.waitForTransactionReceipt({ hash: txHash });
          if (receipt.status === "reverted")
            throw new Error("SC chưa xác nhận quyền sở hữu — hãy kiểm tra lại Safe.");
          await apiRequest("POST", `/api/trades/${trade.id}/complete`, { txHash });
          onDone("Đã xác nhận và giải ngân thành công! Giao dịch hoàn tất.");
        }
        return;
      }

      // ── Hủy giao dịch (cancel) ─────────────────────────────────────────────
      if (action.type === "sign_cancel") {
        setStatusMsg("Đang lấy thông tin trade...");
        const trade = await fetchTrade(tradeId);
        const contractAddress = getEscrowAddress(chainId);

        if (trade.status === "LISTED" || trade.status === "JOINED") {
          setStatusMsg("Đang hủy...");
          await apiRequest("POST", `/api/trades/${trade.id}/cancel`, {
            reason: actor === "buyer" ? "Người mua hủy trước khi kích hoạt" : "Người bán hủy đơn",
            walletAddress: address,
          });
          onDone("Đã hủy giao dịch thành công.");
          return;
        }

        if (trade.status === "ARMED" || trade.status === "FUNDED") {
          if (!trade.onchainTradeId) throw new Error("Chưa có trade ID trên blockchain.");
          const onchainTradeId = trade.onchainTradeId as `0x${string}`;
          const pastDeadline   = new Date(trade.deadline) < new Date();

          if (pastDeadline) {
            setStatusMsg("MetaMask đang mở để hủy do hết hạn...");
            const txHash = await writeContractAsync({
              address: contractAddress,
              abi: escrowABI,
              functionName: "cancelTimeout",
              args: [onchainTradeId],
            });
            setStatusMsg("Đang chờ xác nhận...");
            const receipt = await publicClient!.waitForTransactionReceipt({ hash: txHash });
            if (receipt.status === "reverted") throw new Error("Deadline chưa qua — SC từ chối hủy.");
            await apiRequest("POST", `/api/trades/${trade.id}/cancel`, {
              reason: "Hủy do hết thời hạn",
              walletAddress: address,
            });
            onDone("Đã hủy giao dịch do hết hạn. ETH ký quỹ (nếu có) đã được hoàn trả.");
          } else if (actor === "buyer") {
            setStatusMsg("MetaMask đang mở để yêu cầu hoàn tiền...");
            const txHash = await writeContractAsync({
              address: contractAddress,
              abi: escrowABI,
              functionName: "buyerRequestCancel",
              args: [onchainTradeId],
            });
            setStatusMsg("Đang chờ xác nhận...");
            const receipt = await publicClient!.waitForTransactionReceipt({ hash: txHash });
            if (receipt.status === "reverted")
              throw new Error("SC từ chối — chưa đủ điều kiện phát hiện bất thường.");
            await apiRequest("POST", `/api/trades/${trade.id}/cancel`, {
              reason: "Buyer yêu cầu hủy do phát hiện hoạt động bất thường",
              walletAddress: address,
            });
            onDone("Đã yêu cầu hoàn tiền thành công. SC sẽ xác minh và hoàn ETH về ví bạn.");
          } else {
            setStatusMsg("MetaMask đang mở để hủy giao dịch...");
            const txHash = await writeContractAsync({
              address: contractAddress,
              abi: escrowABI,
              functionName: "sellerCancel",
              args: [onchainTradeId],
            });
            setStatusMsg("Đang chờ xác nhận...");
            const receipt = await publicClient!.waitForTransactionReceipt({ hash: txHash });
            if (receipt.status === "reverted") throw new Error("Transaction bị revert.");
            await apiRequest("POST", `/api/trades/${trade.id}/cancel`, {
              reason: "Người bán hủy đơn",
              walletAddress: address,
            });
            onDone("Đã hủy giao dịch thành công.");
          }
          return;
        }

        throw new Error(`Không thể hủy — trade đang ở trạng thái "${trade.status}".`);
      }

    } catch (error) {
      const message = error instanceof Error ? error.message : "Thao tác thất bại.";
      onDone(`Lỗi: ${message}`);
    } finally {
      setPending(false);
      setStatusMsg(null);
    }
  };

  return (
    <div className="mt-2 w-full">
      <Button
        size="sm"
        variant={ACTION_VARIANTS[action.type] ?? "default"}
        className="w-full justify-start gap-2"
        onClick={handleClick}
        disabled={pending}
      >
        {pending && <Loader2 className="h-3 w-3 animate-spin" />}
        {ACTION_LABELS[action.type] ?? action.type}
        {action.params?.tradeId ? (
          <Badge variant="outline" className="ml-auto text-xs font-mono">
            #{String(action.params.tradeId).slice(0, 8)}
          </Badge>
        ) : null}
      </Button>
      {statusMsg && (
        <p className="text-xs text-muted-foreground mt-1 px-1 flex items-center gap-1">
          <Loader2 className="h-2.5 w-2.5 animate-spin" />
          {statusMsg}
        </p>
      )}
    </div>
  );
}

// ─── Message Bubble ───────────────────────────────────────────────────────────

function MessageBubble({ msg, onAction }: { msg: ChatMessage; onAction: (result: string) => void }) {
  const isUser = msg.role === "user";
  return (
    <div className={cn("flex gap-2 mb-3", isUser ? "flex-row-reverse" : "flex-row")}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Bot className="h-4 w-4 text-primary" />
        </div>
      )}
      <div className={cn(isUser ? "max-w-[80%] items-end" : "max-w-full items-start", "flex flex-col min-w-0 flex-1")}>
        <div
          className={cn(
            "rounded-2xl px-3 py-2 text-sm leading-relaxed",
            isUser
              ? "bg-primary text-primary-foreground rounded-tr-sm"
              : "bg-muted text-foreground rounded-tl-sm"
          )}
        >
          {isUser ? (
            msg.content
          ) : (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
                strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                em: ({ children }) => <em className="italic">{children}</em>,
                code: ({ children }) => (
                  <code className="bg-background/50 rounded px-1 py-0.5 font-mono text-xs">{children}</code>
                ),
                pre: ({ children }) => (
                  <pre className="bg-background/50 rounded p-2 font-mono text-xs overflow-x-auto mt-1 mb-1">{children}</pre>
                ),
                ul: ({ children }) => <ul className="list-disc list-inside mb-1 space-y-0.5">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal list-inside mb-1 space-y-0.5">{children}</ol>,
                li: ({ children }) => <li className="text-sm">{children}</li>,
                a: ({ href, children }) => (
                  <a href={href} target="_blank" rel="noopener noreferrer" className="underline opacity-80 hover:opacity-100">{children}</a>
                ),
              }}
            >
              {msg.content}
            </ReactMarkdown>
          )}
        </div>
        {msg.ui_action && !isUser && (
          <div className="w-full mt-1">
            <UiActionRenderer action={msg.ui_action} onDone={onAction} />
          </div>
        )}
        <span className="text-xs text-muted-foreground mt-1 px-1">
          {msg.timestamp.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
    </div>
  );
}

// ─── Chat Panel ───────────────────────────────────────────────────────────────

interface ChatPanelProps {
  onClose: () => void;
  fullPage?: boolean;
}

export function ChatPanel({ onClose, fullPage }: ChatPanelProps) {
  const { address } = useAccount();
  const { messages, isLoading, sendMessage, clearSession } = useChat();
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    setInput("");
    sendMessage(trimmed, address);
  };

  const handleAction = (result: string) => {
    sendMessage(`[UI]: ${result}`, address);
  };

  const SUGGESTIONS = [
    "Trade nào đang mở bán?",
    "Trade của tôi đang ở bước nào?",
    "Tôi muốn bán Safe của tôi",
    "Tôi muốn mua một Safe",
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className={cn(
        "flex items-center justify-between px-4 py-3 border-b bg-primary text-primary-foreground",
        fullPage ? "" : "rounded-t-2xl"
      )}>
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          <div>
            <p className="text-sm font-semibold">SafeExchange Assistant</p>
            <p className="text-xs opacity-75">
              {address
                ? `${address.slice(0, 6)}...${address.slice(-4)}`
                : "Chưa kết nối ví"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-primary-foreground hover:bg-primary-foreground/20"
            onClick={clearSession}
            title="Cuộc trò chuyện mới"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-primary-foreground hover:bg-primary-foreground/20"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 py-3">
        <div className={cn(fullPage ? "max-w-3xl mx-auto px-4" : "px-3")}>
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-8 text-center gap-4">
            <Bot className="h-10 w-10 text-muted-foreground/50" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Xin chào!</p>
              <p className="text-xs text-muted-foreground mt-1">
                Tôi có thể giúp bạn giao dịch, tra cứu trạng thái trade, và giải thích quy trình escrow.
              </p>
            </div>
            <div className="flex flex-col gap-2 w-full">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  className="text-xs text-left px-3 py-2 rounded-lg border border-dashed hover:bg-muted transition-colors"
                  onClick={() => sendMessage(s, address)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <MessageBubble key={msg.id} msg={msg} onAction={handleAction} />
            ))}
            {isLoading && (
              <div className="flex gap-2 mb-3">
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3 flex flex-col gap-1">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Đang tra cứu dữ liệu...</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </>
        )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t py-3">
        <div className={cn(fullPage ? "max-w-3xl mx-auto px-4" : "px-3", "flex gap-2")}>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder="Hỏi về trade, escrow, Safe..."
            className="text-sm rounded-full"
            disabled={isLoading}
          />
          <Button
            size="icon"
            className="rounded-full flex-shrink-0"
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className={cn(
          "text-xs text-muted-foreground text-center mt-2",
          fullPage ? "max-w-3xl mx-auto" : ""
        )}>
          Powered by Langflow · AI có thể mắc lỗi
        </p>
      </div>
    </div>
  );
}

// ─── Floating Widget ──────────────────────────────────────────────────────────

export function ChatWidget() {
  const [location, navigate] = useLocation();

  if (location === "/assistant") return null;

  return (
    <div className="fixed bottom-5 right-5 z-50">
      <Button
        size="icon"
        className="h-14 w-14 rounded-full shadow-lg"
        onClick={() => navigate("/assistant")}
        title="Trợ lý SafeExchange"
      >
        <MessageCircle className="h-6 w-6" />
      </Button>
    </div>
  );
}
