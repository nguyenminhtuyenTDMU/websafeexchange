# Mô hình nguy cơ (Threat Model) — CleanHandover

## 1. Bối cảnh

- **Tài sản cần bảo vệ:** tiền của người mua (ETH trong escrow) và quyền kiểm soát độc quyền ví Safe
  cùng toàn bộ tài sản bên trong mà người mua nhận được.
- **Tác nhân:** Người bán (S) là owner hiện tại của Safe, Người mua (B), bên thứ ba bất kỳ.
- **Giả định tin cậy:** chỉ tin vào bytecode của hợp đồng Safe chính thức và của chính CleanHandover.
  Không tin vào máy chủ, giao diện hay lời cam kết của bất kỳ bên nào.

## 2. Ý tưởng phòng thủ cốt lõi

### 2.1 Escrow tự thực hiện bàn giao

Người bán bật **chính hợp đồng escrow** làm module của Safe. Khi gọi `finalizeHandover`, escrow (với tư cách module) tự:
thêm owner mới, **xóa mọi owner cũ**, đặt ngưỡng ký, **tự gỡ mình khỏi danh sách module**, rồi xác minh bàn giao sạch
và tài sản còn nguyên. Sai một điều kiện là revert toàn bộ. Escrow ghi có tiền cho người bán ở cuối cùng một lời gọi đó.

### 2.2 "Đóng băng" ví từ lúc người mua nạp tiền

- `deposit` chỉ nhận tiền khi ví **đã sẵn sàng**: singleton chính thức, escrow là module **duy nhất**, không guard,
  không module guard, fallback handler hợp lệ, đủ tài sản niêm yết. Sau đó escrow chụp lại **nonce** của Safe.
- `finalizeHandover` yêu cầu nonce **không đổi**. Safe luôn tăng nonce **trước** khi thực thi mọi giao dịch do owner ký, nên:
  1. nếu `finalizeHandover` được gọi **từ bên trong** một giao dịch của Safe (người bán bọc nó trong MultiSend
     để chèn lệnh gian lận phía sau), nonce đã tăng nên lời gọi bị từ chối;
  2. nếu người bán làm bất kỳ giao dịch nào với ví sau khi người mua nạp tiền, bàn giao bị khóa và người mua được hủy ngay.

Vì escrow là bên giữ quyền điều khiển từ đầu đến cuối lời gọi, **sau thời điểm kiểm tra không còn lệnh nào của người bán chạy tiếp được**.

### 2.3 Bài học từ thiết kế cũ (phát hiện bằng fuzz test)

Thiết kế cũ để người bán tự thực hiện một MultiSend `beginHandover → swapOwner → completeHandover`, với cờ transient storage
chứng minh tính nguyên tử. Fuzz test tìm ra phản ví dụ `begin → swapOwner → complete → enableModule(attacker)`:
Safe chỉ kiểm tra chữ ký **một lần ở đầu** giao dịch rồi chạy hết MultiSend, nên mọi lệnh đặt **sau** `completeHandover`
vẫn chạy với quyền của người bán. Người bán nhận tiền, người mua nhận ví có cửa hậu.
Nguyên tắc rút ra: **chỉ bên giữ quyền điều khiển tới cuối giao dịch mới bảo đảm được trạng thái cuối.**

## 3. Bảng kịch bản tấn công

| # | Kịch bản tấn công | Kẻ tấn công | Phòng thủ (bit cho trợ lý) | Hướng dẫn cho người bán | Test |
|---|---|---|---|---|---|
| T1 | Giữ chủ sở hữu ẩn: thêm owner phụ của mình | S | Escrow **xóa mọi owner cũ** khi bàn giao; kiểm tra sau cùng tập owner **đúng bằng** tập thỏa thuận (`OWNERS_MISMATCH`) | Không cần làm gì | T1 (2 test) |
| T2 | Sai ngưỡng ký | S | Escrow tự đặt ngưỡng; kiểm tra `getThreshold() == threshold` (`THRESHOLD_MISMATCH`) | Không cần làm gì | T2 |
| T3 | Cài module làm cửa hậu | S | Lúc nạp: escrow phải là module **duy nhất** (`MODULES_ENABLED`, `EXECUTOR_NOT_ENABLED`); sau bàn giao: không còn module nào | `disableModule` module lạ, `enableModule(escrow)` | T3 (3 test) |
| T4 | Cài guard để chặn / kiểm duyệt giao dịch của B | S | Slot `guard_manager.guard.address` phải bằng 0 (`GUARD_SET`) | `setGuard(0x0)` | T4 |
| T4b | Module guard (Safe v1.5) | S | Slot `module_manager.module_guard.address` phải bằng 0 (`MODULE_GUARD_SET`) | `setModuleGuard(0x0)` | T4b (Safe 1.5.0) |
| T5 | Fallback handler độc giả mạo chữ ký EIP-1271 | S | Slot `fallback_manager.handler.address` bằng 0 hoặc handler đã thỏa thuận (`FALLBACK_HANDLER`) | `setFallbackHandler` về handler chuẩn | T5 |
| T6 | Rút tài sản (ETH / ERC-20 / NFT / Ownable), trước hoặc sau khi B nạp tiền | S | Đối chiếu tài sản niêm yết lúc nạp tiền **và** lúc bàn giao (bitmask theo từng tài sản) | Trả lại tài sản | T6 (4 test) |
| T7 | Thay singleton để mọi hàm view "khai" là sạch | S | `masterCopy()` do proxy tự trả lời phải thuộc danh sách singleton chính thức (`NOT_OFFICIAL_SAFE`) | Không khắc phục được | T7 (2 test) |
| T8 | **Gọi bàn giao từ bên trong giao dịch của ví** rồi chèn lệnh gian lận phía sau (lỗ hổng của thiết kế cũ) | S | Nonce Safe phải không đổi kể từ lúc nạp (`WalletChangedSinceFunding`) | Không gọi `finalizeHandover` từ Safe; để B gọi | T8 (4 test) + fuzz |
| T9 | Đổi điều kiện phút chót (hủy rồi niêm yết lại) | S | B nạp kèm `termsHash` đã xem (`TermsMismatch`) | — | T9 (2 test) |
| T10 | Ôm tiền / kéo dài / thay đổi ví sau khi B nạp | S | Hết hạn thì ai cũng hủy được; nonce đổi hoặc tài sản thiếu thì B hủy ngay | — | T10 (2 test), T8 |
| T11 | B phá hoại ví sau khi nhận để vừa giữ ví vừa đòi tiền | B | B chỉ trở thành owner bên trong `finalizeHandover`, cùng lời gọi ghi có cho S | — | Luồng chuẩn |
| T12 | Reentrancy (rút tiền, hoặc gọi lại escrow trong lúc bàn giao) | Bất kỳ | Pull-payment + `nonReentrant` trên mọi hàm ghi trạng thái | — | Slither |
| T13 | Rút token qua **allowance** đã cấp từ trước | S | Bị phát hiện nếu xảy ra trước bàn giao (B hủy được); **không** phát hiện được nếu rút sau bàn giao (xem mục 4) | Thu hồi mọi `approve` trước khi niêm yết | T6 + fuzz |

Trợ lý hướng dẫn bàn giao đọc `getReadiness(id)` (trước khi nạp) và `getHandoverStatus(id)` (sau bàn giao).
Mỗi bit = 1 là một dòng "chưa đạt" kèm cột hướng dẫn ở trên. Trợ lý chỉ đọc và hướng dẫn, không dựng hay gửi giao dịch thay người bán.

## 4. Giới hạn đã biết (ngoài phạm vi)

- **Allowance đã cấp (T13):** nếu ví từng `approve` cho một địa chỉ của S, S vẫn có thể `transferFrom` token sau khi bàn giao.
  Phép đối chiếu số dư không thấy allowance. Hướng phát triển: thêm một asset checker kiểm tra `allowance(wallet, spender) == 0`
  cho danh sách spender do người mua khai báo; hoặc người mua tự thu hồi ngay sau khi nhận ví.
- **Chữ ký đã lưu trong ví (`signedMessages`, Permit2, lệnh sàn ký trước):** S có thể dùng Safe ký trước một thông điệp
  (vd: lệnh bán NFT trên sàn, Permit2) bằng `SignMessageLib`. Kết quả được lưu trong storage của Safe và vẫn hợp lệ
  theo EIP-1271 sau khi bàn giao. Cùng lớp vấn đề với allowance: quyền đã ủy thác ra ngoài trước khi bán.
  Hướng phát triển: quét sự kiện `SignMsg`/`Approval` ngoài chuỗi để cảnh báo người mua.
- **Token rebase / thu phí khi chuyển:** số dư tự thay đổi nên phép đối chiếu `>=` có thể sai.
- **Số lượng:** tối đa `MAX_ASSETS = 20`, `MAX_OWNERS = 10`, vì gas tăng tuyến tính.
- **Tài sản không có hàm đọc trạng thái** (vị thế DeFi, quyền biểu quyết DAO, tài sản đang stake trong GameFi)
  và **dữ liệu ngoài blockchain** (tài khoản game, email liên kết): xem phần hướng phát triển.
- **Đa chain:** mỗi giao dịch chỉ bảo đảm cho chain của nó (`termsHash` có `chainid`).
- **Owner mới không được là owner hiện tại:** nếu người bán đã thêm người mua làm owner từ trước,
  bàn giao thất bại an toàn (người mua lấy lại tiền).

## 5. Kiểm chứng

```
npx hardhat test test/CleanHandover.test.cjs --config hardhat.config.cjs                                       # Safe 1.4.1
SAFE_VERSION=1.5.0 SAFE_VARIANT=L2 npx hardhat test test/CleanHandover.test.cjs --config hardhat.config.cjs # SafeL2 1.5.0 (34 test)
FUZZ_RUNS=1000 npx hardhat test test/CleanHandover.fuzz.test.cjs --config hardhat.config.cjs
```

Tất cả chạy trên bộ hợp đồng Safe **chính thức**, không dùng mock Safe: bản 1.4.1 (`@safe-global/safe-contracts`) và bản 1.5.0
(`@safe-global/safe-smart-account`, đặt `SAFE_VERSION=1.5.0`), mỗi bản cả Safe và SafeL2. Test module guard (T4b) chỉ chạy trên 1.5.0.
Kết quả phân tích tĩnh và fuzz: `docs/SECURITY_ANALYSIS.md`.
