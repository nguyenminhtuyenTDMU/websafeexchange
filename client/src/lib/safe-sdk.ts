import Safe from '@safe-global/protocol-kit';
import SafeApiKit from '@safe-global/api-kit';
import { ethers } from 'ethers';

const SAFE_API_URLS: Record<number, string> = {
  1: 'https://safe-transaction-mainnet.safe.global',
  11155111: 'https://safe-transaction-sepolia.safe.global',
};

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

export async function getSafeApiKit(chainId: number): Promise<SafeApiKit | null> {
  const txServiceUrl = SAFE_API_URLS[chainId];
  if (!txServiceUrl) {
    console.warn(`Safe API không hỗ trợ chain ${chainId}`);
    return null;
  }
  
  return new SafeApiKit({
    chainId: BigInt(chainId),
    txServiceUrl: txServiceUrl,
  });
}

export async function initializeSafe(
  safeAddress: string,
  provider: ethers.BrowserProvider,
  signer: ethers.Signer
): Promise<Safe> {
  const safe = await Safe.init({
    provider: provider,
    signer: signer,
    safeAddress: safeAddress,
  });
  
  return safe;
}

export async function getSafeInfo(
  safeAddress: string,
  provider: ethers.BrowserProvider
): Promise<SafeInfo> {
  const safe = await Safe.init({
    provider: provider,
    safeAddress: safeAddress,
  });
  
  const [owners, threshold, nonce, modules] = await Promise.all([
    safe.getOwners(),
    safe.getThreshold(),
    safe.getNonce(),
    safe.getModules(),
  ]);
  
  const guard = await safe.getGuard();
  const fallbackHandler = await safe.getFallbackHandler();
  
  return {
    address: safeAddress,
    owners,
    threshold,
    nonce,
    modules,
    guard: guard === ethers.ZeroAddress ? null : guard,
    fallbackHandler: fallbackHandler === ethers.ZeroAddress ? null : fallbackHandler,
  };
}

export async function setGuardOnSafe(
  safeAddress: string,
  guardAddress: string,
  provider: ethers.BrowserProvider,
  signer: ethers.Signer
): Promise<SafeTransactionResult> {
  try {
    const safe = await initializeSafe(safeAddress, provider, signer);
    
    const safeTransaction = await safe.createEnableGuardTx(guardAddress);
    
    const txResponse = await safe.executeTransaction(safeTransaction);
    await txResponse.transactionResponse?.wait();
    
    return {
      success: true,
      txHash: txResponse.hash,
    };
  } catch (error: any) {
    console.error('Lỗi khi set Guard:', error);
    return {
      success: false,
      error: error.message || 'Không thể thiết lập Guard cho Safe',
    };
  }
}

export async function removeGuardFromSafe(
  safeAddress: string,
  provider: ethers.BrowserProvider,
  signer: ethers.Signer
): Promise<SafeTransactionResult> {
  try {
    const safe = await initializeSafe(safeAddress, provider, signer);
    
    const safeTransaction = await safe.createDisableGuardTx();
    
    const txResponse = await safe.executeTransaction(safeTransaction);
    await txResponse.transactionResponse?.wait();
    
    return {
      success: true,
      txHash: txResponse.hash,
    };
  } catch (error: any) {
    console.error('Lỗi khi remove Guard:', error);
    return {
      success: false,
      error: error.message || 'Không thể gỡ bỏ Guard khỏi Safe',
    };
  }
}

export async function swapOwner(
  safeAddress: string,
  oldOwner: string,
  newOwner: string,
  provider: ethers.BrowserProvider,
  signer: ethers.Signer
): Promise<SafeTransactionResult> {
  try {
    const safe = await initializeSafe(safeAddress, provider, signer);
    
    const safeTransaction = await safe.createSwapOwnerTx({
      oldOwnerAddress: oldOwner,
      newOwnerAddress: newOwner,
    });
    
    const txResponse = await safe.executeTransaction(safeTransaction);
    await txResponse.transactionResponse?.wait();
    
    return {
      success: true,
      txHash: txResponse.hash,
    };
  } catch (error: any) {
    console.error('Lỗi khi swap owner:', error);
    return {
      success: false,
      error: error.message || 'Không thể chuyển quyền sở hữu',
    };
  }
}

export async function addOwner(
  safeAddress: string,
  newOwner: string,
  threshold?: number,
  provider?: ethers.BrowserProvider,
  signer?: ethers.Signer
): Promise<SafeTransactionResult> {
  try {
    if (!provider || !signer) {
      return { success: false, error: 'Provider và Signer là bắt buộc' };
    }
    
    const safe = await initializeSafe(safeAddress, provider, signer);
    
    const safeTransaction = await safe.createAddOwnerTx({
      ownerAddress: newOwner,
      threshold: threshold,
    });
    
    const txResponse = await safe.executeTransaction(safeTransaction);
    await txResponse.transactionResponse?.wait();
    
    return {
      success: true,
      txHash: txResponse.hash,
    };
  } catch (error: any) {
    console.error('Lỗi khi thêm owner:', error);
    return {
      success: false,
      error: error.message || 'Không thể thêm chủ sở hữu mới',
    };
  }
}

export async function removeOwner(
  safeAddress: string,
  ownerToRemove: string,
  threshold?: number,
  provider?: ethers.BrowserProvider,
  signer?: ethers.Signer
): Promise<SafeTransactionResult> {
  try {
    if (!provider || !signer) {
      return { success: false, error: 'Provider và Signer là bắt buộc' };
    }
    
    const safe = await initializeSafe(safeAddress, provider, signer);
    
    const safeTransaction = await safe.createRemoveOwnerTx({
      ownerAddress: ownerToRemove,
      threshold: threshold,
    });
    
    const txResponse = await safe.executeTransaction(safeTransaction);
    await txResponse.transactionResponse?.wait();
    
    return {
      success: true,
      txHash: txResponse.hash,
    };
  } catch (error: any) {
    console.error('Lỗi khi remove owner:', error);
    return {
      success: false,
      error: error.message || 'Không thể gỡ bỏ chủ sở hữu',
    };
  }
}

export async function isOwner(
  safeAddress: string,
  address: string,
  provider: ethers.BrowserProvider
): Promise<boolean> {
  try {
    const safe = await Safe.init({
      provider: provider,
      safeAddress: safeAddress,
    });
    
    return await safe.isOwner(address);
  } catch (error) {
    console.error('Lỗi khi kiểm tra owner:', error);
    return false;
  }
}

export async function createSafeTransaction(
  safeAddress: string,
  to: string,
  value: string,
  data: string,
  provider: ethers.BrowserProvider,
  signer: ethers.Signer
): Promise<SafeTransactionResult> {
  try {
    const safe = await initializeSafe(safeAddress, provider, signer);
    
    const safeTransactionData = {
      to,
      value,
      data,
    };
    
    const safeTransaction = await safe.createTransaction({ transactions: [safeTransactionData] });
    
    const txResponse = await safe.executeTransaction(safeTransaction);
    await txResponse.transactionResponse?.wait();
    
    return {
      success: true,
      txHash: txResponse.hash,
    };
  } catch (error: any) {
    console.error('Lỗi khi tạo Safe transaction:', error);
    return {
      success: false,
      error: error.message || 'Không thể tạo giao dịch Safe',
    };
  }
}

export function formatSafeAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function isValidAddress(address: string): boolean {
  return ethers.isAddress(address);
}
