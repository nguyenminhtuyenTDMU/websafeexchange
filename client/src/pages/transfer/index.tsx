import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Store, ShoppingCart } from "lucide-react";

export default function Transfer() {
  return (
    <div className="container px-4 md:px-8 py-12 md:py-16">
      <div className="max-w-3xl mx-auto text-center mb-12">
        <h1 className="text-3xl md:text-4xl font-bold mb-4">Chuyển nhượng Safe Wallet</h1>
        <p className="text-muted-foreground text-lg">
          Chọn vai trò của bạn để bắt đầu quy trình chuyển nhượng an toàn
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        <Card className="relative overflow-hidden hover:shadow-md transition-shadow">
          <CardHeader className="pb-4">
            <div className="h-16 w-16 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <Store className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Tôi muốn BÁN</CardTitle>
            <CardDescription>
              Đăng bán Safe wallet của bạn với giá ETH mong muốn
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">1.</span>
                Nhập địa chỉ Safe và giá bán
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">2.</span>
                Thiết lập Guard contract cho Safe
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">3.</span>
                Kích hoạt giao dịch khi có người mua
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">4.</span>
                Chuyển quyền sở hữu và nhận thanh toán
              </li>
            </ul>
            <Link href="/transfer/sell">
              <Button className="w-full" data-testid="button-transfer-sell">
                Bắt đầu bán Safe
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden hover:shadow-md transition-shadow">
          <CardHeader className="pb-4">
            <div className="h-16 w-16 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <ShoppingCart className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Tôi muốn MUA</CardTitle>
            <CardDescription>
              Tìm kiếm và mua Safe wallet từ người bán đã đăng ký
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">1.</span>
                Tìm đơn bán bằng địa chỉ Safe
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">2.</span>
                Kiểm tra thông tin minh bạch Safe
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">3.</span>
                Gửi ETH vào hợp đồng ký quỹ
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">4.</span>
                Nhận quyền sở hữu khi người bán hoàn tất
              </li>
            </ul>
            <Link href="/transfer/buy">
              <Button className="w-full" variant="outline" data-testid="button-transfer-buy">
                Tìm Safe để mua
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
