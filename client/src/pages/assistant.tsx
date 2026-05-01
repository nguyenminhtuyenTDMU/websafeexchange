import { useAccount } from "wagmi";
import { ChatPanel } from "@/components/chat-widget";

export default function Assistant() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-4">
      <div className="w-full max-w-xl h-[680px] rounded-2xl border shadow-lg bg-background flex flex-col overflow-hidden">
        <ChatPanel onClose={() => window.history.back()} />
      </div>
    </div>
  );
}
