import Safe from "@safe-global/protocol-kit";
import SafeApiKit from "@safe-global/api-kit";
import { ethers } from "ethers";

const SAFE_API_URLS: Record<number, string> = {
  1: "https://safe-transaction-mainnet.safe.global",
  11155111: "https://safe-transaction-sepolia.safe.global",
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

function getEip1193Provider(provider?: ethers.BrowserProvider): any {
  const fromWindow = typeof window !== "undefined" ? (window as any).ethereum : undefined;
  const candidate = (provider as any)?.provider || provider || fromWindow;

  if (!candidate) throw new Error("Wallet is not connected");

  // If it already has request, use as-is
  if (typeof candidate.request === "function") return candidate;

  // ethers BrowserProvider exposes .send; wrap to request
  if (typeof candidate.send === "function") {
    return {
      request: ({ method, params }: { method: string; params?: any[] | object }) =>
        candidate.send(method, (params as any[]) ?? []),
    };
  }

  throw new Error("Wallet provider missing request");
}

async function getSignerAddress(signer?: ethers.Signer | string): Promise<string | undefined> {
  if (!signer) return undefined;
  if (typeof signer === "string") return signer;
  if (typeof (signer as any).getAddress === "function") {
    return signer.getAddress();
  }
  return signer as unknown as string;
}

async function buildSafeInstance(
  safeAddress: string,
  provider?: ethers.BrowserProvider,
  signer?: ethers.Signer,
): Promise<Safe> {
  const eip1193Provider = getEip1193Provider(provider);
  const signerAddress = await getSignerAddress(signer);
  return Safe.init({
    provider: eip1193Provider,
    signer: signerAddress,
    safeAddress,
  });
}

async function waitForTx(txResult: { transactionResponse?: any }) {
  const maybeTx = txResult?.transactionResponse;
  if (maybeTx && typeof maybeTx.wait === "function") {
    await maybeTx.wait();
  }
}

export async function getSafeApiKit(chainId: number): Promise<SafeApiKit | null> {
  const txServiceUrl = SAFE_API_URLS[chainId];
  if (!txServiceUrl) {
    console.warn(`Safe API khong ho tro chain ${chainId}`);
    return null;
  }

  return new SafeApiKit({
    chainId: BigInt(chainId),
    txServiceUrl,
  });
}

export async function getSafeInfo(
  safeAddress: string,
  provider: ethers.BrowserProvider,
): Promise<SafeInfo> {
  const safe = await buildSafeInstance(safeAddress, provider);

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
  signer: ethers.Signer,
): Promise<SafeTransactionResult> {
  try {
    const safe = await buildSafeInstance(safeAddress, provider, signer);

    // Force a small non-zero safeTxGas to avoid GS013 reverts from the Safe backend
    const safeTransaction = await safe.createEnableGuardTx(guardAddress, { safeTxGas: "1" });

    const txResponse = await safe.executeTransaction(safeTransaction);
    await waitForTx(txResponse);

    return {
      success: true,
      txHash: txResponse.hash,
    };
  } catch (error: any) {
    console.error("Error setting guard:", error);
    return {
      success: false,
      error: error.message || "Unable to set Guard for Safe",
    };
  }
}

export async function removeGuardFromSafe(
  safeAddress: string,
  provider: ethers.BrowserProvider,
  signer: ethers.Signer,
): Promise<SafeTransactionResult> {
  try {
    const safe = await buildSafeInstance(safeAddress, provider, signer);

    const safeTransaction = await safe.createDisableGuardTx();

    const txResponse = await safe.executeTransaction(safeTransaction);
    await waitForTx(txResponse);

    return {
      success: true,
      txHash: txResponse.hash,
    };
  } catch (error: any) {
    console.error("Error removing guard:", error);
    return {
      success: false,
      error: error.message || "Unable to remove Guard from Safe",
    };
  }
}

export async function swapOwner(
  safeAddress: string,
  oldOwner: string,
  newOwner: string,
  provider: ethers.BrowserProvider,
  signer: ethers.Signer,
): Promise<SafeTransactionResult> {
  try {
    const safe = await buildSafeInstance(safeAddress, provider, signer);

    const safeTransaction = await safe.createSwapOwnerTx({
      oldOwnerAddress: oldOwner,
      newOwnerAddress: newOwner,
    });

    const txResponse = await safe.executeTransaction(safeTransaction);
    await waitForTx(txResponse);

    return {
      success: true,
      txHash: txResponse.hash,
    };
  } catch (error: any) {
    console.error("Error swapping owner:", error);
    return {
      success: false,
      error: error.message || "Unable to transfer ownership",
    };
  }
}

export async function addOwner(
  safeAddress: string,
  newOwner: string,
  threshold?: number,
  provider?: ethers.BrowserProvider,
  signer?: ethers.Signer,
): Promise<SafeTransactionResult> {
  try {
    if (!provider || !signer) {
      return { success: false, error: "Provider and signer are required" };
    }

    const safe = await buildSafeInstance(safeAddress, provider, signer);

    const safeTransaction = await safe.createAddOwnerTx({
      ownerAddress: newOwner,
      threshold,
    });

    const txResponse = await safe.executeTransaction(safeTransaction);
    await waitForTx(txResponse);

    return {
      success: true,
      txHash: txResponse.hash,
    };
  } catch (error: any) {
    console.error("Error adding owner:", error);
    return {
      success: false,
      error: error.message || "Unable to add new owner",
    };
  }
}

export async function removeOwner(
  safeAddress: string,
  ownerToRemove: string,
  threshold?: number,
  provider?: ethers.BrowserProvider,
  signer?: ethers.Signer,
): Promise<SafeTransactionResult> {
  try {
    if (!provider || !signer) {
      return { success: false, error: "Provider and signer are required" };
    }

    const safe = await buildSafeInstance(safeAddress, provider, signer);

    const safeTransaction = await safe.createRemoveOwnerTx({
      ownerAddress: ownerToRemove,
      threshold,
    });

    const txResponse = await safe.executeTransaction(safeTransaction);
    await waitForTx(txResponse);

    return {
      success: true,
      txHash: txResponse.hash,
    };
  } catch (error: any) {
    console.error("Error removing owner:", error);
    return {
      success: false,
      error: error.message || "Unable to remove owner",
    };
  }
}

export async function isOwner(
  safeAddress: string,
  address: string,
  provider: ethers.BrowserProvider,
): Promise<boolean> {
  try {
    const safe = await buildSafeInstance(safeAddress, provider);
    return await safe.isOwner(address);
  } catch (error) {
    console.error("Error checking owner:", error);
    return false;
  }
}

export async function createSafeTransaction(
  safeAddress: string,
  to: string,
  value: string,
  data: string,
  provider: ethers.BrowserProvider,
  signer: ethers.Signer,
): Promise<SafeTransactionResult> {
  try {
    const safe = await buildSafeInstance(safeAddress, provider, signer);

    const safeTransactionData = {
      to,
      value,
      data,
      operation: 0, // CALL
    };

    const safeTransaction = await safe.createTransaction({ transactions: [safeTransactionData] });

    const txResponse = await safe.executeTransaction(safeTransaction);
    await waitForTx(txResponse);

    return {
      success: true,
      txHash: txResponse.hash,
    };
  } catch (error: any) {
    console.error("Error creating Safe transaction:", error);
    return {
      success: false,
      error: error.message || "Unable to create Safe transaction",
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
