import { useQuery } from "@tanstack/react-query";
import { useAccount, usePublicClient } from "wagmi";
import { readTrade, scanEvents } from "@/lib/escrow";

const REFRESH_MS = 12_000; // khoảng một block Sepolia: trạng thái hiển thị gần như theo thời gian thực

export function useEvents() {
  const client = usePublicClient();
  return useQuery({
    queryKey: ["events"],
    queryFn: () => scanEvents(client!),
    enabled: !!client,
    refetchInterval: REFRESH_MS,
  });
}

export function useTrade(id: bigint | null) {
  const client = usePublicClient();
  const { address } = useAccount();
  return useQuery({
    queryKey: ["trade", id?.toString(), address],
    queryFn: () => readTrade(client!, id!, address),
    enabled: !!client && id !== null,
    refetchInterval: REFRESH_MS,
  });
}
