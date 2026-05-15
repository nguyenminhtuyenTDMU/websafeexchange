import Safe from "@safe-global/protocol-kit";
import SafeApiKit from "@safe-global/api-kit";
import { ethers } from "ethers";

export type SafeControlSource = "safe-api" | "demo-fallback" | "prepared-only";

export interface SafeAccountSummary {
  address: string;
  chainId: number;
  networkLabel: string;
  label?: string;
  source: SafeControlSource;
}

export interface SafeControlDetails {
  address: string;
  chainId: number;
  networkLabel: string;
  owners: string[];
  threshold: number;
  nonce?: number;
  balance?: string;
  version?: string;
  isConnectedWalletOwner: boolean;
  officialSafeUrl: string;
  source: SafeControlSource;
}

export type SafeTransactionStatus =
  | "waiting_signatures"
  | "ready_to_execute"
  | "executed"
  | "failed";

export interface PendingSafeTransaction {
  safeTxHash: string;
  to: string;
  value: string;
  dataSummary: string;
  nonce: number;
  confirmationsCount: number;
  requiredConfirmations: number;
  status: SafeTransactionStatus;
  source: SafeControlSource;
}

export interface SafeCreationPayload {
  owners: string[];
  threshold: number;
  chainId: number;
  networkLabel: string;
  label?: string;
  source: SafeControlSource;
  note: string;
}

export interface SafeTransactionSignResult {
  success: boolean;
  source: SafeControlSource;
  message: string;
  safeTxHash?: string;
  txHash?: string;
}

const CHAINS: Record<number, { label: string; safePrefix: string; txServiceUrl?: string }> = {
  1: {
    label: "Ethereum Mainnet",
    safePrefix: "eth",
    txServiceUrl: "https://safe-transaction-mainnet.safe.global",
  },
  11155111: {
    label: "Sepolia Testnet",
    safePrefix: "sep",
    txServiceUrl: "https://safe-transaction-sepolia.safe.global",
  },
};

export function getSafeControlChains() {
  return CHAINS;
}

export function isValidEthAddress(address: string): boolean {
  return ethers.isAddress(address);
}

export function formatSafeControlAddress(address: string): string {
  if (!address || address.length < 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function getNetworkLabel(chainId: number): string {
  return CHAINS[chainId]?.label ?? `Chain ${chainId}`;
}

export function getOfficialSafeUrl(safeAddress: string, chainId: number): string {
  const prefix = CHAINS[chainId]?.safePrefix ?? "sep";
  return `https://app.safe.global/home?safe=${prefix}:${safeAddress}`;
}

function getSafeServiceUrl(chainId: number): string {
  const serviceUrl = CHAINS[chainId]?.txServiceUrl;
  if (!serviceUrl) throw new Error(`Safe Transaction Service not configured for chain ${chainId}`);
  return serviceUrl;
}

function getApiKit(chainId: number): SafeApiKit {
  const txServiceUrl = CHAINS[chainId]?.txServiceUrl;
  const apiKey = typeof import.meta !== "undefined"
    ? (import.meta as any).env?.VITE_SAFE_API_KEY
    : undefined;
  return new SafeApiKit({
    chainId: BigInt(chainId),
    ...(txServiceUrl ? { txServiceUrl } : {}),
    ...(apiKey ? { apiKey } : {}),
  });
}

function getSafeErrorMessage(err: unknown, fallback: string): string {
  if (typeof err === "string" && err.trim()) return err;

  const anyErr = err as any;

  // Prioritise Safe Transaction Service response body (axios-style errors)
  const responseData = anyErr?.response?.data ?? anyErr?.data;
  if (responseData) {
    if (typeof responseData === "string" && responseData.trim()) return responseData;
    if (typeof responseData === "object") {
      const detail =
        responseData.detail ??
        responseData.message ??
        responseData.nonFieldErrors ??
        responseData.non_field_errors ??
        responseData.error;
      if (Array.isArray(detail) && detail.length > 0) return detail.join(", ");
      if (typeof detail === "string" && detail.trim()) return detail;
      const firstFieldError = Object.values(responseData).find((value) => {
        if (Array.isArray(value)) return (value as unknown[]).length > 0;
        return typeof value === "string" && (value as string).trim();
      });
      if (Array.isArray(firstFieldError)) return (firstFieldError as string[]).join(", ");
      if (typeof firstFieldError === "string") return firstFieldError;
    }
  }

  if (err instanceof Error) {
    // ethers v6 shortMessage is concise and avoids the verbose transaction dump
    const short = anyErr.shortMessage as string | undefined;
    if (short && short !== "Error") return short;
    // api-kit v4 may produce empty statusText — skip those, fall to fallback
    if (err.message && err.message !== "Error") return err.message;
    // ethers v6 revert reason
    if (anyErr.reason) return String(anyErr.reason);
  }

  const causeMessage = anyErr?.cause instanceof Error ? (anyErr.cause as Error).message : undefined;
  return causeMessage || fallback;
}

function isSafeNotFoundError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  return /not found|404/i.test(err.message);
}

function normalizeTransactionData(data: string): string {
  const normalized = data.trim() || "0x";
  if (!/^0x([0-9a-fA-F]{2})*$/.test(normalized)) {
    throw new Error("Call data must be valid hex bytes, for example 0x or 0xa9059cbb...");
  }
  return normalized;
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { headers: { accept: "application/json" } });
  if (!response.ok) throw new Error(`Safe API request failed: ${response.status}`);
  return response.json() as Promise<T>;
}

function buildDemoSafeAddress(ownerAddress: string): string {
  const hash = ethers.keccak256(ethers.toUtf8Bytes(`websafeexchange-demo:${ownerAddress.toLowerCase()}`));
  return ethers.getAddress(`0x${hash.slice(26)}`);
}

function getDemoSafesByOwner(ownerAddress: string, chainId: number): SafeAccountSummary[] {
  return [
    {
      address: buildDemoSafeAddress(ownerAddress),
      chainId,
      networkLabel: getNetworkLabel(chainId),
      label: "Testnet demo fallback",
      source: "demo-fallback",
    },
  ];
}

function getDemoDetails(safeAddress: string, chainId: number, connectedAddress?: string): SafeControlDetails {
  const normalizedConnected =
    connectedAddress && isValidEthAddress(connectedAddress) ? ethers.getAddress(connectedAddress) : undefined;
  const owners = normalizedConnected ? [normalizedConnected] : [];
  return {
    address: ethers.getAddress(safeAddress),
    chainId,
    networkLabel: getNetworkLabel(chainId),
    owners,
    threshold: 1,
    nonce: 0,
    balance: "0 ETH",
    version: "Demo fallback",
    isConnectedWalletOwner: !!normalizedConnected,
    officialSafeUrl: getOfficialSafeUrl(safeAddress, chainId),
    source: "demo-fallback",
  };
}


export async function getSafesByOwner(ownerAddress: string, chainId: number): Promise<SafeAccountSummary[]> {
  if (!isValidEthAddress(ownerAddress)) throw new Error("Invalid owner address");
  try {
    const baseUrl = getSafeServiceUrl(chainId);
    const owner = ethers.getAddress(ownerAddress);
    const data = await fetchJson<{ safes?: string[] }>(`${baseUrl}/api/v1/owners/${owner}/safes/`);
    const safes = data.safes ?? [];
    if (safes.length === 0) return [];
    return safes.map((addr) => ({
      address: ethers.getAddress(addr),
      chainId,
      networkLabel: getNetworkLabel(chainId),
      source: "safe-api",
    }));
  } catch (error) {
    console.warn("Safe list API unavailable, using demo fallback:", error);
    return getDemoSafesByOwner(ownerAddress, chainId);
  }
}

export async function getSafeDetails(
  safeAddress: string,
  chainId: number,
  connectedAddress?: string,
  eip1193Provider?: unknown,
): Promise<SafeControlDetails> {
  if (!isValidEthAddress(safeAddress)) throw new Error("Invalid Safe address");
  const safe = ethers.getAddress(safeAddress);
  const normalizedConnected =
    connectedAddress && isValidEthAddress(connectedAddress) ? ethers.getAddress(connectedAddress) : undefined;

  // Primary: read directly from blockchain via Safe SDK + ethers
  if (eip1193Provider) {
    try {
      const ethersProvider = new ethers.BrowserProvider(eip1193Provider as any);
      const safeSdk = await Safe.init({ provider: eip1193Provider as any, safeAddress: safe });

      const [owners, threshold, nonce, balanceWei] = await Promise.all([
        safeSdk.getOwners(),
        safeSdk.getThreshold(),
        safeSdk.getNonce(),
        ethersProvider.getBalance(safe),
      ]);

      const balance = `${parseFloat(ethers.formatEther(balanceWei)).toFixed(6)} ETH`;

      return {
        address: safe,
        chainId,
        networkLabel: getNetworkLabel(chainId),
        owners,
        threshold,
        nonce,
        balance,
        isConnectedWalletOwner:
          !!normalizedConnected && owners.map((o) => o.toLowerCase()).includes(normalizedConnected.toLowerCase()),
        officialSafeUrl: getOfficialSafeUrl(safe, chainId),
        source: "safe-api",
      };
    } catch (err) {
      console.warn("Blockchain fetch failed, falling back to Safe API:", err);
    }
  }

  // Fallback: Safe Transaction Service REST API
  try {
    const baseUrl = getSafeServiceUrl(chainId);
    const [data, balances] = await Promise.all([
      fetchJson<{
        address?: string;
        owners?: Array<string | { value?: string }>;
        threshold?: number;
        nonce?: number;
        version?: string;
      }>(`${baseUrl}/api/v1/safes/${safe}/`),
      fetchJson<Array<{ tokenAddress: string | null; balance: string }>>(
        `${baseUrl}/api/v1/safes/${safe}/balances/?trusted=False&exclude_spam=True`,
      ).catch(() => [] as Array<{ tokenAddress: string | null; balance: string }>),
    ]);

    const owners = (data.owners ?? [])
      .map((o) => (typeof o === "string" ? o : o.value))
      .filter((o): o is string => !!o && isValidEthAddress(o))
      .map((o) => ethers.getAddress(o));

    const nativeEntry = balances.find((b) => b.tokenAddress === null);
    const balance = nativeEntry
      ? `${parseFloat(ethers.formatEther(nativeEntry.balance)).toFixed(6)} ETH`
      : "0 ETH";

    return {
      address: ethers.getAddress(data.address ?? safe),
      chainId,
      networkLabel: getNetworkLabel(chainId),
      owners,
      threshold: data.threshold ?? 0,
      nonce: data.nonce,
      balance,
      version: data.version,
      isConnectedWalletOwner: !!normalizedConnected && owners.includes(normalizedConnected),
      officialSafeUrl: getOfficialSafeUrl(safe, chainId),
      source: "safe-api",
    };
  } catch (error) {
    console.warn("Safe API unavailable, using minimal fallback:", error);
    return getDemoDetails(safeAddress, chainId, connectedAddress);
  }
}

export async function getPendingSafeTransactions(
  safeAddress: string,
  chainId: number,
): Promise<PendingSafeTransaction[]> {
  if (!isValidEthAddress(safeAddress)) throw new Error("Invalid Safe address");
  const safe = ethers.getAddress(safeAddress);
  try {
    const apiKit = getApiKit(chainId);
    const result = await apiKit.getPendingTransactions(safe);

    return (result.results ?? []).map((tx) => {
      const confirmationsCount = tx.confirmations?.length ?? 0;
      const requiredConfirmations = tx.confirmationsRequired ?? 1;
      const executed = !!(tx as any).executionDate;
      const failed = executed && (tx as any).isSuccessful === false;
      const status: SafeTransactionStatus = failed
        ? "failed"
        : executed
          ? "executed"
          : confirmationsCount >= requiredConfirmations
            ? "ready_to_execute"
            : "waiting_signatures";

      return {
        safeTxHash: tx.safeTxHash ?? "unknown",
        to: tx.to ?? "unknown",
        value: tx.value ? `${parseFloat(ethers.formatEther(tx.value)).toFixed(6)} ETH` : "0 ETH",
        dataSummary: tx.data && tx.data !== "0x" ? `${tx.data.slice(0, 18)}...` : "ETH transfer",
        nonce: Number(tx.nonce ?? 0),
        confirmationsCount,
        requiredConfirmations,
        status,
        source: "safe-api",
      };
    });
  } catch (error) {
    if (!isSafeNotFoundError(error)) {
      console.warn("getPendingTransactions failed:", error);
    }
    return [];
  }
}

export function prepareSafeCreation(input: {
  owners: string[];
  threshold: number;
  chainId: number;
  label?: string;
}): SafeCreationPayload {
  const owners = input.owners.map((o) => o.trim()).filter(Boolean);
  const invalid = owners.filter((o) => !isValidEthAddress(o));
  if (owners.length === 0) throw new Error("At least one owner address is required");
  if (invalid.length > 0) throw new Error(`Invalid owner address: ${invalid[0]}`);
  if (input.threshold < 1 || input.threshold > owners.length)
    throw new Error("Threshold must be between 1 and the number of owners");
  return {
    owners: owners.map((o) => ethers.getAddress(o)),
    threshold: input.threshold,
    chainId: input.chainId,
    networkLabel: getNetworkLabel(input.chainId),
    label: input.label?.trim() || undefined,
    source: "prepared-only",
    note: "Configuration validated. Click Deploy to create the Safe on-chain.",
  };
}

// --- On-chain Safe deployment via protocol-kit v6 ---

export async function deploySafeOnChain(input: {
  owners: string[];
  threshold: number;
  chainId: number;
  eip1193Provider: unknown;
  signerAddress: string;
}): Promise<{ address: string }> {
  const owners = input.owners.map((o) => ethers.getAddress(o));

  // protocol-kit v6: init with predictedSafe gives an undeployed Safe instance
  const safeSdk = await Safe.init({
    provider: input.eip1193Provider as any,
    signer: input.signerAddress,
    predictedSafe: {
      safeAccountConfig: { owners, threshold: input.threshold },
    },
  });

  const deployTx = await safeSdk.createSafeDeploymentTransaction();
  const ethersProvider = new ethers.BrowserProvider(input.eip1193Provider as any);
  const signer = await ethersProvider.getSigner();
  const txResponse = await signer.sendTransaction({
    to: deployTx.to,
    value: BigInt(deployTx.value),
    data: deployTx.data as `0x${string}`,
  });
  await txResponse.wait();

  const address = await safeSdk.getAddress();
  return { address };
}

// --- Propose a new multisig transaction ---

export async function proposeNewTransaction(input: {
  safeAddress: string;
  to: string;
  value: string;
  data: string;
  chainId: number;
  eip1193Provider: unknown;
  signerAddress: string;
}): Promise<SafeTransactionSignResult> {
  try {
    const safeAddress = ethers.getAddress(input.safeAddress);
    const signerAddress = ethers.getAddress(input.signerAddress);
    const to = ethers.getAddress(input.to);
    const value = BigInt(input.value || "0");
    if (value < BigInt(0)) throw new Error("Transaction value cannot be negative");
    const data = normalizeTransactionData(input.data);

    let safe: Safe;
    try {
      safe = await Safe.init({
        provider: input.eip1193Provider as any,
        signer: signerAddress,
        safeAddress,
      });
    } catch (initErr: any) {
      const short = initErr?.shortMessage as string | undefined;
      const detail = (short && short !== "Error") ? short
        : (initErr?.message && initErr.message !== "Error") ? initErr.message
        : null;
      throw new Error(
        detail
          ? `Không thể kết nối Safe contract: ${detail}`
          : "Safe contract không tồn tại trên mạng này. Kiểm tra địa chỉ ví Safe và chain đang kết nối.",
      );
    }

    let isOwner: boolean;
    try {
      isOwner = await safe.isOwner(signerAddress);
    } catch {
      throw new Error("Không thể xác minh quyền owner. Safe chưa được deploy hoặc mạng không hỗ trợ.");
    }
    if (!isOwner) throw new Error("Ví kết nối không phải là owner của Safe này");

    const safeTransaction = await safe.createTransaction({
      transactions: [{ to, value: value.toString(), data }],
    });

    const safeTxHash = await safe.getTransactionHash(safeTransaction);
    const signedTx = await safe.signTransaction(safeTransaction);
    const signature = signedTx.getSignature(signerAddress);
    if (!signature?.data) throw new Error("Ví không trả về chữ ký hợp lệ. Vui lòng thử lại hoặc kiểm tra kết nối ví.");

    const apiKit = getApiKit(input.chainId);
    await apiKit.proposeTransaction({
      safeAddress,
      safeTransactionData: safeTransaction.data,
      safeTxHash,
      senderAddress: signerAddress,
      senderSignature: signature.data,
      origin: "WebSafeExchange Safe Control",
    });

    return {
      success: true,
      safeTxHash,
      source: "safe-api",
      message: "Transaction proposed and your signature submitted.",
    };
  } catch (err: any) {
    return {
      success: false,
      source: "prepared-only",
      message: getSafeErrorMessage(err, "Failed to propose transaction"),
    };
  }
}

// --- Confirm (add signature to) an existing pending transaction ---

export async function confirmSafeTransaction(input: {
  safeAddress: string;
  safeTxHash: string;
  chainId: number;
  eip1193Provider: unknown;
  signerAddress: string;
}): Promise<SafeTransactionSignResult> {
  try {
    const safe = await Safe.init({
      provider: input.eip1193Provider as any,
      signer: input.signerAddress,
      safeAddress: ethers.getAddress(input.safeAddress),
    });

    const apiKit = getApiKit(input.chainId);
    const tx = await apiKit.getTransaction(input.safeTxHash);
    const signature = await safe.signHash(input.safeTxHash);
    await apiKit.confirmTransaction(input.safeTxHash, signature.data);

    void tx;
    return {
      success: true,
      safeTxHash: input.safeTxHash,
      source: "safe-api",
      message: "Signature added successfully.",
    };
  } catch (err: any) {
    return {
      success: false,
      safeTxHash: input.safeTxHash,
      source: "prepared-only",
      message: err.message || "Failed to confirm transaction",
    };
  }
}

// --- Execute a ready transaction ---

export async function executeSafeTransaction(input: {
  safeAddress: string;
  safeTxHash: string;
  chainId: number;
  eip1193Provider: unknown;
  signerAddress: string;
}): Promise<SafeTransactionSignResult> {
  try {
    const safe = await Safe.init({
      provider: input.eip1193Provider as any,
      signer: input.signerAddress,
      safeAddress: ethers.getAddress(input.safeAddress),
    });

    const apiKit = getApiKit(input.chainId);
    const safeTransaction = await apiKit.getTransaction(input.safeTxHash);

    const execResponse = await safe.executeTransaction(safeTransaction as any);
    const txHash = (execResponse as any).hash ?? (execResponse as any).transactionResponse?.hash;

    return {
      success: true,
      safeTxHash: input.safeTxHash,
      txHash,
      source: "safe-api",
      message: `Transaction executed. Hash: ${txHash ?? "pending"}`,
    };
  } catch (err: any) {
    return {
      success: false,
      safeTxHash: input.safeTxHash,
      source: "prepared-only",
      message: err.message || "Failed to execute transaction",
    };
  }
}
