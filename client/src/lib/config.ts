import { hardhat, sepolia } from "wagmi/chains";

// VITE_CHAIN=local: chạy với node Hardhat trên máy để kiểm thử đầu-cuối (script/e2e). Mặc định là Sepolia.
const LOCAL = import.meta.env.VITE_CHAIN === "local";

export const CHAIN = LOCAL ? hardhat : sepolia;

// Địa chỉ đã triển khai (docs/DEPLOYMENTS.md)
export const ESCROW = (LOCAL ? import.meta.env.VITE_ESCROW : "0xD0a1fed458bDA47758137EC06aa72c297009c351") as `0x${string}`;
export const ESCROW_DEPLOY_BLOCK = LOCAL ? 0n : 12093575n;

export const CHECKERS = [
  { id: 0, name: "ETH", valueLabel: "Số lượng tối thiểu (ETH)", needsToken: false },
  { id: 1, name: "ERC-20", valueLabel: "Số lượng tối thiểu (đơn vị nhỏ nhất)", needsToken: true },
  { id: 2, name: "ERC-721", valueLabel: "Token ID", needsToken: true },
  { id: 3, name: "Ownable", valueLabel: "", needsToken: true },
] as const;

// RPC công khai: Tenderly quét được dải block dài cho eth_getLogs, publicnode làm dự phòng
export const RPC_URLS = LOCAL ? ["http://127.0.0.1:8545"] : [
  "https://sepolia.gateway.tenderly.co",
  "https://ethereum-sepolia-rpc.publicnode.com",
];

export const EXPLORER = "https://sepolia.etherscan.io";
export const explorerAddress = (a: string) => `${EXPLORER}/address/${a}`;
export const explorerTx = (h: string) => `${EXPLORER}/tx/${h}`;

export const ZERO = "0x0000000000000000000000000000000000000000" as const;
