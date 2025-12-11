import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, ArrowRight, Lock, Eye, FileCheck, Zap, Users, CheckCircle2 } from "lucide-react";

const features = [
  {
    icon: Lock,
    title: "Guard Hợp đồng thông minh",
    description: "Khóa Safe wallet trong quá trình giao dịch, chỉ cho phép chuyển quyền sở hữu đúng người mua.",
  },
  {
    icon: Shield,
    title: "Cơ chế ký quỹ tự động",
    description: "Tiền được giữ trong hợp đồng thông minh, chỉ giải phóng khi hoàn tất chuyển nhượng.",
  },
  {
    icon: Eye,
    title: "Minh bạch hoàn toàn",
    description: "Kiểm tra thông tin Safe, lịch sử giao dịch và trạng thái guards trước khi giao dịch.",
  },
  {
    icon: FileCheck,
    title: "Thu thập bằng chứng",
    description: "Tạo và xác minh bằng chứng giao dịch với chữ ký số ECDSA.",
  },
];

const steps = [
  {
    step: 1,
    title: "Tạo đơn bán",
    description: "Người bán đăng ký bán Safe wallet với giá và thời hạn",
  },
  {
    step: 2,
    title: "Người mua tham gia",
    description: "Người mua xác nhận muốn mua và kiểm tra thông tin Safe",
  },
  {
    step: 3,
    title: "Kích hoạt giao dịch",
    description: "Người bán kích hoạt giao dịch trên hợp đồng thông minh, Safe bị khóa",
  },
  {
    step: 4,
    title: "Gửi tiền ký quỹ",
    description: "Người mua gửi ETH vào hợp đồng ký quỹ",
  },
  {
    step: 5,
    title: "Chuyển quyền sở hữu",
    description: "Người bán chuyển quyền sở hữu, Guard xác minh và giải phóng tiền",
  },
];

export default function Home() {
  return (
    <div className="flex flex-col">
      <section className="relative overflow-hidden bg-gradient-to-b from-background to-muted/30 py-24 md:py-32">
        <div className="container px-4 md:px-8">
          <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
            <Badge variant="secondary" className="mb-6">
              <Zap className="mr-1 h-3 w-3" />
              Phi tập trung - Mã nguồn mở
            </Badge>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
              Chuyển nhượng Safe Wallet{" "}
              <span className="text-primary">An toàn</span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl">
              Nền tảng Web3 giúp bạn mua bán quyền sở hữu ví Gnosis Safe một cách an toàn 
              với cơ chế Guard hợp đồng thông minh và ký quỹ tự động.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/transfer/sell">
                <Button size="lg" className="w-full sm:w-auto" data-testid="button-hero-sell">
                  Tôi muốn BÁN Safe
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/transfer/buy">
                <Button size="lg" variant="outline" className="w-full sm:w-auto" data-testid="button-hero-buy">
                  Tôi muốn MUA Safe
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
        
        <div className="absolute inset-0 -z-10 h-full w-full bg-[linear-gradient(to_right,hsl(var(--border))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border))_1px,transparent_1px)] bg-[size:6rem_4rem] opacity-20" />
      </section>

      <section className="py-16 md:py-24">
        <div className="container px-4 md:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Tại sao chọn SAFEEXCHANGE?</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Giải pháp toàn diện cho việc chuyển nhượng quyền sở hữu Safe wallet với bảo mật cao nhất.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature) => (
              <Card key={feature.title} className="relative overflow-hidden">
                <CardHeader>
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-muted/30">
        <div className="container px-4 md:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Quy trình giao dịch</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              5 bước đơn giản để hoàn tất chuyển nhượng Safe wallet an toàn.
            </p>
          </div>
          
          <div className="max-w-4xl mx-auto">
            <div className="relative">
              <div className="absolute left-8 top-0 bottom-0 w-px bg-border hidden md:block" />
              
              <div className="space-y-8">
                {steps.map((item, index) => (
                  <div key={item.step} className="relative flex gap-6 items-start">
                    <div className="flex-shrink-0 h-16 w-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xl z-10">
                      {item.step}
                    </div>
                    <div className="pt-3">
                      <h3 className="font-semibold text-lg mb-1">{item.title}</h3>
                      <p className="text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="container px-4 md:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-6">
                Bảo vệ bạn khỏi gian lận
              </h2>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <CheckCircle2 className="h-6 w-6 text-success flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold">Khóa mềm Guard</h4>
                    <p className="text-sm text-muted-foreground">
                      Người bán không thể thực hiện bất kỳ giao dịch nào khác ngoài chuyển quyền đến người mua.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <CheckCircle2 className="h-6 w-6 text-success flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold">Ký quỹ tự động</h4>
                    <p className="text-sm text-muted-foreground">
                      Tiền chỉ được giải phóng cho người bán sau khi người mua trở thành chủ sở hữu.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <CheckCircle2 className="h-6 w-6 text-success flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold">Bảo vệ hết hạn</h4>
                    <p className="text-sm text-muted-foreground">
                      Người mua có thể hủy và nhận lại tiền nếu người bán không hoàn tất đúng hạn.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <CheckCircle2 className="h-6 w-6 text-success flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold">Chống gian lận</h4>
                    <p className="text-sm text-muted-foreground">
                      Mọi hành vi gian lận sẽ bị phát hiện và giao dịch tự động hủy.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <Card className="p-8">
              <div className="flex items-center gap-4 mb-6">
                <Users className="h-10 w-10 text-primary" />
                <div>
                  <h3 className="font-bold text-2xl">Bắt đầu ngay</h3>
                  <p className="text-muted-foreground">Kết nối ví để bắt đầu</p>
                </div>
              </div>
              <div className="space-y-3">
                <Link href="/transfer/sell" className="block">
                  <Button className="w-full justify-between" variant="outline" data-testid="button-cta-sell">
                    Đăng bán Safe wallet
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/transfer/buy" className="block">
                  <Button className="w-full justify-between" variant="outline" data-testid="button-cta-buy">
                    Tìm kiếm Safe để mua
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/learn" className="block">
                  <Button className="w-full justify-between" variant="ghost" data-testid="button-cta-learn">
                    Tìm hiểu thêm về quy trình
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
