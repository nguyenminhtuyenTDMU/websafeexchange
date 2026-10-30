# Mô hình nguy cơ (Threat Model) — CleanHandover

## 1. Bối cảnh

- **Tài sản cần bảo vệ:** tiền của người mua (ETH trong escrow) và quyền kiểm soát độc quyền ví Safe
  cùng toàn bộ tài sản bên trong mà người mua nhận được.
- **Tác nhân:** Người bán (S) là owner hiện tại của Safe, Người mua (B), bên thứ ba bất kỳ.
- **Giả định tin cậy:** chỉ tin vào bytecode của hợp đồng Safe chính thức và của chính CleanHandover.
  Không tin vào máy chủ, giao diện hay lời cam kết của bất kỳ bên nào.

## 2. Ý tưởng phòng thủ cốt lõi: bàn giao nguyên tử

Người bán thực thi **một** giao dịch Safe (MultiSend) duy nhất:

```
beginHandover(id) → swapOwner / addOwner / changeThreshold / gỡ module, guard... → completeHandover(id)
```

- `beginHandover` ghi cờ vào **transient storage** (EIP-1153) sau khi xác nhận người bán vẫn là owner.
  Cờ này tự mất khi giao dịch kết thúc.
- `completeHandover` chỉ chạy khi cờ còn, tức là trong cùng giao dịch. Hàm này kiểm tra toàn bộ điều kiện
  bàn giao sạch và tài sản. Nếu sai bất kỳ điều kiện nào thì **cả giao dịch Safe bị revert**: người bán vẫn giữ ví,
  tiền vẫn nằm trong escrow.
- Hệ quả: không bao giờ tồn tại khoảnh khắc "người mua đã có ví nhưng chưa trả tiền" hoặc
  "người bán đã nhận tiền nhưng ví chưa sạch".

## 3. Bảng kịch bản tấn công

| # | Kịch bản tấn công | Kẻ tấn công | Điều kiện kiểm tra (bit trả về cho trợ lý) | Hướng dẫn khắc phục cho người bán | Test |
|---|---|---|---|---|---|
| T1 | Giữ chủ sở hữu ẩn: thêm B nhưng giữ S, hoặc thêm một ví phụ của S | S | Tập owner phải **đúng bằng** tập owner đã thỏa thuận, so sánh hai chiều (`OWNERS_MISMATCH`) | Dùng `swapOwner`/`removeOwner` để chỉ còn các owner đã thỏa thuận | T1 (2 test) |
| T2 | Sai ngưỡng ký, ví dụ thỏa thuận 2/2 nhưng để 1/2 | S | `getThreshold() == threshold` (`THRESHOLD_MISMATCH`) | `changeThreshold` về đúng ngưỡng | T2 |
| T3 | Cài module làm cửa hậu để rút tài sản không cần chữ ký owner | S | `getModulesPaginated` phải rỗng (`MODULES_ENABLED`) | `disableModule` từng module | T3 (3 test) |
| T4 | Cài guard để chặn hoặc kiểm duyệt giao dịch của B | S | Đọc storage slot `guard_manager.guard.address` phải bằng 0 (`GUARD_SET`) | `setGuard(0x0)` | T4 |
| T4b | Cài module guard (Safe v1.5) | S | Slot `module_manager.module_guard.address` phải bằng 0 (`MODULE_GUARD_SET`) | `setModuleGuard(0x0)` | (Safe 1.5) |
| T5 | Fallback handler độc giả mạo chữ ký EIP-1271 thay ví | S | Slot `fallback_manager.handler.address` phải bằng 0 hoặc bằng handler đã thỏa thuận (`FALLBACK_HANDLER`) | `setFallbackHandler` về handler chuẩn | T5 |
| T6 | Rút tài sản (ETH / ERC-20 / NFT / quyền Ownable), kể cả gộp chung vào giao dịch bàn giao | S | Đối chiếu tài sản đã niêm yết **tại thời điểm hoàn tất** (bitmask theo từng tài sản) | Trả lại tài sản; nếu không, B hủy và nhận lại tiền | T6 (5 test) |
| T7 | Thay singleton (slot 0) bằng mã giả mạo để mọi hàm view đều "khai" là đã sạch | S | `masterCopy()` do **proxy tự trả lời** (không làm giả được) phải nằm trong danh sách singleton chính thức (`NOT_OFFICIAL_SAFE`) | Không khắc phục được, ví không đủ điều kiện | T7 (2 test) |
| T8 | Phá tính nguyên tử: bàn giao ở một giao dịch, nhận tiền ở giao dịch khác; hoặc bên thứ ba tự gọi | S / B / bên thứ ba | Cờ transient + `msg.sender == wallet` (`NotAtomic`, `NotWallet`) | Thực hiện đúng một giao dịch MultiSend | T8 (4 test) |
| T9 | Đổi điều kiện phút chót: hủy rồi niêm yết lại với ít tài sản hơn trước khi B nạp tiền | S | B nạp kèm `termsHash` đã xem (`TermsMismatch`) | — | T9 (2 test) |
| T10 | Ôm tiền / kéo dài thời gian / có hoạt động lạ sau khi B nạp tiền | S | Hết hạn thì ai cũng hủy được; nonce Safe đổi thì B được hủy ngay | — | T10 (3 test) |
| T11 | B phá hoại ví sau khi nhận để vừa giữ ví vừa đòi hoàn tiền | B | Không tồn tại khoảng thời gian B có ví mà giao dịch chưa hoàn tất (nhờ bàn giao nguyên tử) | — | Luồng chuẩn, T8 |
| T12 | Reentrancy khi rút tiền | Bất kỳ | Pull-payment + khóa `nonReentrant` + checks-effects-interactions | — | — |

Ánh xạ đến trợ lý hướng dẫn bàn giao: dapp gọi `getHandoverStatus(id)` và nhận `(walletFailMask, assetFailMask)`.
Mỗi bit = 1 tương ứng một dòng "chưa đạt" trong bảng trên, kèm cột hướng dẫn khắc phục.
Trợ lý chỉ đọc và hướng dẫn, không dựng hay gửi giao dịch thay người bán.

## 4. Giới hạn đã biết (ngoài phạm vi)

- **Token rebase / thu phí khi chuyển:** số dư tự thay đổi nên phép đối chiếu `>=` có thể sai. Không nên niêm yết các token này.
- **Số lượng tài sản:** tối đa `MAX_ASSETS = 20`, tối đa `MAX_OWNERS = 10`, vì gas tăng tuyến tính.
- **Tài sản không có hàm đọc trạng thái** (vị thế DeFi, quyền biểu quyết DAO, phê duyệt `approve` đã cấp cho bên khác):
  đây là hướng phát triển. Lưu ý rằng `approve` còn hiệu lực cho một địa chỉ của S vẫn cho phép S rút token sau bàn giao.
  Cần thêm checker kiểm tra `allowance`.
- **Đa chain:** cùng một địa chỉ Safe có thể tồn tại trên nhiều chain. Mỗi giao dịch chỉ bảo đảm cho chain của nó.
- **Bàn giao không theo giao thức:** nếu S tự chuyển owner bằng giao dịch riêng (không qua `begin/complete`) thì escrow không trả tiền
  cho S. Đây là thiết kế có chủ đích, nhằm loại bỏ T11. Giao diện phải hướng dẫn S chỉ bàn giao bằng giao dịch nguyên tử.

## 5. Kiểm chứng

```
npx hardhat test test/CleanHandover.test.cjs --config hardhat.config.cjs
```

33 test chạy trên bộ hợp đồng **Safe v1.4.1 chính thức** (artifact của `@safe-global/safe-contracts`), không dùng mock Safe.
