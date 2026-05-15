import { useCallback, useEffect, useMemo, useState } from "react";
import { useAccount, useChainId, useWalletClient } from "wagmi";
import {
  confirmSafeTransaction,
  deploySafeOnChain,
  executeSafeTransaction,
  getPendingSafeTransactions,
  getSafeDetails,
  getSafesByOwner,
  prepareSafeCreation,
  proposeNewTransaction,
  type PendingSafeTransaction,
  type SafeAccountSummary,
  type SafeControlDetails,
  type SafeCreationPayload,
  type SafeTransactionSignResult,
} from "@/lib/safe-control-panel";

function getEip1193(walletClient: any): unknown {
  if (!walletClient) return (window as any)?.ethereum;
  if (typeof walletClient.request === "function") return walletClient;
  const t = walletClient.transport;
  if (t && typeof t.request === "function") return t;
  return (window as any)?.ethereum;
}

export function useSafeControlPanel() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { data: walletClient } = useWalletClient();

  const [safes, setSafes] = useState<SafeAccountSummary[]>([]);
  const [selectedSafeAddress, setSelectedSafeAddress] = useState<string | null>(null);
  const [selectedSafeDetails, setSelectedSafeDetails] = useState<SafeControlDetails | null>(null);
  const [pendingTransactions, setPendingTransactions] = useState<PendingSafeTransaction[]>([]);
  const [preparedCreation, setPreparedCreation] = useState<SafeCreationPayload | null>(null);
  const [actionResult, setActionResult] = useState<SafeTransactionSignResult | null>(null);
  const [isLoadingSafes, setIsLoadingSafes] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [isActioning, setIsActioning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedSafe = useMemo(
    () => safes.find((s) => s.address === selectedSafeAddress) ?? null,
    [safes, selectedSafeAddress],
  );

  const refreshSafes = useCallback(async () => {
    if (!address || !isConnected) {
      setSafes([]);
      setSelectedSafeAddress(null);
      setSelectedSafeDetails(null);
      setPendingTransactions([]);
      return;
    }
    setIsLoadingSafes(true);
    setError(null);
    try {
      const list = await getSafesByOwner(address, chainId);
      setSafes(list);
      setSelectedSafeAddress((cur) => cur ?? list[0]?.address ?? null);
    } catch (err: any) {
      setError(err.message || "Could not load Safe accounts");
      setSafes([]);
    } finally {
      setIsLoadingSafes(false);
    }
  }, [address, chainId, isConnected]);

  const refreshSelectedSafe = useCallback(async () => {
    if (!selectedSafeAddress) {
      setSelectedSafeDetails(null);
      setPendingTransactions([]);
      return;
    }
    setIsLoadingDetails(true);
    setError(null);
    try {
      const provider = getEip1193(walletClient);
      const [details, pending] = await Promise.all([
        getSafeDetails(selectedSafeAddress, chainId, address, provider ?? undefined),
        getPendingSafeTransactions(selectedSafeAddress, chainId),
      ]);
      setSelectedSafeDetails(details);
      setPendingTransactions(pending);
    } catch (err: any) {
      setError(err.message || "Could not load Safe details");
      setSelectedSafeDetails(null);
      setPendingTransactions([]);
    } finally {
      setIsLoadingDetails(false);
    }
  }, [address, chainId, selectedSafeAddress, walletClient]);

  const prepareCreation = useCallback(
    (input: { owners: string[]; threshold: number; label?: string }) => {
      const payload = prepareSafeCreation({ ...input, chainId });
      setPreparedCreation(payload);
      return payload;
    },
    [chainId],
  );

  const deploySafe = useCallback(
    async (input: { owners: string[]; threshold: number }) => {
      if (!address) throw new Error("Wallet not connected");
      const provider = getEip1193(walletClient);
      if (!provider) throw new Error("No EIP-1193 provider");
      setIsDeploying(true);
      setError(null);
      try {
        const result = await deploySafeOnChain({
          owners: input.owners,
          threshold: input.threshold,
          chainId,
          eip1193Provider: provider,
          signerAddress: address,
        });
        await refreshSafes();
        return result;
      } catch (err: any) {
        setError(err.message || "Deployment failed");
        throw err;
      } finally {
        setIsDeploying(false);
      }
    },
    [address, chainId, walletClient, refreshSafes],
  );

  const proposeTransaction = useCallback(
    async (input: { to: string; value: string; data: string }) => {
      if (!selectedSafeAddress || !address) throw new Error("No Safe or wallet selected");
      const provider = getEip1193(walletClient);
      if (!provider) throw new Error("No EIP-1193 provider");
      setIsActioning(true);
      setError(null);
      try {
        const result = await proposeNewTransaction({
          safeAddress: selectedSafeAddress,
          to: input.to,
          value: input.value,
          data: input.data,
          chainId,
          eip1193Provider: provider,
          signerAddress: address,
        });
        setActionResult(result);
        if (!result.success) {
          setError(result.message);
          throw new Error(result.message);
        }
        await refreshSelectedSafe();
        return result;
      } catch (err: any) {
        setError(err.message || "Failed to propose transaction");
        throw err;
      } finally {
        setIsActioning(false);
      }
    },
    [address, chainId, selectedSafeAddress, walletClient, refreshSelectedSafe],
  );

  const confirmTransaction = useCallback(
    async (safeTxHash: string) => {
      if (!selectedSafeAddress || !address) throw new Error("No Safe or wallet selected");
      const provider = getEip1193(walletClient);
      if (!provider) throw new Error("No EIP-1193 provider");
      setIsActioning(true);
      setError(null);
      try {
        const result = await confirmSafeTransaction({
          safeAddress: selectedSafeAddress,
          safeTxHash,
          chainId,
          eip1193Provider: provider,
          signerAddress: address,
        });
        setActionResult(result);
        if (result.success) await refreshSelectedSafe();
        return result;
      } catch (err: any) {
        setError(err.message || "Failed to sign transaction");
        throw err;
      } finally {
        setIsActioning(false);
      }
    },
    [address, chainId, selectedSafeAddress, walletClient, refreshSelectedSafe],
  );

  const executeTransaction = useCallback(
    async (safeTxHash: string) => {
      if (!selectedSafeAddress || !address) throw new Error("No Safe or wallet selected");
      const provider = getEip1193(walletClient);
      if (!provider) throw new Error("No EIP-1193 provider");
      setIsActioning(true);
      setError(null);
      try {
        const result = await executeSafeTransaction({
          safeAddress: selectedSafeAddress,
          safeTxHash,
          chainId,
          eip1193Provider: provider,
          signerAddress: address,
        });
        setActionResult(result);
        if (result.success) await refreshSelectedSafe();
        return result;
      } catch (err: any) {
        setError(err.message || "Failed to execute transaction");
        throw err;
      } finally {
        setIsActioning(false);
      }
    },
    [address, chainId, selectedSafeAddress, walletClient, refreshSelectedSafe],
  );

  useEffect(() => {
    refreshSafes();
  }, [refreshSafes]);

  useEffect(() => {
    refreshSelectedSafe();
  }, [refreshSelectedSafe]);

  return {
    address,
    chainId,
    isConnected,
    safes,
    selectedSafe,
    selectedSafeAddress,
    selectedSafeDetails,
    pendingTransactions,
    preparedCreation,
    actionResult,
    isLoadingSafes,
    isLoadingDetails,
    isDeploying,
    isActioning,
    error,
    setSelectedSafeAddress,
    refreshSafes,
    refreshSelectedSafe,
    prepareCreation,
    deploySafe,
    proposeTransaction,
    confirmTransaction,
    executeTransaction,
    clearActionResult: () => setActionResult(null),
  };
}
