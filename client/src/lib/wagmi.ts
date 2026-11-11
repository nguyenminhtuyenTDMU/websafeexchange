import { createConfig, fallback, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { CHAIN, RPC_URLS } from "./config";

export const config = createConfig({
  chains: [CHAIN],
  connectors: [injected()],
  transports: {
    [CHAIN.id]: fallback(RPC_URLS.map((url) => http(url))),
  },
});

declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
}
