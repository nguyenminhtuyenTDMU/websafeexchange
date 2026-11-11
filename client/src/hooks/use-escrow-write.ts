import { createElement, useState } from "react";
import { useAccount, useConnect, usePublicClient, useSwitchChain, useWriteContract } from "wagmi";
import type { TransactionReceipt } from "viem";
import { formatEther } from "viem";
import { useQueryClient } from "@tanstack/react-query";
import { escrowAbi } from "@/lib/abi";
import { CHAIN, ESCROW, explorerTx } from "@/lib/config";
import { errorMessage } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";

type EscrowFn = "createTrade" | "deposit" | "finalizeHandover" | "cancelBySeller" | "cancelByBuyer" | "cancelExpired" | "withdraw";

/** Thông báo theo đúng hành động vừa xong. */
const DONE: Record<EscrowFn, (value?: bigint) => string> = {
  createTrade: () => "Đã niêm yết ví",
  deposit: (v) => `Đã nạp ${v !== undefined ? formatEther(v) : ""} ETH, ví bắt đầu đóng băng`,
  finalizeHandover: () => "Đã bàn giao ví, tiền được ghi có cho người bán",
  cancelBySeller: () => "Đã hủy giao dịch",
  cancelByBuyer: () => "Đã hủy giao dịch, tiền được ghi có lại cho người mua",
  cancelExpired: () => "Đã hủy giao dịch quá hạn",
  withdraw: () => "Đã rút tiền về ví",
};

const txLink = (hash: string) =>
  createElement("a", { href: explorerTx(hash), target: "_blank", rel: "noreferrer", className: "underline underline-offset-4" }, "Xem giao dịch");

/** Mô phỏng trước (để báo lỗi rõ ràng, không tốn gas), gửi giao dịch, chờ xác nhận, rồi làm mới dữ liệu. */
export function useEscrowWrite() {
  const { address, chainId } = useAccount();
  const { connect, connectors } = useConnect();
  const client = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const { switchChainAsync } = useSwitchChain();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [busy, setBusy] = useState<EscrowFn | null>(null);

  async function send(functionName: EscrowFn, args: readonly unknown[], value?: bigint): Promise<TransactionReceipt | null> {
    if (!address) {
      // chưa kết nối: mở ví để kết nối thay vì báo lỗi
      connect({ connector: connectors[0] });
      toast({ title: "Kết nối ví rồi bấm lại" });
      return null;
    }
    if (!client) return null;
    setBusy(functionName);
    try {
      if (chainId !== CHAIN.id) await switchChainAsync({ chainId: CHAIN.id });
      const call = { address: ESCROW, abi: escrowAbi, functionName, args, value, account: address } as never;
      await client.simulateContract(call);
      const hash = await writeContractAsync(call);
      toast({ title: "Đã gửi giao dịch", description: "Đang chờ mạng xác nhận…" });
      const receipt = await client.waitForTransactionReceipt({ hash });
      if (receipt.status !== "success") throw new Error("Giao dịch bị hoàn tác.");
      toast({ title: DONE[functionName](value), description: txLink(hash) });
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
