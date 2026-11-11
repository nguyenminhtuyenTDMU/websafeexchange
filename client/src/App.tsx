import { Route, Router, Switch } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { config } from "./lib/wagmi";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { Layout } from "@/components/layout";
import { GuideProvider } from "@/components/guide";
import Home from "@/pages/home";
import SellPage from "@/pages/sell";
import TradesPage from "@/pages/trades";
import TradePage from "@/pages/trade";
import HistoryPage from "@/pages/history";
import NotFound from "@/pages/not-found";
import { lazy, Suspense } from "react";

// Trang xem trước giao diện bằng dữ liệu mẫu: chỉ có khi chạy dev, bị loại khỏi bản build.
const Preview = import.meta.env.DEV ? lazy(() => import("@/pages/preview")) : null;

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1 } },
});

// Định tuyến bằng dấu # để chạy được trên lưu trữ tĩnh (GitHub Pages, IPFS) mà không cần cấu hình máy chủ
export default function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="light" storageKey="cleanhandover-theme">
          <TooltipProvider>
            <Toaster />
            <Router hook={useHashLocation}>
              <GuideProvider>
              <Layout>
                <Switch>
                  <Route path="/" component={Home} />
                  <Route path="/sell" component={SellPage} />
                  <Route path="/trades" component={TradesPage} />
                  <Route path="/trade/:id" component={TradePage} />
                  <Route path="/history" component={HistoryPage} />
                  <Route path="/history/:address" component={HistoryPage} />
                  {Preview && <Route path="/__preview/:state">{(p) => <Suspense fallback={null}><Preview params={p as { state: string }} /></Suspense>}</Route>}
                  <Route component={NotFound} />
                </Switch>
              </Layout>
              </GuideProvider>
            </Router>
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
