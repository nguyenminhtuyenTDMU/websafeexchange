import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="container mx-auto max-w-xl space-y-4 px-4 py-16 text-center">
      <h1 className="text-2xl font-bold">Không tìm thấy trang</h1>
      <Button asChild><Link href="/">Về trang chủ</Link></Button>
    </div>
  );
}
