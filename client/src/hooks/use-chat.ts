import { useState, useCallback, useRef } from "react";

export type UiActionType =
  | "sign_deposit"
  | "sign_arm"
  | "sign_release"
  | "sign_cancel"
  | "connect_wallet"
  | "view_trade";

export interface UiAction {
  type: UiActionType;
  params?: {
    tradeId?: string | number;
    amount?: string;
    contract?: string;
    safeAddress?: string;
    url?: string;
    [key: string]: unknown;
  };
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  ui_action?: UiAction;
  timestamp: Date;
}

interface LangflowResponse {
  outputs?: Array<{
    outputs?: Array<{
      results?: {
        message?: {
          text?: string;
          data?: { text?: string };
        };
      };
      messages?: Array<{ message?: string; text?: string }>;
    }>;
  }>;
}

function extractText(raw: LangflowResponse): string {
  try {
    const out = raw?.outputs?.[0]?.outputs?.[0];
    return (
      out?.results?.message?.text ||
      out?.results?.message?.data?.text ||
      out?.messages?.[0]?.message ||
      out?.messages?.[0]?.text ||
      "Không có phản hồi."
    );
  } catch {
    return "Không có phản hồi.";
  }
}

function extractUiAction(text: string): { message: string; ui_action?: UiAction } {
  try {
    const jsonMatch = text.match(/```json\s*([\s\S]*?)```/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[1]);
      if (parsed.ui_action) {
        return { message: parsed.message ?? text, ui_action: parsed.ui_action };
      }
    }
    const parsed = JSON.parse(text);
    if (parsed.ui_action) {
      return { message: parsed.message ?? "", ui_action: parsed.ui_action };
    }
  } catch {
    // plain text
  }
  return { message: text };
}

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const sessionId = useRef<string>(crypto.randomUUID());

  const sendMessage = useCallback(
    async (content: string, walletAddress?: string) => {
      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: content,
            sessionId: sessionId.current,
            walletAddress,
          }),
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        const assistantMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data.message ?? "Xin lỗi, tôi gặp lỗi khi xử lý.",
          ui_action: data.ui_action,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } catch (err) {
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: "Không thể kết nối tới trợ lý. Vui lòng thử lại sau.",
            timestamp: new Date(),
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const clearSession = useCallback(() => {
    setMessages([]);
    sessionId.current = crypto.randomUUID();
  }, []);

  return { messages, isLoading, sessionId: sessionId.current, sendMessage, clearSession };
}
