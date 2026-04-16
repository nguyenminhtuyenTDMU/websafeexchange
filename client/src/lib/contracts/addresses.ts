/**
 * Contract addresses theo chainId.
 * Sau khi deploy SC, điền address vào VITE_ESCROW_CONTRACT_ADDRESS trong .env
 */

export const ESCROW_CONTRACT_ADDRESSES: Record<number, `0x${string}`> = {
  // Sepolia testnet
  11155111: (import.meta.env.VITE_ESCROW_CONTRACT_ADDRESS || "0x0000000000000000000000000000000000000000") as `0x${string}`,
  // Mainnet (khi cần)
  // 1: "0x...",
};

export function getEscrowAddress(chainId: number): `0x${string}` {
  const address = ESCROW_CONTRACT_ADDRESSES[chainId];
  if (!address || address === "0x0000000000000000000000000000000000000000") {
    throw new Error(`Escrow contract chưa được deploy trên chain ${chainId}`);
  }
  return address;
}
