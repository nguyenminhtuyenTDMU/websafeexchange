import { useEffect, useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Addr, Checklist, StatusBadge } from "@/components/common";
import { useEvents, useTrade } from "@/hooks/use-escrow-data";
import { useEscrowWrite } from "@/hooks/use-escrow-write";
import { completedChecks, describeAsset, fundedChecks, readinessChecks, sameAddr } from "@/lib/conditions";
import type { TradeData } from "@/lib/escrow";
import { explorerTx } from "@/lib/config";
import { dateTime, eth, isExpired } from "@/lib/format";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 py-2 sm:grid-cols-[180px_1fr] border-b last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="min-w-0 break-words">{children}</div>
    </div>
  );
}

function Terms({ t }: { t: TradeData }) {
  return (
    <Card>
      <CardHeader><CardTitle>Điều kiện giao dịch</CardTitle></CardHeader>
      <CardContent>
        <Row label="Ví Safe"><Addr a={t.wallet} full /></Row>
        <Row label="Người bán"><Addr a={t.seller} /></Row>
        <Row label="Người mua"><Addr a={t.buyer} /></Row>
        <Row label="Giá">{eth(t.price)}</Row>
        <Row label="Hạn chót">{dateTime(t.deadline)}{isExpired(t.deadline) && <span className="ml-2 text-red-600">(đã quá hạn)</span>}</Row>
        <Row label="Owner sau bàn giao">
          <div className="flex flex-col gap-1">{t.newOwners.map((o) => <Addr key={o} a={o} />)}</div>
        </Row>
        <Row label="Ngưỡng ký sau bàn giao">{t.threshold.toString()} / {t.newOwners.length}</Row>
        <Row label="Fallback handler chấp nhận"><Addr a={t.allowedFallbackHandler} /></Row>
        <Row label="Tài sản người bán chào">
          {t.assets.length ? <ul className="list-disc pl-5 text-sm">{t.assets.map((a, i) => <li key={i}>{describeAsset(a)}</li>)}</ul> : "Không kèm tài sản"}
        </Row>
        {(t.status === "FUNDED" || t.status === "COMPLETED") && (
          <Row label="Tài sản người mua kỳ vọng">
            {t.expectedAssets.length ? <ul className="list-disc pl-5 text-sm">{t.expectedAssets.map((a, i) => <li key={i}>{describeAsset(a)}</li>)}</ul> : "Chỉ mua ví, không kỳ vọng tài sản"}
          </Row>
        )}
        <Row label="termsHash"><span className="font-mono text-xs break-all">{t.termsHash}</span></Row>
      </CardContent>
    </Card>
  );
}

function Assistant({ t, role }: { t: TradeData; role: "seller" | "buyer" | "viewer" }) {
  if (t.status === "CANCELLED") return null;
  const checks = t.status === "OPEN" ? readinessChecks(t) : t.status === "FUNDED" ? fundedChecks(t) : completedChecks(t);
  const allOk = checks.every((c) => c.ok || c.pending);
  const title = t.status === "OPEN" ? "Trợ lý bàn giao: ví đã sẵn sàng chưa?"
    : t.status === "FUNDED" ? "Trợ lý bàn giao: có thể hoàn tất chưa?" : "Kiểm tra lại ví sau bàn giao";
  const hint = t.status === "OPEN"
    ? (role === "seller" ? "Làm theo hướng dẫn ở các mục chưa đạt. Trang tự cập nhật sau mỗi block." : "Người mua chỉ nạp được tiền khi mọi mục đều đạt.")
    : t.status === "FUNDED" ? "Từ lúc người mua nạp tiền, người bán không được thực hiện thêm giao dịch nào với ví."
    : "Đọc trực tiếp từ ví tại thời điểm hiện tại.";
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{hint} Nhãn T1–T10 là mã kịch bản tấn công tương ứng trong mô hình nguy cơ.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Alert className={allOk ? "border-green-600" : "border-red-600"}>
          <AlertDescription>{allOk ? "Tất cả điều kiện đều đạt." : "Còn điều kiện chưa đạt."}</AlertDescription>
        </Alert>
        <Checklist items={checks} />
      </CardContent>
    </Card>
  );
}

function Actions({ t, role }: { t: TradeData; role: "seller" | "buyer" | "viewer" }) {
  const { send, busy } = useEscrowWrite();
  const [picked, setPicked] = useState<boolean[]>([]);
  useEffect(() => setPicked(t.assets.map(() => true)), [t.assets.length]);

  const expired = isExpired(t.deadline);
  const readyOk = t.readinessMask === 0n && t.readinessAssetMask === 0n;
  const suspicious = t.currentNonce !== t.nonceAtFunding || t.handoverAssetMask !== 0n;
  const spin = (fn: string) => busy === fn && <Loader2 className="mr-2 h-4 w-4 animate-spin" />;
  const items: React.ReactNode[] = [];

  if (role === "buyer" && t.status === "OPEN") {
    const expected = t.assets.filter((_, i) => picked[i]);
    items.push(
      <div key="deposit" className="space-y-3">
        <p className="text-sm">Chọn tài sản bạn kỳ vọng nhận cùng ví. Hợp đồng sẽ đối chiếu đúng các tài sản này lúc giải ngân. Bỏ chọn hết nghĩa là chỉ mua ví.</p>
        {t.assets.map((a, i) => (
          <label key={i} className="flex items-center gap-2 text-sm">
            <Checkbox checked={picked[i] ?? true} onCheckedChange={(v) => setPicked((p) => p.map((x, j) => (j === i ? !!v : x)))} />
            {describeAsset(a)}
          </label>
        ))}
        <Button
          disabled={!readyOk || expired || !!busy}
          onClick={() => send("deposit", [t.id, t.termsHash, expected.map((a) => ({ checkerId: a.checkerId, token: a.token, value: a.value }))], t.price)}
        >
          {spin("deposit")}Nạp {eth(t.price)} và xác nhận điều kiện
        </Button>
        {!readyOk && <p className="text-sm text-muted-foreground">Ví chưa sẵn sàng, xem trợ lý bàn giao.</p>}
      </div>,
    );
  }
  if (t.status === "FUNDED") {
    items.push(
      <div key="finalize" className="space-y-2">
        <Button disabled={!!busy} onClick={() => send("finalizeHandover", [t.id])}>{spin("finalizeHandover")}Hoàn tất bàn giao</Button>
        <p className="text-sm text-muted-foreground">Ai gọi cũng được, kết quả do hợp đồng quyết định: ví chỉ được chuyển và tiền chỉ được giải ngân khi mọi điều kiện đều đạt.</p>
      </div>,
    );
  }
  if (role === "buyer" && (t.status === "OPEN" || (t.status === "FUNDED" && suspicious))) {
    items.push(
      <Button key="cb" variant="destructive" disabled={!!busy} onClick={() => send("cancelByBuyer", [t.id])}>
        {spin("cancelByBuyer")}{t.status === "FUNDED" ? "Hủy và lấy lại tiền" : "Hủy giao dịch"}
      </Button>,
    );
  }
  if (role === "seller" && (t.status === "OPEN" || t.status === "FUNDED")) {
    items.push(
      <Button key="cs" variant="destructive" disabled={!!busy} onClick={() => send("cancelBySeller", [t.id])}>
        {spin("cancelBySeller")}Hủy giao dịch{t.status === "FUNDED" ? " (hoàn tiền cho người mua)" : ""}
      </Button>,
    );
  }
  if (expired && (t.status === "OPEN" || t.status === "FUNDED")) {
    items.push(
      <Button key="ce" variant="outline" disabled={!!busy} onClick={() => send("cancelExpired", [t.id])}>
        {spin("cancelExpired")}Hủy giao dịch quá hạn
      </Button>,
    );
  }
  if (t.myCredit > 0n) {
    items.push(
      <Button key="w" disabled={!!busy} onClick={() => send("withdraw", [])}>{spin("withdraw")}Rút {eth(t.myCredit)}</Button>,
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Thao tác</CardTitle>
        <CardDescription>
          {role === "seller" ? "Bạn là người bán." : role === "buyer" ? "Bạn là người mua." : "Bạn đang xem với tư cách người ngoài."}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-start gap-4">
        {items.length ? items : <p className="text-sm text-muted-foreground">Không có thao tác nào cho bạn ở trạng thái này.</p>}
      </CardContent>
    </Card>
  );
}

export default function TradePage({ params }: { params: { id: string } }) {
  const id = /^\d+$/.test(params.id) ? BigInt(params.id) : null;
  const { address } = useAccount();
  const { data: t, isLoading, error } = useTrade(id);
  const { data: ev } = useEvents();
  const timeline = useMemo(() => ev?.trades.find((x) => x.id === id)?.events ?? [], [ev, id]);

  if (isLoading) return <div className="container mx-auto p-8"><Loader2 className="animate-spin" /></div>;
  if (error) return <div className="container mx-auto p-8 text-red-600">Không đọc được giao dịch: {String(error)}</div>;
  if (!t) return <div className="container mx-auto p-8">Không tìm thấy giao dịch #{params.id}.</div>;

  const role = sameAddr(address, t.seller) ? "seller" : sameAddr(address, t.buyer) ? "buyer" : "viewer";
  return (
    <div className="container mx-auto max-w-5xl space-y-6 px-4 py-8">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">Giao dịch #{t.id.toString()}</h1>
        <StatusBadge status={t.status} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Actions t={t} role={role} />
          <Terms t={t} />
        </div>
        <div className="space-y-6">
          <Assistant t={t} role={role} />
          <Card>
            <CardHeader><CardTitle>Lịch sử sự kiện</CardTitle></CardHeader>
            <CardContent>
              <ol className="space-y-2 text-sm">
                {timeline.map((e) => (
                  <li key={e.tx + e.kind}>
                    <a className="font-medium hover:underline" href={explorerTx(e.tx)} target="_blank" rel="noreferrer">{e.kind}</a>
                    <span className="text-muted-foreground"> · block {e.block.toString()}{e.detail ? ` · ${e.detail}` : ""}</span>
                  </li>
                ))}
                {!timeline.length && <li className="text-muted-foreground">Đang tải…</li>}
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
