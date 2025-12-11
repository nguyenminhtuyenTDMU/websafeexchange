import { useState } from "react";
import { useAccount, useSignMessage } from "wagmi";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ConnectWallet } from "@/components/connect-wallet";
import { Loader2, FileCheck, Shield, Copy, Download, CheckCircle2, AlertCircle, Hash, PenTool, Search } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { keccak256, toBytes } from "viem";
import { exportEvidencePDF } from "@/lib/export-pdf";

const createEvidenceSchema = z.object({
  tradeId: z.string().optional(),
  payload: z.string().min(1, "Vui lòng nhập nội dung bằng chứng"),
});

const verifyEvidenceSchema = z.object({
  hash: z.string().min(1, "Vui lòng nhập hash"),
  signature: z.string().min(1, "Vui lòng nhập chữ ký"),
  signerAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Địa chỉ không hợp lệ"),
});

type CreateEvidenceValues = z.infer<typeof createEvidenceSchema>;
type VerifyEvidenceValues = z.infer<typeof verifyEvidenceSchema>;

interface EvidenceResult {
  hash: string;
  signature: string;
  signerAddress: string;
  timestamp: string;
}

export default function Evidence() {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { toast } = useToast();
  const [evidenceResult, setEvidenceResult] = useState<EvidenceResult | null>(null);
  const [verificationResult, setVerificationResult] = useState<boolean | null>(null);

  const createForm = useForm<CreateEvidenceValues>({
    resolver: zodResolver(createEvidenceSchema),
    defaultValues: {
      tradeId: "",
      payload: "",
    },
  });

  const verifyForm = useForm<VerifyEvidenceValues>({
    resolver: zodResolver(verifyEvidenceSchema),
    defaultValues: {
      hash: "",
      signature: "",
      signerAddress: "",
    },
  });

  const createEvidenceMutation = useMutation({
    mutationFn: async (values: CreateEvidenceValues) => {
      const payload = JSON.stringify({
        content: values.payload,
        tradeId: values.tradeId || null,
        timestamp: new Date().toISOString(),
        creator: address,
      });
      
      const hash = keccak256(toBytes(payload));
      const signature = await signMessageAsync({ message: hash });
      
      const res = await apiRequest("POST", "/api/evidence", {
        tradeId: values.tradeId || null,
        hash,
        signerAddress: address,
        payload,
      });
      
      return {
        hash,
        signature,
        signerAddress: address!,
        timestamp: new Date().toISOString(),
      };
    },
    onSuccess: (data) => {
      setEvidenceResult(data);
      toast({
        title: "Tạo bằng chứng thành công",
        description: "Bằng chứng đã được tạo và ký số.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/evidence"] });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: error.message || "Không thể tạo bằng chứng",
      });
    },
  });

  const verifyEvidenceMutation = useMutation({
    mutationFn: async (values: VerifyEvidenceValues) => {
      const res = await fetch("/api/evidence/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error("Xác minh thất bại");
      return res.json();
    },
    onSuccess: (data) => {
      setVerificationResult(data.valid);
      toast({
        title: data.valid ? "Xác minh thành công" : "Xác minh thất bại",
        description: data.valid
          ? "Chữ ký hợp lệ và khớp với địa chỉ."
          : "Chữ ký không hợp lệ hoặc không khớp.",
        variant: data.valid ? "default" : "destructive",
      });
    },
    onError: (error: Error) => {
      setVerificationResult(false);
      toast({
        variant: "destructive",
        title: "Lỗi xác minh",
        description: error.message,
      });
    },
  });

  const onCreateSubmit = (values: CreateEvidenceValues) => {
    createEvidenceMutation.mutate(values);
  };

  const onVerifySubmit = (values: VerifyEvidenceValues) => {
    verifyEvidenceMutation.mutate(values);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `Đã sao chép ${label}` });
  };

  const exportEvidenceJSON = () => {
    if (!evidenceResult) return;
    
    const data = JSON.stringify(evidenceResult, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `evidence-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportToPDF = () => {
    if (!evidenceResult) return;
    exportEvidencePDF({
      ...evidenceResult,
      tradeId: createForm.getValues("tradeId"),
      payload: JSON.stringify({
        content: createForm.getValues("payload"),
        tradeId: createForm.getValues("tradeId") || null,
        timestamp: evidenceResult.timestamp,
        creator: evidenceResult.signerAddress,
      }),
    });
  };

  if (!isConnected) {
    return (
      <div className="container px-4 md:px-8 py-12 md:py-16">
        <div className="max-w-lg mx-auto text-center">
          <FileCheck className="h-16 w-16 text-muted-foreground mx-auto mb-6" />
          <h1 className="text-2xl font-bold mb-4">Kết nối ví để sử dụng</h1>
          <p className="text-muted-foreground mb-6">
            Bạn cần kết nối ví để tạo và ký bằng chứng số.
          </p>
          <ConnectWallet />
        </div>
      </div>
    );
  }

  return (
    <div className="container px-4 md:px-8 py-8 md:py-12">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">Thu thập bằng chứng</h1>
          <p className="text-muted-foreground">
            Tạo và xác minh bằng chứng số với chữ ký ECDSA
          </p>
        </div>

        <Tabs defaultValue="create" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="create" data-testid="tab-create">
              <PenTool className="mr-2 h-4 w-4" />
              Tạo bằng chứng
            </TabsTrigger>
            <TabsTrigger value="verify" data-testid="tab-verify">
              <Search className="mr-2 h-4 w-4" />
              Xác minh
            </TabsTrigger>
          </TabsList>

          <TabsContent value="create">
            <Card>
              <CardHeader>
                <CardTitle>Tạo bằng chứng mới</CardTitle>
                <CardDescription>
                  Nhập nội dung và ký số bằng ví của bạn
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...createForm}>
                  <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-6">
                    <FormField
                      control={createForm.control}
                      name="tradeId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Mã giao dịch (tùy chọn)</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Nhập mã giao dịch nếu liên quan đến giao dịch"
                              className="font-mono"
                              {...field}
                              data-testid="input-trade-id"
                            />
                          </FormControl>
                          <FormDescription>
                            Liên kết bằng chứng với một giao dịch cụ thể
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={createForm.control}
                      name="payload"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nội dung bằng chứng</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Nhập nội dung bạn muốn lưu trữ làm bằng chứng..."
                              className="min-h-[150px]"
                              {...field}
                              data-testid="input-evidence-content"
                            />
                          </FormControl>
                          <FormDescription>
                            Mô tả chi tiết về sự việc, thỏa thuận hoặc giao dịch
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={createEvidenceMutation.isPending}
                      data-testid="button-create-evidence"
                    >
                      {createEvidenceMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Đang tạo và ký...
                        </>
                      ) : (
                        <>
                          <PenTool className="mr-2 h-4 w-4" />
                          Tạo và ký bằng chứng
                        </>
                      )}
                    </Button>
                  </form>
                </Form>

                {evidenceResult && (
                  <div className="mt-8 space-y-4">
                    <Alert className="border-success">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      <AlertTitle>Bằng chứng đã được tạo</AlertTitle>
                      <AlertDescription>
                        Lưu giữ thông tin dưới đây để sử dụng khi cần xác minh.
                      </AlertDescription>
                    </Alert>

                    <div className="space-y-3">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium">Hash</p>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(evidenceResult.hash, "hash")}
                            data-testid="button-copy-hash"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                        <code className="text-xs font-mono bg-muted px-2 py-1 rounded block break-all">
                          {evidenceResult.hash}
                        </code>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium">Chữ ký</p>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(evidenceResult.signature, "chữ ký")}
                            data-testid="button-copy-signature"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                        <code className="text-xs font-mono bg-muted px-2 py-1 rounded block break-all">
                          {evidenceResult.signature}
                        </code>
                      </div>

                      <div className="space-y-1">
                        <p className="text-sm font-medium">Địa chỉ ký</p>
                        <code className="text-xs font-mono bg-muted px-2 py-1 rounded block">
                          {evidenceResult.signerAddress}
                        </code>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2">
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={exportEvidenceJSON}
                          data-testid="button-export-evidence-json"
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Tải JSON
                        </Button>
                        <Button
                          variant="default"
                          className="flex-1"
                          onClick={exportToPDF}
                          data-testid="button-export-evidence-pdf"
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Tải PDF
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="verify">
            <Card>
              <CardHeader>
                <CardTitle>Xác minh bằng chứng</CardTitle>
                <CardDescription>
                  Kiểm tra tính hợp lệ của chữ ký và bằng chứng
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...verifyForm}>
                  <form onSubmit={verifyForm.handleSubmit(onVerifySubmit)} className="space-y-6">
                    <FormField
                      control={verifyForm.control}
                      name="hash"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Hash</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="0x..."
                              className="font-mono"
                              {...field}
                              data-testid="input-verify-hash"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={verifyForm.control}
                      name="signature"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Chữ ký</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="0x..."
                              className="font-mono min-h-[80px]"
                              {...field}
                              data-testid="input-verify-signature"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={verifyForm.control}
                      name="signerAddress"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Địa chỉ người ký</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="0x..."
                              className="font-mono"
                              {...field}
                              data-testid="input-verify-signer"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={verifyEvidenceMutation.isPending}
                      data-testid="button-verify-evidence"
                    >
                      {verifyEvidenceMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Đang xác minh...
                        </>
                      ) : (
                        <>
                          <Search className="mr-2 h-4 w-4" />
                          Xác minh
                        </>
                      )}
                    </Button>
                  </form>
                </Form>

                {verificationResult !== null && (
                  <div className="mt-6">
                    {verificationResult ? (
                      <Alert className="border-success">
                        <CheckCircle2 className="h-4 w-4 text-success" />
                        <AlertTitle>Xác minh thành công</AlertTitle>
                        <AlertDescription>
                          Chữ ký hợp lệ và khớp với địa chỉ đã cung cấp.
                        </AlertDescription>
                      </Alert>
                    ) : (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Xác minh thất bại</AlertTitle>
                        <AlertDescription>
                          Chữ ký không hợp lệ hoặc không khớp với địa chỉ.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
