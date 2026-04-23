import { useState, useEffect } from "react";
import { useAccount, useSignMessage } from "wagmi";
import { buildAuthPayload } from "@/lib/web3-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { User } from "@shared/schema";

export function UserProfileDialog() {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  const { data: profile } = useQuery<User>({
    queryKey: ["/api/users/profile", address],
    queryFn: () =>
      fetch(`/api/users/profile?address=${address}`).then((r) => r.json()),
    enabled: !!address && isConnected,
  });

  // Show dialog when wallet connects and user has no display name yet
  useEffect(() => {
    if (isConnected && profile && !profile.displayName) {
      setOpen(true);
    }
  }, [isConnected, profile]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!address) throw new Error("Ví chưa được kết nối");
      // Ký để chứng minh quyền sở hữu địa chỉ ví trước khi update tên
      const auth = await buildAuthPayload(signMessageAsync, "update-profile", address.toLowerCase());
      return apiRequest("PATCH", "/api/users/profile", {
        address,
        displayName: name.trim(),
        ...auth,
      }).then((r) => r.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users/profile", address] });
      toast({ title: "Đã lưu tên hiển thị!" });
      setOpen(false);
    },
    onError: () =>
      toast({ title: "Lưu thất bại", variant: "destructive" }),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast({ title: "Vui lòng nhập tên", variant: "destructive" });
      return;
    }
    mutation.mutate();
  }

  if (!isConnected) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCircle className="h-5 w-5 text-primary" />
            Đặt tên hiển thị
          </DialogTitle>
          <DialogDescription>
            Tên này sẽ được hiển thị khi bạn đăng bài hoặc bình luận trên diễn đàn.
            Bạn có thể thay đổi bất cứ lúc nào.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4 mt-2">
          <div className="space-y-1">
            <Label htmlFor="display-name">Tên hiển thị</Label>
            <Input
              id="display-name"
              placeholder="Ví dụ: Alice, SafeTrader, Ẩn danh..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={50}
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              Địa chỉ ví: {address?.slice(0, 10)}...{address?.slice(-6)}
            </p>
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Bỏ qua
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Đang lưu..." : "Lưu tên"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Hook dùng ở forum để lấy display name của người dùng hiện tại
export function useDisplayName(): string {
  const { address, isConnected } = useAccount();
  const { data: profile } = useQuery<User>({
    queryKey: ["/api/users/profile", address],
    queryFn: () =>
      fetch(`/api/users/profile?address=${address}`).then((r) => r.json()),
    enabled: !!address && isConnected,
  });
  return profile?.displayName ?? "";
}
