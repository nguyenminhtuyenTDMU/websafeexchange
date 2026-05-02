import { useState, useRef, useEffect } from "react";
import { useAccount, useConnect } from "wagmi";
import { MessageCircle, X, Send, Loader2, Bot, RotateCcw, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useChat, type ChatMessage, type UiAction } from "@/hooks/use-chat";
import { useLocation } from "wouter";

// ─── UiAction Renderer ────────────────────────────────────────────────────────

const ACTION_LABELS: Record<string, string> = {
  sign_deposit: "💰 Ký quỹ ETH",
  sign_arm: "🔒 Kích hoạt trade",
  sign_release: "✅ Giải ngân",
  sign_cancel: "❌ Hủy trade",
  connect_wallet: "🔗 Kết nối ví",
  view_trade: "🔍 Xem trade",
  create_trade: "🆕 Tạo trade bán",
  join_trade: "🛒 Tham gia mua",
};

const ACTION_VARIANTS: Record<string, "default" | "destructive" | "outline" | "secondary"> = {
  sign_deposit: "default",
  sign_arm: "default",
  sign_release: "default",
  sign_cancel: "destructive",
  connect_wallet: "outline",
  view_trade: "secondary",
  create_trade: "default",
  join_trade: "default",
};

interface UiActionRendererProps {
  action: UiAction;
  onDone: (result: string) => void;
}

function UiActionRenderer({ action, onDone }: UiActionRendererProps) {
  const [, navigate] = useLocation();
  const { isConnected } = useAccount();
  const { connectAsync, connectors } = useConnect();
  const [pending, setPending] = useState(false);

  const handleClick = async () => {
    setPending(true);
    try {
      const tradeId = action.params?.tradeId;
      const actor = String(action.params?.actor ?? action.params?.role ?? "").toLowerCase();
      const openTrade = (side: "buy" | "sell", withAction = false) => {
        const query = new URLSearchParams();
        if (tradeId != null) query.set("tradeId", String(tradeId));
        if (withAction) query.set("action", action.type);
        navigate(`/transfer/${side}${query.toString() ? `?${query.toString()}` : ""}`);
      };

      if (action.type === "connect_wallet") {
        if (!isConnected) {
          const connector = connectors[0];
          if (!connector) throw new Error("No wallet connector is available");
          await connectAsync({ connector });
        }
        onDone("Wallet connected.");
        return;
      }

      if (action.type === "view_trade") {
        openTrade(actor === "seller" ? "sell" : "buy");
        onDone(tradeId ? `Opened trade #${tradeId}.` : "Opened trade page.");
        return;
      }

      if (action.type === "sign_deposit") {
        openTrade("buy", true);
        onDone(tradeId ? `Opened MetaMask action for trade #${tradeId}.` : "Opened MetaMask action.");
        return;
      }

      if (action.type === "sign_arm") {
        openTrade("sell", true);
        onDone(tradeId ? `Opened MetaMask action for trade #${tradeId}.` : "Opened MetaMask action.");
        return;
      }

      if (action.type === "sign_release") {
        openTrade(actor === "buyer" ? "buy" : "sell", true);
        onDone(tradeId ? `Opened MetaMask action for trade #${tradeId}.` : "Opened MetaMask action.");
        return;
      }

      if (action.type === "sign_cancel") {
        openTrade(actor === "buyer" ? "buy" : "sell", true);
        onDone(tradeId ? `Opened cancel action for trade #${tradeId}.` : "Opened cancel action.");
        return;
      }

      if (action.type === "create_trade") {
        const query = new URLSearchParams();
        if (action.params?.safeAddress) query.set("safeAddress", String(action.params.safeAddress));
        if (action.params?.priceEth) query.set("priceEth", String(action.params.priceEth));
        // Auto-trigger MetaMask signing when bot has all required params
        if (action.params?.safeAddress && action.params?.priceEth) {
          query.set("action", "create_trade");
        }
        navigate(`/transfer/sell${query.toString() ? `?${query.toString()}` : ""}`);
        onDone("Opened create trade page.");
        return;
      }

      if (action.type === "join_trade") {
        const query = new URLSearchParams();
        if (tradeId != null) query.set("tradeId", String(tradeId));
        query.set("action", "join_trade");
        navigate(`/transfer/buy${query.toString() ? `?${query.toString()}` : ""}`);
        onDone(tradeId ? `Opened trade #${tradeId} to join.` : "Opened buy page.");
        return;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Action failed.";
      onDone(message);
    } finally {
      setPending(false);
    }
  };

  return (
    <Button
      size="sm"
      variant={ACTION_VARIANTS[action.type] ?? "default"}
      className="mt-2 w-full justify-start gap-2"
      onClick={handleClick}
      disabled={pending}
    >
      {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
      {ACTION_LABELS[action.type] ?? action.type}
      {action.params?.tradeId ? (
        <Badge variant="outline" className="ml-auto text-xs">
          #{action.params.tradeId}
        </Badge>
      ) : null}
    </Button>
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
      <div className={cn("max-w-[85%]", isUser ? "items-end" : "items-start", "flex flex-col")}>
        <div
          className={cn(
            "rounded-2xl px-3 py-2 text-sm leading-relaxed",
            isUser
              ? "bg-primary text-primary-foreground rounded-tr-sm"
              : "bg-muted text-foreground rounded-tl-sm"
          )}
        >
          {msg.content}
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
}

export function ChatPanel({ onClose }: ChatPanelProps) {
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
      <div className="flex items-center justify-between px-4 py-3 border-b bg-primary text-primary-foreground rounded-t-2xl">
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
      <ScrollArea className="flex-1 px-3 py-3">
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
      </ScrollArea>

      {/* Input */}
      <div className="px-3 py-3 border-t">
        <div className="flex gap-2">
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
        <p className="text-xs text-muted-foreground text-center mt-2">
          Powered by Langflow · AI có thể mắc lỗi
        </p>
      </div>
    </div>
  );
}

// ─── Floating Widget ──────────────────────────────────────────────────────────

export function ChatWidget() {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
      {/* Chat panel */}
      <div
        className={cn(
          "transition-all duration-300 origin-bottom-right",
          open
            ? "opacity-100 scale-100 pointer-events-auto"
            : "opacity-0 scale-95 pointer-events-none"
        )}
      >
        <div className="w-[340px] h-[520px] rounded-2xl border shadow-2xl bg-background flex flex-col overflow-hidden">
          <ChatPanel onClose={() => setOpen(false)} />
        </div>
      </div>

      {/* Toggle button */}
      <Button
        size="icon"
        className="h-14 w-14 rounded-full shadow-lg"
        onClick={() => setOpen((v) => !v)}
        title="Trợ lý SafeExchange"
      >
        {open ? (
          <X className="h-6 w-6" />
        ) : (
          <MessageCircle className="h-6 w-6" />
        )}
      </Button>
    </div>
  );
}
