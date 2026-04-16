/**
 * Contract addresses theo chainId.
 * Sau khi deploy SC, điền address vào VITE_ESCROW_CONTRACT_ADDRESS trong .env
 */
export declare const ESCROW_CONTRACT_ADDRESSES: Record<number, `0x${string}`>;
export declare function getEscrowAddress(chainId: number): `0x${string}`;
