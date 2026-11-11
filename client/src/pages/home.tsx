import { Link, useLocation } from "wouter";
import { useState } from "react";
import { ArrowRight, Search, ShieldCheck, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const steps = [
  ["Niêm yết", "Người bán chọn người mua, giá, owner mới và danh sách tài sản chào bán. Hợp đồng kiểm tra ngay ví có giữ đủ tài sản."],
  ["Chuẩn bị ví", "Người bán bật hợp đồng ký quỹ làm module của ví và gỡ module, guard lạ. Trợ lý chỉ ra từng điều kiện chưa đạt."],
  ["Nạp tiền", "Người mua khai báo tài sản kỳ vọng và nạp tiền. Từ lúc này ví bị đóng băng: người bán động vào ví thì người mua được hủy."],
  ["Hoàn tất", "Hợp đồng tự đổi owner, kiểm tra ví sạch và tài sản còn đủ, rồi mới ghi có tiền cho người bán, tất cả trong một giao dịch."],
];

export default function Home() {
  const [, navigate] = useLocation();
  const [id, setId] = useState("");
  return (
    <div className="container mx-auto max-w-5xl space-y-10 px-4 py-10">
      <section className="space-y-4 text-center">
        <h1 className="text-3xl font-bold md:text-4xl">Mua bán quyền kiểm soát ví Safe, không cần trung gian</h1>
        <p className="mx-auto max-w-2xl text-muted-foreground">
          Tiền của người mua chỉ được giải ngân khi ví đã được bàn giao sạch: chỉ còn owner mới, không module, không guard,
          fallback handler hợp lệ và tài sản còn đúng như kỳ vọng. Mọi kiểm tra do hợp đồng thực hiện trên chuỗi.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button asChild><Link href="/sell"><Store className="mr-2 h-4 w-4" />Niêm yết ví</Link></Button>
          <Button asChild variant="outline"><Link href="/trades">Xem giao dịch đang mở<ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        {steps.map(([title, text], i) => (
          <Card key={title}>
            <CardHeader className="pb-2">
              <CardDescription>Bước {i + 1}</CardDescription>
              <CardTitle className="text-lg">{title}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">{text}</CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Search className="h-5 w-5" />Mở một giao dịch</CardTitle>
            <CardDescription>Nhập mã giao dịch để xem điều kiện, trợ lý bàn giao và thao tác.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (/^\d+$/.test(id)) navigate(`/trade/${id}`); }}>
              <Input value={id} onChange={(e) => setId(e.target.value)} placeholder="Mã giao dịch, ví dụ 1" inputMode="numeric" />
              <Button type="submit" disabled={!/^\d+$/.test(id)}>Mở</Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5" />Tự kiểm chứng</CardTitle>
            <CardDescription>
              Hợp đồng không có owner, không nâng cấp được, mã nguồn đã xác minh trên Etherscan. Trang này chỉ đọc dữ liệu từ chuỗi,
              không có máy chủ hay cơ sở dữ liệu.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline"><Link href="/history">Tra cứu lịch sử theo địa chỉ</Link></Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
