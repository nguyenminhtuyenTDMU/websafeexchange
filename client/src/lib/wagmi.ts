import { createConfig, fallback, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { CHAIN, RPC_URLS } from "./config";

// Một mạng duy nhất mỗi bản build: Sepolia, hoặc node Hardhat local khi VITE_CHAIN=local
export const config = createConfig({
  chains: [CHAIN],
  connectors: [injected()],
  transports: {
    [CHAIN.id]: fallback(RPC_URLS.map((url) => http(url))),
  } as Record<typeof CHAIN.id, ReturnType<typeof fallback>>,
});

declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
}
