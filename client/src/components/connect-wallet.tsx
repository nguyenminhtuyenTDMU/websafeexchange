import { useState } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { Check, Copy, LogOut, Wallet } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { shortAddr } from "@/lib/format";

const btn = "inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-semibold transition-colors";

export function ConnectWallet() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const [copied, setCopied] = useState(false);

  if (isConnected && address) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" className={`${btn} border border-shell-foreground/25 font-mono text-shell-foreground hover:bg-shell-foreground/10`}>
            <span className="h-2 w-2 rounded-full bg-signal" aria-hidden />{shortAddr(address)}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => { navigator.clipboard.writeText(address); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
            {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
            {copied ? "Đã sao chép" : "Sao chép địa chỉ"}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => disconnect()}>
            <LogOut className="mr-2 h-4 w-4" />Ngắt kết nối
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <button type="button" onClick={() => connect({ connector: connectors[0] })} disabled={isPending}
      className={`${btn} bg-shell-foreground text-shell hover:bg-shell-foreground/90 disabled:opacity-60`}>
      <Wallet className="h-4 w-4" />{isPending ? "Đang kết nối…" : "Kết nối ví"}
    </button>
  );
}
