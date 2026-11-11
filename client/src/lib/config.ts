import { sepolia } from "wagmi/chains";

export const CHAIN = sepolia;

// Địa chỉ đã triển khai (docs/DEPLOYMENTS.md)
export const ESCROW = "0xD0a1fed458bDA47758137EC06aa72c297009c351" as const;
export const ESCROW_DEPLOY_BLOCK = 12093575n;

export const CHECKERS = [
  { id: 0, name: "ETH", valueLabel: "Số lượng tối thiểu (ETH)", needsToken: false },
  { id: 1, name: "ERC-20", valueLabel: "Số lượng tối thiểu (đơn vị nhỏ nhất)", needsToken: true },
  { id: 2, name: "ERC-721", valueLabel: "Token ID", needsToken: true },
  { id: 3, name: "Ownable", valueLabel: "", needsToken: true },
] as const;

// RPC công khai: Tenderly quét được dải block dài cho eth_getLogs, publicnode làm dự phòng
export const RPC_URLS = [
  "https://sepolia.gateway.tenderly.co",
  "https://ethereum-sepolia-rpc.publicnode.com",
];

export const EXPLORER = "https://sepolia.etherscan.io";
export const explorerAddress = (a: string) => `${EXPLORER}/address/${a}`;
export const explorerTx = (h: string) => `${EXPLORER}/tx/${h}`;

export const ZERO = "0x0000000000000000000000000000000000000000" as const;
