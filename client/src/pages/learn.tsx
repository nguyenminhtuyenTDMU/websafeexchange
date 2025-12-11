import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { 
  BookOpen, 
  Shield, 
  Lock, 
  Users, 
  ArrowRight, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle,
  FileCheck,
  Wallet,
  Clock,
  Zap
} from "lucide-react";

const tradeFlowSteps = [
  {
    id: 1,
    title: "Người bán tạo đơn bán",
    description: "Người bán đăng ký bán Safe wallet với thông tin: địa chỉ Safe, giá ETH mong muốn và thời hạn giao dịch.",
    icon: Wallet,
    role: "seller",
  },
  {
    id: 2,
    title: "Người mua tham gia giao dịch",
    description: "Người mua tìm đơn bán và xác nhận muốn mua. Tại bước này, người mua nên kiểm tra kỹ thông tin Safe qua trang Minh bạch ví.",
    icon: Users,
    role: "buyer",
  },
  {
    id: 3,
    title: "Người bán cài đặt Guard và kích hoạt",
    description: "Người bán thiết lập Guard contract cho Safe và kích hoạt giao dịch trên blockchain. Từ lúc này, Safe bị khóa - chỉ cho phép chuyển quyền đến người mua.",
    icon: Shield,
    role: "seller",
  },
  {
    id: 4,
    title: "Người mua gửi ký quỹ ETH",
    description: "Người mua gửi ETH vào hợp đồng ký quỹ. Tiền được giữ an toàn và chỉ giải phóng khi hoàn tất chuyển quyền sở hữu.",
    icon: Lock,
    role: "buyer",
  },
  {
    id: 5,
    title: "Người bán chuyển quyền sở hữu",
    description: "Người bán thực hiện chuyển quyền trong Safe App để chuyển quyền sở hữu cho người mua. Guard xác minh và tự động giải phóng ETH cho người bán.",
    icon: CheckCircle2,
    role: "seller",
  },
];

const scamWarnings = [
  {
    title: "Giả mạo website",
    description: "Luôn kiểm tra URL chính xác. Không truy cập link từ nguồn không tin cậy.",
    icon: AlertTriangle,
  },
  {
    title: "Giao dịch ngoài hệ thống",
    description: "Không bao giờ gửi ETH trực tiếp cho người bán mà không qua hợp đồng ký quỹ.",
    icon: XCircle,
  },
  {
    title: "Yêu cầu private key",
    description: "SAFEEXCHANGE không bao giờ yêu cầu private key hay seed phrase của bạn.",
    icon: Shield,
  },
  {
    title: "Giả mạo giao dịch",
    description: "Luôn xác minh nội dung giao dịch trong ví trước khi ký. Đọc kỹ function được gọi.",
    icon: FileCheck,
  },
];

const faqs = [
  {
    question: "Guard contract là gì?",
    answer: "Guard là một hợp đồng thông minh được cài đặt vào Safe wallet để kiểm soát các giao dịch. Trong SAFEEXCHANGE, Guard đảm bảo rằng người bán chỉ có thể thực hiện chuyển quyền đến đúng người mua, không thể thực hiện các giao dịch khác khi giao dịch đang hoạt động.",
  },
  {
    question: "Điều gì xảy ra nếu người bán không hoàn tất đúng hạn?",
    answer: "Nếu người bán không thực hiện chuyển quyền trước hạn, bất kỳ ai cũng có thể hủy giao dịch. Giao dịch sẽ bị hủy và người mua được hoàn lại 100% ETH đã gửi ký quỹ.",
  },
  {
    question: "Làm sao để biết Safe an toàn trước khi mua?",
    answer: "Sử dụng trang Minh bạch ví để kiểm tra: danh sách owners hiện tại, các modules đã cài đặt, guard đang hoạt động, và lịch sử giao dịch của Safe.",
  },
  {
    question: "Tiền của tôi được bảo vệ như thế nào?",
    answer: "ETH được giữ trong hợp đồng ký quỹ - không ai có thể rút trừ khi điều kiện được đáp ứng. Người bán chỉ nhận tiền khi người mua trở thành chủ sở hữu. Người mua được hoàn tiền nếu giao dịch bị hủy.",
  },
  {
    question: "Tại sao cần thu thập bằng chứng?",
    answer: "Bằng chứng số với chữ ký ECDSA giúp xác minh các thỏa thuận và giao dịch. Nếu có tranh chấp, bằng chứng có thể được sử dụng để chứng minh cam kết của các bên.",
  },
  {
    question: "SAFEEXCHANGE có lưu trữ tài sản của tôi không?",
    answer: "Không. SAFEEXCHANGE là nền tảng phi tập trung. Chúng tôi không lưu trữ ETH hay có quyền kiểm soát Safe của bạn. Tất cả đều được xử lý bởi smart contract trên blockchain.",
  },
];

export default function Learn() {
  const [simulatedStep, setSimulatedStep] = useState(0);

  const simulateNextStep = () => {
    setSimulatedStep((prev) => (prev < 4 ? prev + 1 : 0));
  };

  return (
    <div className="container px-4 md:px-8 py-8 md:py-12">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="h-8 w-8 text-primary" />
            <h1 className="text-2xl md:text-3xl font-bold">Hướng dẫn sử dụng</h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Tìm hiểu về quy trình giao dịch, cách bảo vệ bản thân và các khái niệm quan trọng
          </p>
        </div>

        <section className="mb-12">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Quy trình giao dịch
          </h2>
          
          <div className="space-y-4">
            {tradeFlowSteps.map((step, index) => (
              <Card key={step.id} className="relative">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className={`h-12 w-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                      step.role === "seller" ? "bg-primary/10" : "bg-info/10"
                    }`}>
                      <step.icon className={`h-6 w-6 ${
                        step.role === "seller" ? "text-primary" : "text-info"
                      }`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline">{step.id}</Badge>
                        <Badge variant={step.role === "seller" ? "default" : "secondary"}>
                          {step.role === "seller" ? "Người bán" : "Người mua"}
                        </Badge>
                      </div>
                      <h3 className="font-semibold mb-1">{step.title}</h3>
                      <p className="text-sm text-muted-foreground">{step.description}</p>
                    </div>
                  </div>
                </CardContent>
                {index < tradeFlowSteps.length - 1 && (
                  <div className="absolute left-10 -bottom-4 h-8 w-px bg-border z-10" />
                )}
              </Card>
            ))}
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Mô phỏng giao dịch
          </h2>
          
          <Card>
            <CardHeader>
              <CardTitle>Trải nghiệm quy trình ký giao dịch</CardTitle>
              <CardDescription>
                Thực hành các bước ký giao dịch để hiểu rõ hơn trước khi thực hiện thật
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                {[0, 1, 2, 3, 4].map((step) => (
                  <div
                    key={step}
                    className={`h-10 w-10 rounded-full flex items-center justify-center font-semibold text-sm transition-colors ${
                      step <= simulatedStep
                        ? "bg-primary text-primary-foreground"
                        : "bg-background border-2 border-border text-muted-foreground"
                    }`}
                  >
                    {step < simulatedStep ? <CheckCircle2 className="h-5 w-5" /> : step + 1}
                  </div>
                ))}
              </div>

              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>
                  {simulatedStep === 0 && "Bước 1: Kết nối ví"}
                  {simulatedStep === 1 && "Bước 2: Xem xét giao dịch"}
                  {simulatedStep === 2 && "Bước 3: Kiểm tra chi tiết"}
                  {simulatedStep === 3 && "Bước 4: Ký giao dịch"}
                  {simulatedStep === 4 && "Hoàn tất!"}
                </AlertTitle>
                <AlertDescription>
                  {simulatedStep === 0 && "Đây là nơi bạn sẽ thấy popup kết nối ví. KHÔNG BAO GIỜ chia sẻ private key."}
                  {simulatedStep === 1 && "Luôn đọc kỹ nội dung giao dịch trước khi approve. Kiểm tra địa chỉ và số tiền."}
                  {simulatedStep === 2 && "Xác minh hàm được gọi (ví dụ: chuyển quyền, gửi ký quỹ). Đừng ký nếu không hiểu."}
                  {simulatedStep === 3 && "Chỉ ký khi bạn chắc chắn về nội dung. Một khi ký rồi không thể hoàn tác."}
                  {simulatedStep === 4 && "Giao dịch đã được gửi lên blockchain. Chờ xác nhận và kiểm tra kết quả."}
                </AlertDescription>
              </Alert>

              <Button onClick={simulateNextStep} className="w-full" data-testid="button-simulate-step">
                {simulatedStep < 4 ? (
                  <>
                    Tiếp tục
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                ) : (
                  "Bắt đầu lại"
                )}
              </Button>
            </CardContent>
          </Card>
        </section>

        <section className="mb-12">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Cảnh báo lừa đảo
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {scamWarnings.map((warning) => (
              <Card key={warning.title} className="border-warning/50">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <warning.icon className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold mb-1">{warning.title}</h4>
                      <p className="text-sm text-muted-foreground">{warning.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Câu hỏi thường gặp
          </h2>
          
          <Card>
            <CardContent className="pt-6">
              <Accordion type="single" collapsible className="w-full">
                {faqs.map((faq, index) => (
                  <AccordionItem key={index} value={`item-${index}`}>
                    <AccordionTrigger className="text-left" data-testid={`faq-${index}`}>
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
