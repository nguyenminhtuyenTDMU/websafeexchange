import { ExternalLink } from "lucide-react";
import { ESCROW, explorerAddress } from "@/lib/config";

export function Footer() {
  return (
    <footer className="border-t py-6">
      <div className="container flex flex-col gap-2 px-4 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between md:px-8">
        <p>CleanHandover – Đồ án tốt nghiệp, Trường Đại học Thủ Dầu Một. Không lưu ký tài sản, không máy chủ.</p>
        <div className="flex flex-wrap gap-4">
          <a href={`${explorerAddress(ESCROW)}#code`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-foreground">
            Mã nguồn hợp đồng (đã xác minh) <ExternalLink className="h-3 w-3" />
          </a>
          <a href="https://github.com/nguyenminhtuyenTDMU/websafeexchange" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-foreground">
            GitHub <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    </footer>
  );
}
