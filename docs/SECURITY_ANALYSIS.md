# Phân tích an toàn tĩnh — CleanHandover

## Công cụ và cấu hình

- Slither 0.11.6, 102 detector.
- Mã phân tích: `remix/CleanHandover_flat.sol`, đúng mã đã triển khai trên Sepolia (xem `docs/DEPLOYMENTS.md`).
- Compiler: solc 0.8.24, `--evm-version cancun --optimize --optimize-runs 200`.
- Ngày chạy: 04/11/2026.

Lệnh chạy lại:

```
pip install --user slither-analyzer
solc-select install 0.8.24
slither remix/CleanHandover_flat.sol --solc <đường dẫn solc-0.8.24> \
  --solc-args "--evm-version cancun --optimize --optimize-runs 200" --compile-force-framework solc
```

## Kết quả

12 kết quả, **không có kết quả mức High**. Một kết quả mức Medium là cảnh báo nhầm. Không kết quả nào cần sửa mã.

| # | Detector | Mức | Vị trí | Đánh giá |
|---|---|---|---|---|
| 1 | `unused-return` | Medium | `SafeWalletVerifier.checkHandover`: bỏ qua giá trị `next` của `getModulesPaginated` | Cảnh báo nhầm. Chỉ cần biết danh sách module có rỗng hay không (`modules.length != 0`). `next` là con trỏ phân trang, không mang thông tin an toàn. |
| 2–4 | `calls-loop` | Low | `createTrade`, `_handoverStatus` (qua `completeHandover`, `getHandoverStatus`): gọi `holds()` trong vòng lặp | Chấp nhận được. Vòng lặp bị chặn bởi `MAX_ASSETS = 20`. Danh sách checker cố định từ constructor. Token độc làm revert thì bị `try/catch` bắt và trả `false`. Nếu token đốt hết gas, bàn giao chỉ không thể hoàn tất: người mua lấy lại tiền qua `cancelExpired`/`cancelByBuyer`, người bán vẫn giữ ví. Không bên nào mất tài sản. |
| 5–7 | `timestamp` | Low | So sánh `block.timestamp` với `deadline` trong `createTrade`, `deposit`, `cancelExpired` | Chấp nhận được. Validator chỉ dịch được timestamp vài giây, còn deadline có độ lớn tính bằng giờ. |
| 8–10 | `assembly` | Informational | `beginHandover`, `completeHandover`: `tstore`/`tload` | Có chủ đích. Transient storage (EIP-1153) là cơ chế chứng minh tính nguyên tử, và solc 0.8.24 chưa hỗ trợ từ khóa `transient`. Cờ được xóa ngay trong `completeHandover` và tự mất khi giao dịch kết thúc. |
| 11 | `cyclomatic-complexity` | Informational | `createTrade` (18), `checkHandover` (13) | Chấp nhận được. Mỗi nhánh là một điều kiện kiểm tra đầu vào hoặc điều kiện bàn giao, đều được phủ bởi `test/CleanHandover.test.cjs`. |
| 12 | `low-level-calls` | Informational | `withdraw()`: `call{value: amount}("")` | Có chủ đích. Đây là cách chuẩn để gửi ETH (không giới hạn 2300 gas như `transfer`). Hàm theo mẫu checks-effects-interactions (đặt `pendingWithdrawals` về 0 trước khi gửi) và có khóa `nonReentrant`. |

Cảnh báo của compiler về transient storage (dòng `tstore`) đã được phân tích ở mục 8–10.

## Đối chiếu với threat model

Các kịch bản T1–T12 trong `docs/THREAT_MODEL.md` được chứng minh bằng 33 test chạy trên bộ hợp đồng Safe v1.4.1 chính thức.
Slither không phát hiện lớp lỗi nào nằm ngoài các kịch bản đó (reentrancy, biến chưa khởi tạo, ghi đè storage, `tx.origin`, `delegatecall` không kiểm soát, `selfdestruct`...).
