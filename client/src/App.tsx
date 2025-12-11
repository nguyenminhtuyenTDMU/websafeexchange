import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { queryClient } from "./lib/queryClient";
import { config } from "./lib/wagmi";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { Layout } from "@/components/layout";

import Home from "@/pages/home";
import Transfer from "@/pages/transfer/index";
import Sell from "@/pages/transfer/sell";
import Buy from "@/pages/transfer/buy";
import WalletTransparency from "@/pages/wallet-transparency";
import Evidence from "@/pages/evidence";
import Dashboard from "@/pages/dashboard";
import Learn from "@/pages/learn";
import Legal from "@/pages/legal";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/transfer" component={Transfer} />
        <Route path="/transfer/sell" component={Sell} />
        <Route path="/transfer/buy" component={Buy} />
        <Route path="/wallet-transparency" component={WalletTransparency} />
        <Route path="/evidence" component={Evidence} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/learn" component={Learn} />
        <Route path="/legal" component={Legal} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="light" storageKey="safeexchange-theme">
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default App;
