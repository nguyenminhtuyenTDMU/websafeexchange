import { Link, useLocation } from "wouter";
import { useState } from "react";
import { Menu, Shield } from "lucide-react";
import { ConnectWallet } from "./connect-wallet";
import { ThemeToggle } from "./theme-toggle";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const navItems = [
  { href: "/sell", label: "Niêm yết ví" },
  { href: "/trades", label: "Giao dịch đang mở" },
  { href: "/history", label: "Tra cứu lịch sử" },
];

export function Header() {
  const [location] = useLocation();
  const [open, setOpen] = useState(false);
  const active = (href: string) => location === href || location.startsWith(href + "/");

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between gap-4 px-4 md:px-8">
        <Link href="/" className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" />
          <span className="hidden text-xl font-bold sm:inline-block">CleanHandover</span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}
              className={`text-sm font-medium transition-colors hover:text-foreground ${active(item.href) ? "text-foreground" : "text-muted-foreground"}`}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <ConnectWallet />
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon" aria-label="Menu"><Menu className="h-5 w-5" /></Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px]">
              <SheetTitle>CleanHandover</SheetTitle>
              <nav className="mt-6 flex flex-col gap-4">
                {navItems.map((item) => (
                  <Link key={item.href} href={item.href} onClick={() => setOpen(false)}
                    className={`py-2 text-base font-medium ${active(item.href) ? "text-foreground" : "text-muted-foreground"}`}>
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
