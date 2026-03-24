import { useState, useCallback } from 'react';
import { useAccount, useChainId, useWalletClient } from 'wagmi';
import { BrowserProvider, JsonRpcSigner } from 'ethers';
import { 
  getSafeInfo, 
  setGuardOnSafe, 
  removeGuardFromSafe, 
  swapOwner, 
  addOwner, 
  removeOwner,
  isOwner,
  createSafeTransaction,
  type SafeInfo,
  type SafeTransactionResult,
} from '@/lib/safe-sdk';

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

export function useSafeSdk(): UseSafeSdkReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { address } = useAccount();
  const chainId = useChainId();
  const { data: walletClient } = useWalletClient();

  const getProviderAndSigner = useCallback(async (): Promise<{ provider: BrowserProvider; signer: JsonRpcSigner } | null> => {
    if (!walletClient || !address) {
      setError('Vui lòng kết nối ví');
      return null;
    }
    
    const provider = new BrowserProvider(walletClient.transport);
    const signer = await provider.getSigner();
    
    return { provider, signer };
  }, [walletClient, address]);

  const handleGetSafeInfo = useCallback(async (safeAddress: string): Promise<SafeInfo | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await getProviderAndSigner();
      if (!result) return null;
      
      const info = await getSafeInfo(safeAddress, result.provider);
      return info;
    } catch (err: any) {
      setError(err.message || 'Không thể lấy thông tin Safe');
      return null;
    } finally {
      setLoading(false);
    }
  }, [getProviderAndSigner]);

    const handleSetGuard = useCallback(async (
    safeAddress: string, 
    guardAddress: string
  ): Promise<SafeTransactionResult> => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await getProviderAndSigner();
      if (!result) return { success: false, error: 'Cannot connect wallet' };

      const txResult = await setGuardOnSafe(safeAddress, guardAddress, result.provider, result.signer);
      
      if (!txResult.success) {
        setError(txResult.error || 'Failed to set Guard');
      }
      
      return txResult;
    } catch (err: any) {
      const errorMsg = err.message || 'Cannot set Guard';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, [getProviderAndSigner]);


  const handleRemoveGuard = useCallback(async (safeAddress: string): Promise<SafeTransactionResult> => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await getProviderAndSigner();
      if (!result) return { success: false, error: 'Không thể kết nối ví' };
      
      const txResult = await removeGuardFromSafe(safeAddress, result.provider, result.signer);
      
      if (!txResult.success) {
        setError(txResult.error || 'Lỗi khi gỡ bỏ Guard');
      }
      
      return txResult;
    } catch (err: any) {
      const errorMsg = err.message || 'Không thể gỡ bỏ Guard';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, [getProviderAndSigner]);

  const handleSwapOwner = useCallback(async (
    safeAddress: string,
    oldOwner: string,
    newOwner: string
  ): Promise<SafeTransactionResult> => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await getProviderAndSigner();
      if (!result) return { success: false, error: 'Không thể kết nối ví' };
      
      const txResult = await swapOwner(safeAddress, oldOwner, newOwner, result.provider, result.signer);
      
      if (!txResult.success) {
        setError(txResult.error || 'Lỗi khi chuyển quyền sở hữu');
      }
      
      return txResult;
    } catch (err: any) {
      const errorMsg = err.message || 'Không thể chuyển quyền sở hữu';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, [getProviderAndSigner]);

  const handleAddOwner = useCallback(async (
    safeAddress: string,
    newOwner: string,
    threshold?: number
  ): Promise<SafeTransactionResult> => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await getProviderAndSigner();
      if (!result) return { success: false, error: 'Không thể kết nối ví' };
      
      const txResult = await addOwner(safeAddress, newOwner, threshold, result.provider, result.signer);
      
      if (!txResult.success) {
        setError(txResult.error || 'Lỗi khi thêm chủ sở hữu');
      }
      
      return txResult;
    } catch (err: any) {
      const errorMsg = err.message || 'Không thể thêm chủ sở hữu';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, [getProviderAndSigner]);

  const handleRemoveOwner = useCallback(async (
    safeAddress: string,
    ownerToRemove: string,
    threshold?: number
  ): Promise<SafeTransactionResult> => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await getProviderAndSigner();
      if (!result) return { success: false, error: 'Không thể kết nối ví' };
      
      const txResult = await removeOwner(safeAddress, ownerToRemove, threshold, result.provider, result.signer);
      
      if (!txResult.success) {
        setError(txResult.error || 'Lỗi khi gỡ bỏ chủ sở hữu');
      }
      
      return txResult;
    } catch (err: any) {
      const errorMsg = err.message || 'Không thể gỡ bỏ chủ sở hữu';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, [getProviderAndSigner]);

  const handleIsOwner = useCallback(async (
    safeAddress: string,
    ownerAddress: string
  ): Promise<boolean> => {
    try {
      const result = await getProviderAndSigner();
      if (!result) return false;
      
      return await isOwner(safeAddress, ownerAddress, result.provider);
    } catch (err) {
      console.error('Lỗi khi kiểm tra owner:', err);
      return false;
    }
  }, [getProviderAndSigner]);

  const handleExecuteTransaction = useCallback(async (
    safeAddress: string,
    to: string,
    value: string,
    data: string
  ): Promise<SafeTransactionResult> => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await getProviderAndSigner();
      if (!result) return { success: false, error: 'Không thể kết nối ví' };
      
      const txResult = await createSafeTransaction(safeAddress, to, value, data, result.provider, result.signer);
      
      if (!txResult.success) {
        setError(txResult.error || 'Lỗi khi thực thi giao dịch');
      }
      
      return txResult;
    } catch (err: any) {
      const errorMsg = err.message || 'Không thể thực thi giao dịch';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, [getProviderAndSigner]);

  return {
    loading,
    error,
    getSafeInfo: handleGetSafeInfo,
    setGuard: handleSetGuard,
    removeGuard: handleRemoveGuard,
    swapOwner: handleSwapOwner,
    addOwner: handleAddOwner,
    removeOwner: handleRemoveOwner,
    isOwner: handleIsOwner,
    executeTransaction: handleExecuteTransaction,
  };
}
