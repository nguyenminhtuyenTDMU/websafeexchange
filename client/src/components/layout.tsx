import { useAccount, useSwitchChain } from "wagmi";
import { TriangleAlert } from "lucide-react";
import { Header } from "./header";
import { Footer } from "./footer";
import { CHAIN } from "@/lib/config";

/** Ví đang ở mạng khác: nói rõ và cho chuyển mạng một chạm. */
function WrongNetwork() {
  const { isConnected, chainId } = useAccount();
  const { switchChain, isPending } = useSwitchChain();
  if (!isConnected || chainId === CHAIN.id) return null;
  return (
    <div role="alert" className="border-b bg-warning/10">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5 text-sm">
        <TriangleAlert className="h-4 w-4 shrink-0 text-warning" aria-hidden />
        <span className="font-medium">Ví đang ở mạng khác, ứng dụng chạy trên {CHAIN.name}.</span>
        <button type="button" disabled={isPending} onClick={() => switchChain({ chainId: CHAIN.id })}
          className="rounded-md bg-warning px-2.5 py-1 text-xs font-semibold text-warning-foreground hover:bg-warning/90 disabled:opacity-60">
          {isPending ? "Đang chuyển…" : `Chuyển sang ${CHAIN.name}`}
        </button>
      </div>
    </div>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <WrongNetwork />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
