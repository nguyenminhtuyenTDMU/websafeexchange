import { Shield, ExternalLink } from "lucide-react";
import { Link, useLocation } from "wouter";

const HIDDEN_ROUTES = ["/assistant"];

export function Footer() {
  const [location] = useLocation();
  if (HIDDEN_ROUTES.includes(location)) return null;

  return (
    <footer className="border-t bg-card">
      <div className="container px-4 md:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <span className="font-bold">SAFEEXCHANGE</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Nền tảng chuyển nhượng quyền sở hữu ví Gnosis Safe an toàn với cơ chế ký quỹ và Guard hợp đồng thông minh.
            </p>
          </div>

          <div className="space-y-4">
            <h4 className="font-semibold text-sm">Sản phẩm</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/transfer/sell" className="hover:text-foreground transition-colors" data-testid="link-footer-sell">
                  Bán Safe
                </Link>
              </li>
              <li>
                <Link href="/transfer/buy" className="hover:text-foreground transition-colors" data-testid="link-footer-buy">
                  Mua Safe
                </Link>
              </li>
              <li>
                <Link href="/wallet-transparency" className="hover:text-foreground transition-colors" data-testid="link-footer-transparency">
                  Minh bạch ví
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-4">
            <h4 className="font-semibold text-sm">Cộng đồng</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/forum" className="hover:text-foreground transition-colors" data-testid="link-footer-forum">
                  Diễn đàn
                </Link>
              </li>
              <li>
                <Link href="/forum#buy" className="hover:text-foreground transition-colors" data-testid="link-footer-forum-buy">
                  Tìm mua ví
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-foreground transition-colors" data-testid="link-footer-dashboard">
                  Bảng điều khiển
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-4">
            <h4 className="font-semibold text-sm">Liên kết</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/forum#qa" className="hover:text-foreground transition-colors" data-testid="link-footer-qa">
                  Q&amp;A
                </Link>
              </li>
              <li>
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground transition-colors inline-flex items-center gap-1"
                  data-testid="link-footer-github"
                >
                  Mã nguồn mở
                  <ExternalLink className="h-3 w-3" />
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t mt-8 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>SAFEEXCHANGE - Đồ án tốt nghiệp. Phi tập trung, không lưu trữ tài sản người dùng.</p>
          <div className="flex items-center gap-4">
            <span className="font-mono text-xs bg-muted px-2 py-1 rounded">
              v1.0.0
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
