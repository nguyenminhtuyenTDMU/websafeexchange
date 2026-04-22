import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, Shield, ShieldCheck, ShieldOff, Users, Box, ExternalLink, CheckCircle2, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

const CHAINS: Record<number, { label: string; safePrefix: string; explorer: string }> = {
  1:        { label: "Ethereum Mainnet", safePrefix: "eth", explorer: "https://etherscan.io" },
  11155111: { label: "Sepolia Testnet",  safePrefix: "sep", explorer: "https://sepolia.etherscan.io" },
};

const searchSchema = z.object({
  safeAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Địa chỉ Safe không hợp lệ"),
  chainId: z.coerce.number(),
});

type SearchValues = z.infer<typeof searchSchema>;

interface SafeInfo {
  address: string;
  owners: string[];
  threshold: number;
  nonce: number;
  modules: string[];
  guard: string | null;
  version: string;
  chainId: number;
}

export default function WalletTransparency() {
  const { toast } = useToast();
  const [location] = useLocation();
  
  const getQueryParam = (param: string): string => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      return urlParams.get(param) || '';
    }
    return '';
  };
  
  const initialSafe = getQueryParam("safe");
  
  const [safeInfo, setSafeInfo] = useState<SafeInfo | null>(null);

  const form = useForm<SearchValues>({
    resolver: zodResolver(searchSchema),
    defaultValues: {
      safeAddress: initialSafe,
      chainId: 11155111,
    },
  });

  const searchMutation = useMutation({
    mutationFn: async (values: SearchValues) => {
      const res = await fetch(`/api/safe-info?address=${values.safeAddress}&chainId=${values.chainId}`);
      if (!res.ok) throw new Error("Không thể lấy thông tin Safe");
      return res.json();
    },
    onSuccess: (data) => {
      setSafeInfo(data);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: error.message,
      });
      setSafeInfo(null);
    },
  });

  const onSubmit = (values: SearchValues) => {
    searchMutation.mutate(values);
  };

  return (
    <div className="container px-4 md:px-8 py-8 md:py-12">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">Thông tin ví Safe</h1>
          <p className="text-muted-foreground">
            Kiểm tra thông tin chi tiết của Safe wallet trước khi giao dịch
          </p>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Tìm kiếm Safe
            </CardTitle>
            <CardDescription>
              Nhập địa chỉ Safe wallet để xem thông tin
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="flex gap-2 flex-wrap sm:flex-nowrap">
                <FormField
                  control={form.control}
                  name="chainId"
                  render={({ field }) => (
                    <FormItem className="w-full sm:w-48 shrink-0">
                      <Select
                        value={String(field.value)}
                        onValueChange={(v) => field.onChange(Number(v))}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(CHAINS).map(([id, c]) => (
                            <SelectItem key={id} value={id}>{c.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="safeAddress"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormControl>
                        <Input
                          placeholder="0x..."
                          className="font-mono"
                          {...field}
                          data-testid="input-safe-address-transparency"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  disabled={searchMutation.isPending}
                  data-testid="button-search-safe"
                >
                  {searchMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {safeInfo && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    Thông tin Safe
                  </CardTitle>
                  <Badge variant="outline">
                    Version {safeInfo.version}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Địa chỉ</p>
                  <div className="flex items-center gap-2">
                    <code className="text-sm font-mono bg-muted px-3 py-2 rounded flex-1 truncate">
                      {safeInfo.address}
                    </code>
                    <Button
                      variant="outline"
                      size="icon"
                      asChild
                    >
                      <a
                        href={`https://app.safe.global/home?safe=${CHAINS[safeInfo.chainId]?.safePrefix ?? "eth"}:${safeInfo.address}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        data-testid="link-safe-app"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <p className="text-2xl font-bold">{safeInfo.owners.length}</p>
                    <p className="text-sm text-muted-foreground">Owners</p>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <p className="text-2xl font-bold">{safeInfo.threshold}</p>
                    <p className="text-sm text-muted-foreground">Threshold</p>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <p className="text-2xl font-bold">{safeInfo.nonce}</p>
                    <p className="text-sm text-muted-foreground">Nonce</p>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <p className="text-2xl font-bold">{safeInfo.chainId}</p>
                    <p className="text-sm text-muted-foreground">Chain ID</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Owners ({safeInfo.owners.length})
                </CardTitle>
                <CardDescription>
                  Danh sách các địa chỉ có quyền sở hữu Safe
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {safeInfo.owners.map((owner, index) => (
                    <div
                      key={owner}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold">
                          {index + 1}
                        </div>
                        <code className="text-sm font-mono truncate max-w-[300px]">
                          {owner}
                        </code>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        asChild
                      >
                        <a
                          href={`${CHAINS[safeInfo.chainId]?.explorer ?? "https://etherscan.io"}/address/${owner}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {safeInfo.guard ? (
                      <ShieldCheck className="h-5 w-5 text-success" />
                    ) : (
                      <ShieldOff className="h-5 w-5 text-muted-foreground" />
                    )}
                    Guard
                  </CardTitle>
                  <CardDescription>
                    Smart contract kiểm soát giao dịch
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {safeInfo.guard ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-success" />
                        <span className="text-sm font-medium">Guard đang hoạt động</span>
                      </div>
                      <code className="text-xs font-mono bg-muted px-2 py-1 rounded block truncate">
                        {safeInfo.guard}
                      </code>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <XCircle className="h-4 w-4" />
                      <span className="text-sm">Không có Guard</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Box className="h-5 w-5" />
                    Modules ({safeInfo.modules.length})
                  </CardTitle>
                  <CardDescription>
                    Các module đã được cài đặt
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {safeInfo.modules.length > 0 ? (
                    <div className="space-y-2">
                      {safeInfo.modules.map((module) => (
                        <code
                          key={module}
                          className="text-xs font-mono bg-muted px-2 py-1 rounded block truncate"
                        >
                          {module}
                        </code>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <XCircle className="h-4 w-4" />
                      <span className="text-sm">Không có module nào</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {!safeInfo && !searchMutation.isPending && (
          <div className="text-center py-12">
            <Shield className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nhập địa chỉ Safe để bắt đầu</h3>
            <p className="text-muted-foreground">
              Kiểm tra thông tin owners, modules, guards và trạng thái của Safe wallet
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
