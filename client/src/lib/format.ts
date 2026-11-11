import { BaseError, ContractFunctionRevertedError, formatEther } from "viem";

export const shortAddr = (a?: string) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "");
export const eth = (wei: bigint) => `${formatEther(wei)} ETH`;
export const dateTime = (unix: bigint) =>
  new Date(Number(unix) * 1000).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });
export const isExpired = (deadline: bigint) => BigInt(Math.floor(Date.now() / 1000)) > deadline;

export const STATUS_LABEL: Record<string, string> = {
  OPEN: "Đang mở", FUNDED: "Đã nạp tiền", COMPLETED: "Hoàn tất", CANCELLED: "Đã hủy",
};

const ERRORS: Record<string, string> = {
  InvalidParams: "Tham số không hợp lệ (người mua, giá, tập owner mới hoặc ngưỡng ký).",
  UnknownVerifier: "Bộ xác minh ví không tồn tại.",
  UnknownAssetChecker: "Loại tài sản không được hỗ trợ.",
  UnsupportedWallet: "Ví không phải Safe chính thức.",
  NotController: "Tài khoản đang kết nối không phải owner của ví.",
  WalletBusy: "Ví đang có một giao dịch khác chưa kết thúc.",
  AssetNotHeld: "Ví không giữ một tài sản trong danh sách chào bán.",
  AssetNotOffered: "Có tài sản kỳ vọng không nằm trong danh sách người bán chào.",
  InvalidState: "Giao dịch không ở trạng thái cho phép thao tác này.",
  NotSeller: "Chỉ người bán được làm thao tác này.",
  NotBuyer: "Chỉ người mua được làm thao tác này.",
  WrongAmount: "Số tiền nạp không đúng giá.",
  TermsMismatch: "Điều kiện giao dịch đã bị thay đổi so với lúc bạn xem. Hãy tải lại trang.",
  DeadlinePassed: "Đã quá hạn chót.",
  DeadlineNotPassed: "Chưa đến hạn chót.",
  WalletNotReady: "Ví chưa sẵn sàng hoặc thiếu tài sản. Xem trợ lý bàn giao.",
  WalletChangedSinceFunding: "Ví đã có giao dịch sau khi người mua nạp tiền, không thể bàn giao.",
  HandoverCallFailed: "Một bước đổi owner trong ví thất bại.",
  HandoverNotClean: "Sau khi đổi owner, ví vẫn chưa sạch hoặc thiếu tài sản.",
  NoSuspiciousActivity: "Ví không bị thay đổi và còn đủ tài sản nên chưa thể hủy.",
  NothingToWithdraw: "Không có khoản nào để rút.",
  TransferFailed: "Chuyển tiền thất bại.",
};

/** Lấy thông báo dễ hiểu từ lỗi revert của hợp đồng hoặc lỗi ví. */
export function errorMessage(e: unknown): string {
  if (e instanceof BaseError) {
    const revert = e.walk((x) => x instanceof ContractFunctionRevertedError) as ContractFunctionRevertedError | null;
    const name = revert?.data?.errorName;
    if (name) return ERRORS[name] ?? name;
    if (e.shortMessage?.includes("User rejected")) return "Bạn đã từ chối giao dịch trong ví.";
    return e.shortMessage;
  }
  return e instanceof Error ? e.message : String(e);
}
