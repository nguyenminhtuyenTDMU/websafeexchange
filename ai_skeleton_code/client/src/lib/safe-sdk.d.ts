import SafeApiKit from "@safe-global/api-kit";
import { ethers } from "ethers";
export interface SafeInfo {
    address: string;
    owners: string[];
    threshold: number;
    nonce: number;
    modules: string[];
    guard: string | null;
    fallbackHandler: string | null;
}
export interface SafeTransactionResult {
    success: boolean;
    txHash?: string;
    error?: string;
}
export declare function getSafeApiKit(chainId: number): Promise<SafeApiKit | null>;
export declare function getSafeInfo(safeAddress: string, provider: ethers.BrowserProvider): Promise<SafeInfo>;
export declare function setGuardOnSafe(safeAddress: string, guardAddress: string, provider: ethers.BrowserProvider, signer: ethers.Signer): Promise<SafeTransactionResult>;
export declare function removeGuardFromSafe(safeAddress: string, provider: ethers.BrowserProvider, signer: ethers.Signer): Promise<SafeTransactionResult>;
export declare function swapOwner(safeAddress: string, oldOwner: string, newOwner: string, provider: ethers.BrowserProvider, signer: ethers.Signer): Promise<SafeTransactionResult>;
export declare function addOwner(safeAddress: string, newOwner: string, threshold?: number, provider?: ethers.BrowserProvider, signer?: ethers.Signer): Promise<SafeTransactionResult>;
export declare function removeOwner(safeAddress: string, ownerToRemove: string, threshold?: number, provider?: ethers.BrowserProvider, signer?: ethers.Signer): Promise<SafeTransactionResult>;
export declare function isOwner(safeAddress: string, address: string, provider: ethers.BrowserProvider): Promise<boolean>;
export declare function createSafeTransaction(safeAddress: string, to: string, value: string, data: string, provider: ethers.BrowserProvider, signer: ethers.Signer): Promise<SafeTransactionResult>;
export declare function formatSafeAddress(address: string): string;
export declare function isValidAddress(address: string): boolean;
