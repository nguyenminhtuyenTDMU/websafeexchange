import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { queryClient } from "./lib/queryClient";
import { config } from "./lib/wagmi";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { WebSocketProvider } from "@/components/websocket-provider";
import { Layout } from "@/components/layout";

import Home from "@/pages/home";
import Transfer from "@/pages/transfer/index";
import Sell from "@/pages/transfer/sell";
import Buy from "@/pages/transfer/buy";
import WalletTransparency from "@/pages/wallet-transparency";
import Dashboard from "@/pages/dashboard";
import Forum from "@/pages/forum";
import ForumPost from "@/pages/forum-post";
import NotFound from "@/pages/not-found";
import Assistant from "@/pages/assistant";
import { UserProfileDialog } from "@/components/user-profile-dialog";
import { ChatWidget } from "@/components/chat-widget";

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/transfer" component={Transfer} />
        <Route path="/transfer/sell" component={Sell} />
        <Route path="/transfer/buy" component={Buy} />
        <Route path="/wallet-transparency" component={WalletTransparency} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/forum" component={Forum} />
        <Route path="/forum/:id" component={ForumPost} />
        <Route path="/assistant" component={Assistant} />
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
            <WebSocketProvider>
              <Toaster />
              <Router />
              <UserProfileDialog />
              <ChatWidget />
            </WebSocketProvider>
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default App;
