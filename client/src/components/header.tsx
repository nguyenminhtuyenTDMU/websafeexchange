import { Link, useLocation } from "wouter";
import { ConnectWallet } from "./connect-wallet";
import { ThemeToggle } from "./theme-toggle";
import { NotificationIndicator } from "./notification-indicator";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, Shield } from "lucide-react";
import { useState } from "react";

const navItems = [
  { href: "/transfer", label: "Chuyển nhượng" },
  { href: "/wallet-transparency", label: "Thông tin ví" },
  { href: "/evidence", label: "Bằng chứng" },
  { href: "/dashboard", label: "Bảng điều khiển" },
  { href: "/learn", label: "Hướng dẫn" },
  { href: "/legal", label: "Pháp lý" },
];

export function Header() {
  const [location] = useLocation();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between gap-4 px-4 md:px-8">
        <Link href="/" className="flex items-center gap-2" data-testid="link-logo">
          <Shield className="h-6 w-6 text-primary" />
          <span className="font-bold text-xl hidden sm:inline-block">SAFEEXCHANGE</span>
        </Link>

        <nav className="hidden lg:flex items-center gap-6">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`text-sm font-medium transition-colors hover:text-foreground ${
                location === item.href || location.startsWith(item.href + "/")
                  ? "text-foreground"
                  : "text-muted-foreground"
              }`}
              data-testid={`link-nav-${item.href.slice(1)}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <NotificationIndicator />
          <ThemeToggle />
          <ConnectWallet />
          
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild className="lg:hidden">
              <Button variant="ghost" size="icon" data-testid="button-mobile-menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px]">
              <nav className="flex flex-col gap-4 mt-8">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={`text-base font-medium py-2 transition-colors ${
                      location === item.href || location.startsWith(item.href + "/")
                        ? "text-foreground"
                        : "text-muted-foreground"
                    }`}
                    data-testid={`link-mobile-nav-${item.href.slice(1)}`}
                  >
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
