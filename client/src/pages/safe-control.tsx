import { useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Copy,
  ExternalLink,
  FileSignature,
  Loader2,
  PlusCircle,
  RefreshCw,
  Send,
  Shield,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useSafeControlPanel } from "@/hooks/use-safe-control-panel";
import {
  formatSafeControlAddress,
  getSafeControlChains,
  isValidEthAddress,
  type SafeTransactionStatus,
} from "@/lib/safe-control-panel";

const STATUS_BADGE: Record<SafeTransactionStatus, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  waiting_signatures: { label: "Chờ ký", variant: "secondary" },
  ready_to_execute: { label: "Sẵn sàng", variant: "default" },
  executed: { label: "Đã thực thi", variant: "outline" },
  failed: { label: "Thất bại", variant: "destructive" },
};


function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="ml-1 text-muted-foreground hover:text-foreground transition-colors"
      onClick={() => {
        navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

function splitOwners(input: string): string[] {
  return input.split(/[\n,]+/).map((o) => o.trim()).filter(Boolean);
}

// ─── New Transaction Form ────────────────────────────────────────────────────

function parseEthToWei(value: string): string {
  const normalized = value.trim() || "0";
  if (!/^\d+(\.\d{0,18})?$/.test(normalized)) {
    throw new Error("So ETH khong hop le");
  }
  const [whole, fraction = ""] = normalized.split(".");
  return `${whole}${fraction.padEnd(18, "0")}`.replace(/^0+(?=\d)/, "");
}

function NewTransactionForm({
  onPropose,
  isActioning,
}: {
  onPropose: (input: { to: string; value: string; data: string }) => Promise<unknown>;
  isActioning: boolean;
}) {
  const [to, setTo] = useState("");
  const [ethValue, setEthValue] = useState("0");
  const [data, setData] = useState("0x");
  const [formErr, setFormErr] = useState<string | null>(null);

  const handleSubmit = async () => {
    setFormErr(null);
    if (!isValidEthAddress(to)) { setFormErr("Địa chỉ không hợp lệ"); return; }
    try {
      const valueWei = parseEthToWei(ethValue);
      await onPropose({ to, value: valueWei, data: data || "0x" });
      setTo(""); setEthValue("0"); setData("0x");
    } catch (err: any) {
      setFormErr(err.message || "Không thể đề xuất giao dịch");
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="tx-to">Địa chỉ nhận</Label>
          <Input id="tx-to" className="font-mono" placeholder="0x..." value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tx-value">Số ETH</Label>
          <Input id="tx-value" type="number" min="0" step="0.0001" placeholder="0.0" value={ethValue} onChange={(e) => setEthValue(e.target.value)} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="tx-data">Call data (hex)</Label>
        <Input id="tx-data" className="font-mono text-xs" placeholder="0x" value={data} onChange={(e) => setData(e.target.value)} />
        <p className="text-xs text-muted-foreground">Để 0x nếu chỉ chuyển ETH.</p>
      </div>
      {formErr && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{formErr}</AlertDescription>
        </Alert>
      )}
      <Button onClick={handleSubmit} disabled={isActioning} className="gap-2">
        {isActioning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        Đề xuất giao dịch
      </Button>
    </div>
  );
}

// ─── Create / Deploy Safe Form ───────────────────────────────────────────────

function CreateSafeForm({
  address,
  chainId,
  onDeploy,
  isDeploying,
}: {
  address?: string;
  chainId: number;
  onDeploy: (input: { owners: string[]; threshold: number }) => Promise<{ address: string }>;
  isDeploying: boolean;
}) {
  const chains = getSafeControlChains();
  const [ownersInput, setOwnersInput] = useState(address ?? "");
  const [thresholdInput, setThresholdInput] = useState("1");
  const [formErr, setFormErr] = useState<string | null>(null);
  const [deployed, setDeployed] = useState<string | null>(null);

  const owners = useMemo(() => splitOwners(ownersInput), [ownersInput]);
  const invalidOwner = useMemo(() => owners.find((o) => !isValidEthAddress(o)), [owners]);

  const handleDeploy = async () => {
    setFormErr(null);
    if (invalidOwner) { setFormErr(`Owner không hợp lệ: ${invalidOwner}`); return; }
    if (owners.length === 0) { setFormErr("Cần ít nhất một owner"); return; }
    const threshold = Number(thresholdInput);
    if (threshold < 1 || threshold > owners.length) { setFormErr("Threshold phải từ 1 đến số lượng owner"); return; }
    try {
      const result = await onDeploy({ owners, threshold });
      setDeployed(result.address);
    } catch (err: any) {
      setFormErr(err.message || "Deploy thất bại");
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-[1fr_160px_200px]">
        <div className="space-y-2">
          <Label htmlFor="create-owners">Địa chỉ owner</Label>
          <Textarea
            id="create-owners"
            className="font-mono min-h-[100px]"
            placeholder="0x... (mỗi dòng hoặc cách nhau bằng dấu phẩy)"
            value={ownersInput}
            onChange={(e) => setOwnersInput(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            {owners.length > 0 ? `${owners.length} owner` : "Nhập địa chỉ owner"}
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="create-threshold">Ngưỡng ký</Label>
          <Input
            id="create-threshold"
            type="number"
            min="1"
            max={owners.length || 1}
            value={thresholdInput}
            onChange={(e) => setThresholdInput(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">/{owners.length || "?"} owner</p>
        </div>
        <div className="space-y-2">
          <Label>Mạng</Label>
          <Select value={String(chainId)} disabled>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(chains).map(([id, chain]) => (
                <SelectItem key={id} value={id}>{chain.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {invalidOwner && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Địa chỉ owner không hợp lệ</AlertTitle>
          <AlertDescription>{invalidOwner}</AlertDescription>
        </Alert>
      )}
      {formErr && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{formErr}</AlertDescription>
        </Alert>
      )}

      <Button onClick={handleDeploy} disabled={isDeploying || !!invalidOwner} className="gap-2">
        {isDeploying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
        {isDeploying ? "Đang deploy..." : "Deploy Safe"}
      </Button>

      {deployed && (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>Deploy thành công!</AlertTitle>
          <AlertDescription className="flex items-center gap-2 font-mono text-sm">
            {deployed}
            <CopyButton value={deployed} />
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function SafeControl() {
  const {
    address,
    chainId,
    isConnected,
    safes,
    selectedSafeAddress,
    selectedSafeDetails,
    pendingTransactions,
    actionResult,
    isLoadingSafes,
    isLoadingDetails,
    isDeploying,
    isActioning,
    error,
    setSelectedSafeAddress,
    refreshSafes,
    refreshSelectedSafe,
    deploySafe,
    proposeTransaction,
    confirmTransaction,
    executeTransaction,
    clearActionResult,
  } = useSafeControlPanel();

  const totalPending = pendingTransactions.filter((t) => t.status === "waiting_signatures" || t.status === "ready_to_execute").length;

  return (
    <div className="container px-4 md:px-8 py-8 md:py-12">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* ── Header ── */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <Shield className="h-7 w-7 text-primary" />
              Ví Safe
            </h1>
          </div>
          <Button variant="outline" size="sm" onClick={refreshSafes} disabled={!isConnected || isLoadingSafes} className="gap-2">
            {isLoadingSafes ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Làm mới
          </Button>
        </div>

        {/* ── Connect prompt ── */}
        {!isConnected && (
          <Alert>
            <Wallet className="h-4 w-4" />
            <AlertTitle>Chưa kết nối ví</AlertTitle>
            <AlertDescription>Kết nối ví để tải danh sách Safe.</AlertDescription>
          </Alert>
        )}

        {/* ── Error banner ── */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* ── Stats ── */}
        {isConnected && (
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="pt-6 flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Ví Safe</p>
                  <p className="text-2xl font-bold">{isLoadingSafes ? "–" : safes.length}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10">
                  <FileSignature className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Chờ ký</p>
                  <p className="text-2xl font-bold">{totalPending}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                  <Users className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Số owner</p>
                  <p className="text-2xl font-bold">{selectedSafeDetails ? selectedSafeDetails.owners.length : "–"}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── Tabs ── */}
        <Tabs defaultValue="safes" className="space-y-6">
          <TabsList className="flex-wrap">
            <TabsTrigger value="safes" className="gap-2">
              <Shield className="h-4 w-4" />
              Ví Safe
            </TabsTrigger>
            <TabsTrigger value="transactions" disabled={!selectedSafeAddress} className="gap-2">
              <Send className="h-4 w-4" />
              Giao dịch
            </TabsTrigger>
            <TabsTrigger value="create" className="gap-2">
              <PlusCircle className="h-4 w-4" />
              Tạo Safe
            </TabsTrigger>
          </TabsList>

          {/* ══ TAB: My Safes ══ */}
          <TabsContent value="safes" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-[300px_1fr]">

              {/* Safe list */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Danh sách ví</CardTitle>
                  <CardDescription className="text-xs">
                    Owner: {address ? formatSafeControlAddress(address) : "—"} · Chain {chainId}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 pt-0">
                  {isLoadingSafes ? (
                    <p className="text-sm text-muted-foreground">Đang tải...</p>
                  ) : safes.length > 0 ? (
                    safes.map((safe) => (
                      <button
                        key={`${safe.chainId}-${safe.address}`}
                        type="button"
                        onClick={() => setSelectedSafeAddress(safe.address)}
                        className={`w-full rounded-lg border p-3 text-left transition-colors hover:bg-muted/50 ${
                          selectedSafeAddress === safe.address ? "border-primary bg-primary/5" : "border-border"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <code className="text-sm font-mono">{formatSafeControlAddress(safe.address)}</code>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">{safe.label ?? safe.networkLabel}</p>
                      </button>
                    ))
                  ) : (
                    <div className="rounded-lg border border-dashed p-4 text-center">
                      <p className="text-sm text-muted-foreground">Không tìm thấy ví Safe nào.</p>
                      <p className="text-xs text-muted-foreground mt-1">Tạo ví mới trong tab Tạo Safe.</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Safe details */}
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <CardTitle>Thông tin ví</CardTitle>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={refreshSelectedSafe}
                        disabled={!selectedSafeAddress || isLoadingDetails}
                        className="gap-2"
                      >
                        {isLoadingDetails ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                        Làm mới
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {!selectedSafeAddress ? (
                      <p className="text-sm text-muted-foreground">Chọn một ví để xem thông tin.</p>
                    ) : !selectedSafeDetails && isLoadingDetails ? (
                      <p className="text-sm text-muted-foreground">Đang tải...</p>
                    ) : selectedSafeDetails ? (
                      <div className="space-y-6 relative">
                        {isLoadingDetails && (
                          <div className="absolute inset-0 flex items-start justify-end pointer-events-none">
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mt-1" />
                          </div>
                        )}

                        {/* Stats grid */}
                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                          <div className="rounded-lg bg-muted/50 p-3 space-y-1">
                            <p className="text-xs text-muted-foreground">Địa chỉ ví</p>
                            <div className="flex items-center">
                              <code className="text-xs font-mono truncate">{selectedSafeDetails.address}</code>
                              <CopyButton value={selectedSafeDetails.address} />
                            </div>
                          </div>
                          <div className="rounded-lg bg-muted/50 p-3 space-y-1">
                            <p className="text-xs text-muted-foreground">Mạng</p>
                            <p className="font-medium text-sm">{selectedSafeDetails.networkLabel}</p>
                            <p className="text-xs text-muted-foreground">Chain {selectedSafeDetails.chainId}</p>
                          </div>
                          <div className="rounded-lg bg-muted/50 p-3 space-y-1">
                            <p className="text-xs text-muted-foreground">Ngưỡng ký</p>
                            <p className="font-medium text-lg">
                              {selectedSafeDetails.threshold} / {selectedSafeDetails.owners.length}
                            </p>
                            <p className="text-xs text-muted-foreground">chữ ký yêu cầu</p>
                          </div>
                          <div className="rounded-lg bg-muted/50 p-3 space-y-1">
                            <p className="text-xs text-muted-foreground">Số dư / Nonce</p>
                            <p className="font-medium text-sm">{selectedSafeDetails.balance ?? "—"}</p>
                            <p className="text-xs text-muted-foreground">Nonce: {selectedSafeDetails.nonce ?? "—"}</p>
                          </div>
                        </div>

                        {/* Badges & link */}
                        <div className="flex flex-wrap items-center gap-2">
                          {selectedSafeDetails.isConnectedWalletOwner ? (
                            <Badge variant="default" className="gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              Bạn là owner
                            </Badge>
                          ) : (
                            <Badge variant="outline">Không phải owner</Badge>
                          )}
                          <Button variant="outline" size="sm" asChild className="gap-2 ml-auto">
                            <a href={selectedSafeDetails.officialSafeUrl} target="_blank" rel="noopener noreferrer">
                              Mở Safe app
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          </Button>
                        </div>

                        <Separator />

                        {/* Owners list */}
                        <div className="space-y-2">
                          <p className="text-sm font-semibold flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            Owner ({selectedSafeDetails.owners.length})
                          </p>
                          <div className="grid gap-2">
                            {selectedSafeDetails.owners.map((owner, idx) => (
                              <div key={owner} className="flex items-center gap-3 rounded-lg border px-3 py-2">
                                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-semibold">
                                  {idx + 1}
                                </span>
                                <code className="flex-1 truncate text-xs font-mono">{owner}</code>
                                <CopyButton value={owner} />
                                {owner.toLowerCase() === address?.toLowerCase() && (
                                  <Badge variant="secondary" className="text-xs">Bạn</Badge>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Chưa có dữ liệu.</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* ══ TAB: Transactions ══ */}
          <TabsContent value="transactions" className="space-y-6">

            {/* Action result banner */}
            {actionResult && (
              <Alert variant={actionResult.success ? "default" : "destructive"}>
                {actionResult.success ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                <AlertTitle>{actionResult.success ? "Thành công" : "Thất bại"}</AlertTitle>
                <AlertDescription className="flex flex-wrap items-center gap-2">
                  <span>{actionResult.message}</span>
                  {actionResult.txHash && (
                    <code className="text-xs font-mono">{formatSafeControlAddress(actionResult.txHash)}</code>
                  )}
                </AlertDescription>
              </Alert>
            )}
            {/* New transaction form */}
            {selectedSafeAddress && selectedSafeDetails?.isConnectedWalletOwner && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PlusCircle className="h-5 w-5 text-primary" />
                    Tạo giao dịch mới
                  </CardTitle>
                  <CardDescription>Đề xuất giao dịch mới cho ví Safe đã chọn.</CardDescription>
                </CardHeader>
                <CardContent>
                  <NewTransactionForm onPropose={proposeTransaction} isActioning={isActioning} />
                </CardContent>
              </Card>
            )}
            {/* Pending transactions */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <CardTitle>Giao dịch chờ xử lý</CardTitle>
                    <CardDescription>
                      {selectedSafeDetails
                        ? `${formatSafeControlAddress(selectedSafeDetails.address)} · ${selectedSafeDetails.threshold}/${selectedSafeDetails.owners.length} chữ ký`
                        : "Chọn ví để xem giao dịch"}
                    </CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={refreshSelectedSafe} disabled={isLoadingDetails} className="gap-2">
                    {isLoadingDetails ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingDetails ? (
                  <p className="text-sm text-muted-foreground">Đang tải...</p>
                ) : pendingTransactions.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Hash</TableHead>
                          <TableHead>Đến</TableHead>
                          <TableHead>Giá trị</TableHead>
                          <TableHead>Data</TableHead>
                          <TableHead>Nonce</TableHead>
                          <TableHead>Chữ ký</TableHead>
                          <TableHead>Trạng thái</TableHead>
                          <TableHead className="text-right"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pendingTransactions.map((tx) => {
                          const s = STATUS_BADGE[tx.status];
                          const canSign = tx.status === "waiting_signatures";
                          const canExecute = tx.status === "ready_to_execute";
                          return (
                            <TableRow key={tx.safeTxHash}>
                              <TableCell className="font-mono text-xs">
                                <span className="flex items-center gap-1">
                                  {formatSafeControlAddress(tx.safeTxHash)}
                                  <CopyButton value={tx.safeTxHash} />
                                </span>
                              </TableCell>
                              <TableCell className="font-mono text-xs">{formatSafeControlAddress(tx.to)}</TableCell>
                              <TableCell className="text-sm">{tx.value}</TableCell>
                              <TableCell className="text-xs max-w-[160px] truncate text-muted-foreground">{tx.dataSummary}</TableCell>
                              <TableCell className="text-sm">{tx.nonce}</TableCell>
                              <TableCell>
                                <span className={`text-sm font-medium ${tx.confirmationsCount >= tx.requiredConfirmations ? "text-green-600" : "text-orange-500"}`}>
                                  {tx.confirmationsCount}/{tx.requiredConfirmations}
                                </span>
                              </TableCell>
                              <TableCell>
                                <Badge variant={s.variant}>{s.label}</Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                  {canSign && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="gap-1.5"
                                      disabled={isActioning}
                                      onClick={() => { clearActionResult(); confirmTransaction(tx.safeTxHash); }}
                                    >
                                      {isActioning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileSignature className="h-3.5 w-3.5" />}
                                      Ký
                                    </Button>
                                  )}
                                  {canExecute && (
                                    <Button
                                      size="sm"
                                      className="gap-1.5"
                                      disabled={isActioning}
                                      onClick={() => { clearActionResult(); executeTransaction(tx.safeTxHash); }}
                                    >
                                      {isActioning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowRight className="h-3.5 w-3.5" />}
                                      Thực thi
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed p-6 text-center">
                    <CheckCircle2 className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                    <p className="text-sm text-muted-foreground">Không có giao dịch chờ.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ══ TAB: Create Safe ══ */}
          <TabsContent value="create">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  Tạo ví Safe mới
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!isConnected ? (
                  <Alert>
                    <Wallet className="h-4 w-4" />
                    <AlertDescription>Kết nối ví để tạo Safe.</AlertDescription>
                  </Alert>
                ) : (
                  <CreateSafeForm
                    address={address}
                    chainId={chainId}
                    onDeploy={deploySafe}
                    isDeploying={isDeploying}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
