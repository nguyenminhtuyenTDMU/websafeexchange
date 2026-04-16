import { type SafeInfo, type SafeTransactionResult } from '@/lib/safe-sdk';
export interface UseSafeSdkReturn {
    loading: boolean;
    error: string | null;
    getSafeInfo: (safeAddress: string) => Promise<SafeInfo | null>;
    setGuard: (safeAddress: string, guardAddress: string) => Promise<SafeTransactionResult>;
    removeGuard: (safeAddress: string) => Promise<SafeTransactionResult>;
    swapOwner: (safeAddress: string, oldOwner: string, newOwner: string) => Promise<SafeTransactionResult>;
    addOwner: (safeAddress: string, newOwner: string, threshold?: number) => Promise<SafeTransactionResult>;
    removeOwner: (safeAddress: string, ownerToRemove: string, threshold?: number) => Promise<SafeTransactionResult>;
    isOwner: (safeAddress: string, address: string) => Promise<boolean>;
    executeTransaction: (safeAddress: string, to: string, value: string, data: string) => Promise<SafeTransactionResult>;
}
export declare function useSafeSdk(): UseSafeSdkReturn;
