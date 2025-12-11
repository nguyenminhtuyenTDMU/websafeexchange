import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Scale, Shield, AlertTriangle, FileText, ExternalLink } from "lucide-react";

export default function Legal() {
  return (
    <div className="container px-4 md:px-8 py-8 md:py-12">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Scale className="h-8 w-8 text-primary" />
            <h1 className="text-2xl md:text-3xl font-bold">Thông tin pháp lý</h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Điều khoản sử dụng, miễn trừ trách nhiệm và các thông tin pháp lý quan trọng
          </p>
          <div className="flex items-center gap-2 mt-4">
            <Badge variant="outline">Cập nhật: 11/12/2025</Badge>
            <Badge variant="secondary">Version 1.0</Badge>
          </div>
        </div>

        <div className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Giới thiệu về SAFEEXCHANGE
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none dark:prose-invert">
              <p>
                SAFEEXCHANGE là một nền tảng phần mềm mã nguồn mở được phát triển như đồ án tốt nghiệp, 
                nhằm mục đích tạo điều kiện cho việc chuyển nhượng quyền sở hữu ví Gnosis Safe một cách 
                an toàn thông qua cơ chế Guard hợp đồng thông minh và ký quỹ tự động.
              </p>
              <p>
                Nền tảng hoạt động hoàn toàn phi tập trung trên blockchain Ethereum, sử dụng smart contract 
                để thực thi các điều khoản giao dịch mà không cần bên trung gian.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Điều khoản sử dụng
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none dark:prose-invert">
              <h4>1. Chấp nhận điều khoản</h4>
              <p>
                Bằng việc sử dụng SAFEEXCHANGE, bạn đồng ý với tất cả các điều khoản và điều kiện được 
                nêu trong tài liệu này. Nếu bạn không đồng ý, vui lòng không sử dụng nền tảng.
              </p>

              <h4>2. Tính chất của dịch vụ</h4>
              <p>
                SAFEEXCHANGE cung cấp giao diện người dùng để tương tác với smart contract trên blockchain. 
                Chúng tôi:
              </p>
              <ul>
                <li>Không lưu trữ, kiểm soát hoặc có quyền truy cập vào tài sản số của bạn</li>
                <li>Không thực hiện chức năng của sàn giao dịch hoặc tổ chức tài chính</li>
                <li>Không cung cấp dịch vụ lưu ký (custody)</li>
                <li>Không đóng vai trò trung gian trong các giao dịch</li>
              </ul>

              <h4>3. Trách nhiệm của người dùng</h4>
              <p>Bạn có trách nhiệm:</p>
              <ul>
                <li>Bảo mật private key và seed phrase của mình</li>
                <li>Xác minh thông tin giao dịch trước khi ký</li>
                <li>Hiểu rõ rủi ro khi tương tác với smart contract</li>
                <li>Tuân thủ pháp luật địa phương về tiền điện tử</li>
              </ul>

              <h4>4. Hạn chế sử dụng</h4>
              <p>Bạn không được sử dụng SAFEEXCHANGE để:</p>
              <ul>
                <li>Thực hiện các hoạt động bất hợp pháp</li>
                <li>Rửa tiền hoặc tài trợ khủng bố</li>
                <li>Lừa đảo hoặc gian lận người dùng khác</li>
                <li>Can thiệp vào hoạt động của hệ thống</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-warning" />
                Miễn trừ trách nhiệm
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none dark:prose-invert">
              <h4>1. Rủi ro công nghệ</h4>
              <p>
                Smart contract và blockchain là công nghệ mới và có thể chứa lỗi chưa được phát hiện. 
                Chúng tôi không đảm bảo phần mềm hoạt động không có lỗi.
              </p>

              <h4>2. Rủi ro tài chính</h4>
              <p>
                Giao dịch tiền điện tử có rủi ro cao. Giá trị tài sản có thể biến động mạnh. 
                Bạn có thể mất toàn bộ vốn đầu tư. Chỉ giao dịch với số tiền bạn có thể chấp nhận mất.
              </p>

              <h4>3. Không có bảo đảm</h4>
              <p>
                SAFEEXCHANGE được cung cấp "như hiện tại" (as-is) mà không có bất kỳ bảo đảm nào, 
                dù rõ ràng hay ngụ ý. Chúng tôi không chịu trách nhiệm về:
              </p>
              <ul>
                <li>Mất mát tài sản do lỗi phần mềm hoặc smart contract</li>
                <li>Giao dịch thất bại hoặc bị hoàn tác</li>
                <li>Thiệt hại gián tiếp hoặc hậu quả</li>
                <li>Hành vi của bên thứ ba</li>
              </ul>

              <h4>4. Giới hạn trách nhiệm</h4>
              <p>
                Trong mọi trường hợp, trách nhiệm của chúng tôi đối với bạn sẽ không vượt quá 
                số tiền bạn đã thanh toán cho chúng tôi (nếu có) trong 12 tháng trước đó.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quyền sở hữu trí tuệ</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none dark:prose-invert">
              <p>
                SAFEEXCHANGE là phần mềm mã nguồn mở, được phát hành theo giấy phép MIT. 
                Bạn được quyền:
              </p>
              <ul>
                <li>Sử dụng phần mềm cho mục đích cá nhân hoặc thương mại</li>
                <li>Sao chép, sửa đổi và phân phối mã nguồn</li>
                <li>Tích hợp vào dự án khác</li>
              </ul>
              <p>
                Với điều kiện giữ nguyên thông báo bản quyền và giấy phép trong các bản sao.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quyền riêng tư và dữ liệu</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none dark:prose-invert">
              <p>
                SAFEEXCHANGE tôn trọng quyền riêng tư của bạn:
              </p>
              <ul>
                <li>Chúng tôi không thu thập thông tin cá nhân</li>
                <li>Địa chỉ ví là dữ liệu công khai trên blockchain</li>
                <li>Không có cookies theo dõi hoặc phân tích</li>
                <li>Dữ liệu giao dịch được lưu trữ công khai trên blockchain</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Liên hệ</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none dark:prose-invert">
              <p>
                Đây là đồ án tốt nghiệp được phát triển cho mục đích học tập và nghiên cứu. 
                Mã nguồn có sẵn trên GitHub.
              </p>
              <p>
                Nếu bạn phát hiện lỗi bảo mật, vui lòng báo cáo qua GitHub Issues hoặc 
                liên hệ trực tiếp với nhà phát triển.
              </p>
            </CardContent>
          </Card>

          <Separator />

          <div className="text-center text-sm text-muted-foreground py-4">
            <p>
              Bằng việc sử dụng SAFEEXCHANGE, bạn xác nhận đã đọc, hiểu và đồng ý với 
              tất cả các điều khoản trên.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
