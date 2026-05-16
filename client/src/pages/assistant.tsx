import { ChatPanel } from "@/components/chat-widget";
import { useLocation } from "wouter";

export default function Assistant() {
  const [, navigate] = useLocation();

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <ChatPanel onClose={() => navigate("/")} fullPage />
    </div>
  );
}
