import { useState } from "react";
import { useAccount, usePublicClient, useSwitchChain, useWriteContract } from "wagmi";
import type { TransactionReceipt } from "viem";
import { useQueryClient } from "@tanstack/react-query";
import { escrowAbi } from "@/lib/abi";
import { CHAIN, ESCROW } from "@/lib/config";
import { errorMessage } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";

type EscrowFn = "createTrade" | "deposit" | "finalizeHandover" | "cancelBySeller" | "cancelByBuyer" | "cancelExpired" | "withdraw";

/** Mô phỏng trước (để báo lỗi rõ ràng, không tốn gas), gửi giao dịch, chờ xác nhận, rồi làm mới dữ liệu. */
export function useEscrowWrite() {
  const { address, chainId } = useAccount();
  const client = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const { switchChainAsync } = useSwitchChain();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [busy, setBusy] = useState<EscrowFn | null>(null);

  async function send(functionName: EscrowFn, args: readonly unknown[], value?: bigint): Promise<TransactionReceipt | null> {
    if (!address || !client) {
      toast({ title: "Chưa kết nối ví", variant: "destructive" });
      return null;
    }
    setBusy(functionName);
    try {
      if (chainId !== CHAIN.id) await switchChainAsync({ chainId: CHAIN.id });
      const call = { address: ESCROW, abi: escrowAbi, functionName, args, value, account: address } as never;
      await client.simulateContract(call);
      const hash = await writeContractAsync(call);
      toast({ title: "Đã gửi giao dịch", description: "Đang chờ mạng xác nhận…" });
      const receipt = await client.waitForTransactionReceipt({ hash });
      if (receipt.status !== "success") throw new Error("Giao dịch bị hoàn tác.");
      toast({ title: "Giao dịch thành công" });
      await queryClient.invalidateQueries();
      return receipt;
    } catch (e) {
      toast({ title: "Không thực hiện được", description: errorMessage(e), variant: "destructive" });
      return null;
    } finally {
      setBusy(null);
    }
  }

  return { send, busy };
}
