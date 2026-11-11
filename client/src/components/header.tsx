import { Link, useLocation } from "wouter";
import { useState } from "react";
import { Menu } from "lucide-react";
import { ConnectWallet } from "./connect-wallet";
import { ThemeToggle } from "./theme-toggle";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/trades", label: "Giao dịch đang mở" },
  { href: "/sell", label: "Niêm yết ví" },
  { href: "/history", label: "Tra cứu lịch sử" },
];

/** Dấu kiểm định: ô két với dấu tích, vẽ riêng cho CleanHandover. */
export function Mark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="none">
      <rect x="2.5" y="2.5" width="19" height="19" rx="5" stroke="currentColor" strokeWidth="2" />
      <path d="M7.5 12.5l3 3 6-7" stroke="hsl(var(--signal))" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Header() {
  const [location] = useLocation();
  const [open, setOpen] = useState(false);
  const active = (href: string) => location === href || location.startsWith(href + "/") || (href === "/trades" && location.startsWith("/trade/"));

  return (
    <header className="sticky top-0 z-50 bg-shell text-shell-foreground shadow-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <Mark className="h-6 w-6" />
            <span className="text-[17px]">CleanHandover</span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex" aria-label="Chính">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} aria-current={active(item.href) ? "page" : undefined}
                className={cn("rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  active(item.href) ? "bg-shell-foreground/10 text-shell-foreground" : "text-shell-muted hover:text-shell-foreground")}>
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden items-center gap-1.5 rounded-full border border-shell-foreground/20 px-2.5 py-1 text-xs text-shell-muted sm:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-signal" aria-hidden />Sepolia
          </span>
          <ThemeToggle />
          <ConnectWallet />
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button type="button" aria-label="Mở menu" className="rounded-md p-2 text-shell-foreground hover:bg-shell-foreground/10 md:hidden">
                <Menu className="h-5 w-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px]">
              <SheetTitle>CleanHandover</SheetTitle>
              <nav className="mt-6 flex flex-col gap-1" aria-label="Chính">
                {navItems.map((item) => (
                  <Link key={item.href} href={item.href} onClick={() => setOpen(false)} aria-current={active(item.href) ? "page" : undefined}
                    className={cn("rounded-md px-3 py-2.5 text-base font-medium", active(item.href) ? "bg-accent text-foreground" : "text-muted-foreground")}>
                    {item.label}
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
