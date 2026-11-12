# Phân tích an toàn — CleanHandover

Ba lớp kiểm tra bổ trợ nhau, đều chạy trên mã sẽ triển khai (`remix/CleanHandover_flat.sol`):

1. **Slither:** phân tích tĩnh trên mã nguồn.
2. **Mythril:** thực thi tượng trưng trên bytecode.
3. **Fuzz test bất biến:** sinh ngẫu nhiên hàng nghìn kịch bản và chạy trên bộ hợp đồng Safe v1.4.1 chính thức.

Lớp 3 phát hiện một lỗ hổng thiết kế mà 33 test viết tay, Slither và Mythril đều bỏ sót (mục 3.3).
Mã hiện tại là bản đã sửa. Ngày chạy: 07/11/2026.

Cấu hình compiler chung: solc 0.8.24, `--evm-version cancun --optimize --optimize-runs 200`.

---

# 1. Slither

- Slither 0.11.6, 102 detector, chạy trên `remix/CleanHandover_flat.sol`.

```
pip install --user slither-analyzer
solc-select install 0.8.24
slither remix/CleanHandover_flat.sol --solc <đường dẫn solc-0.8.24> \
  --solc-args "--evm-version cancun --optimize --optimize-runs 200" --compile-force-framework solc
```

## Kết quả: 18 kết quả, không có mức High, không có lỗi cần sửa

Chạy lại ngày 09/11/2026 sau khi thêm tập tài sản kỳ vọng của người mua vào `deposit`. So với lần trước chỉ thêm
`deposit` vào `cyclomatic-complexity`; các vòng lặp mới đều bị chặn bởi `MAX_ASSETS`.

| Detector | Mức | Số lượng | Vị trí | Đánh giá |
|---|---|---|---|---|
| `reentrancy-no-eth` | Medium | 1 | `finalizeHandover`: gọi sang ví rồi mới ghi `status` | **Đã chặn.** Mọi hàm ghi trạng thái (`createTrade`, `deposit`, `finalizeHandover`, ba hàm hủy, `withdraw`) đều có `nonReentrant`. Slither chỉ còn liệt kê các hàm **view** (`getReadiness`, `getHandoverStatus`) là có thể đọc trạng thái giữa chừng, vô hại vì không ghi gì. Ngoài ra ví đã được xác minh là Safe chính thức, và các lệnh bàn giao (`addOwner`, `removeOwner`, `changeThreshold`, `disableModule`) không gọi ra hợp đồng ngoài. |
| `unused-return` | Medium | 2 | `checkHandover`, `checkReadiness`: bỏ qua giá trị `next` của `getModulesPaginated` | Cảnh báo nhầm. Chỉ cần danh sách module; `next` là con trỏ phân trang. |
| `calls-loop` | Low | 7 | Gọi `holds()` của checker trong vòng lặp tài sản (`createTrade`, `_checkAssets`); gọi ví trong vòng lặp bàn giao | Chấp nhận được. Vòng lặp bị chặn (`MAX_ASSETS = 20`, `MAX_OWNERS = 10`), checker cố định từ constructor. Nếu một lời gọi lỗi thì chỉ làm bàn giao thất bại, người mua hủy được và lấy lại tiền. |
| `reentrancy-benign` | Low | 1 | `finalizeHandover`: ghi `activeTradeOf`, `pendingWithdrawals` sau lời gọi ví | Như dòng `reentrancy-no-eth`, đã có `nonReentrant`. |
| `timestamp` | Low | 3 | So sánh `block.timestamp` với deadline | Chấp nhận được. Validator chỉ lệch được vài giây, deadline tính bằng giờ. |
| `cyclomatic-complexity` | Info | 2 | `createTrade` (18 nhánh), `deposit` (12 nhánh) | Mỗi nhánh là một kiểm tra đầu vào, đã có test phủ. |
| `low-level-calls` | Info | 2 | `withdraw()`: `call{value}`; `finalizeHandover`: `wallet.call(calls[i])` | Có chủ đích. `withdraw` theo checks-effects-interactions; lời gọi ví kiểm tra cả `ok` lẫn giá trị trả về `true`. |

---

# 2. Mythril

## Cấu hình

- Mythril 0.24.8, độ sâu 2 giao dịch (`-t 2`), solver timeout 10 giây, execution timeout 900 giây.
- Đầu vào: runtime bytecode (`--bin-runtime`). Phân tích từ mã nguồn thất bại vì Mythril không chạy được constructor nhận mảng động
  (báo "No contract was created", độ phủ 4,46%). Kết quả "no issues" của lần đó không có giá trị và không được dùng.
- Máy 7,8 GB RAM: chạy từng hợp đồng một (chạy cả loạt bị hệ thống dừng vì thiếu bộ nhớ).

## Kết quả

| Hợp đồng | Độ phủ lệnh | Kết quả | Đánh giá |
|---|---|---|---|
| `CleanHandoverEscrow` | 24,6% | 1 × SWC-116 (Low): `cancelExpired` dùng `block.timestamp` | Trùng Slither (`timestamp`). Chạy lại 09/11/2026 với bản có tập tài sản kỳ vọng, kết quả không đổi (lần trước 25,1%) |
| `SafeWalletVerifier` | 32,5% | 4 × SWC-101 (High): `txNonce`, `isSupportedWallet`, `checkReadiness`, `isController` | Cảnh báo nhầm (xem dưới) |
| `EthBalanceChecker` | 91,5% | Không có | — |
| `Erc20BalanceChecker` | 89,4% | 1 × SWC-101 (High): `holds` | Cảnh báo nhầm |
| `Erc721OwnerChecker` | 94,7% | 1 × SWC-101 (High): `holds` | Cảnh báo nhầm |
| `OwnableOwnerChecker` | 92,9% | 1 × SWC-101 (High): `holds` | Cảnh báo nhầm |

(Bốn checker không thay đổi so với lần phân tích 04/11/2026 nên giữ nguyên kết quả.)

### Vì sao các cảnh báo SWC-101 là nhầm

Dịch ngược bytecode tại mọi vị trí bị báo (Verifier: PC 518, 650, 1925; ba checker: PC 98) đều cho cùng một chuỗi lệnh:

```
EXTCODESIZE(addr)   ; kích thước mã của địa chỉ
PUSH0
SUB                 ; 0 - codesize   <- vị trí Mythril báo "underflow"
JUMPI               ; nhảy nếu kết quả khác 0
```

Đây là bản biên dịch của `if (addr.code.length == 0) return ...;`: trình tối ưu thay phép so sánh với 0 bằng phép trừ rồi nhảy theo
kết quả khác 0. Kết quả phép trừ chỉ dùng như giá trị đúng/sai, không được lưu hay tính tiếp. Mythril đọc bytecode nên không phân biệt
được mẫu tối ưu này với phép tính của lập trình viên; mọi phép tính trong mã nguồn đều được Solidity 0.8 tự kiểm tra tràn số.
`checkReadiness` bị báo ở cùng PC 650 với `isSupportedWallet` vì nó gọi vào hàm này.

Đối chứng: `EthBalanceChecker` là hợp đồng duy nhất không có dòng `code.length == 0` và là hợp đồng duy nhất không bị báo.

### Giới hạn

Mythril mô phỏng lời gọi sang hợp đồng ngoài (ví, verifier, checker, token) bằng giá trị trả về tùy ý, nên các nhánh phụ thuộc
kết quả gọi ngoài ít được phủ. Đây là lý do có lớp fuzz test chạy trên Safe thật.

### Cài đặt trên Windows

`pyethash` (phụ thuộc của py-evm, chỉ dùng cho Proof-of-Work) cần Microsoft C++ Build Tools; Mythril không dùng nó nên được thay bằng
module stub báo lỗi nếu bị gọi.

```
py -3.12 -m venv ~/.venvs/mythril
~/.venvs/mythril/Scripts/python -m pip install --no-deps mythril==0.24.8 py-evm==0.7.0a1
# cài các phụ thuộc còn lại của mythril và py-evm, trừ pyethash; thêm "setuptools<70"
# tạo ~/.venvs/mythril/Lib/site-packages/pyethash.py (stub: EPOCH_LENGTH, hashimoto_light, mkcache_bytes)
solc <flat.sol> --evm-version cancun --optimize --optimize-runs 200 --bin-runtime -o bin
PYTHONUTF8=1 myth -v 4 analyze --bin-runtime -c "$(cat bin/<Contract>.bin-runtime)" -t 2 \
  --execution-timeout 900 --solver-timeout 10000
```

---

# 3. Fuzz test bất biến

## 3.1 Cách làm

`test/CleanHandover.fuzz.test.cjs`, dùng thư viện fast-check, chạy trên bộ hợp đồng Safe chính thức (1.4.1 và 1.5.0, cả Safe và SafeL2).
Mỗi kịch bản ngẫu nhiên gồm 4 pha:

1. **Chuẩn bị:** người bán bật hoặc không bật escrow làm module, cùng 0–4 hành vi có hại (module lạ, guard, fallback độc, owner phụ,
   rút ETH/ERC-20/NFT/Ownable, cấp allowance) hoặc vô hại (gỡ module, gỡ guard, đặt fallback chuẩn).
2. **Nạp tiền:** có thể bị từ chối nếu ví chưa sẵn sàng.
3. **Sau khi nạp:** 0–2 hành vi có hại bằng giao dịch Safe, rút token qua allowance, hoặc **"finalize bọc"**: MultiSend của người bán
   gọi `finalizeHandover` rồi chèn lệnh có hại phía sau (đúng kiểu tấn công đã phá thiết kế cũ).
4. **Bàn giao:** người mua gọi `finalizeHandover`; nếu thất bại thì hủy để lấy lại tiền.

Bất biến kiểm tra sau mỗi kịch bản:

- **I1:** COMPLETED ⇒ owners == [người mua], ngưỡng 1, không module (kể cả escrow), không guard, fallback hợp lệ, đủ tài sản,
  người bán được ghi có đúng giá.
- **I2:** chưa COMPLETED ⇒ người bán chưa được ghi có và ví chưa bị chuyển giao.
- **I3:** đã nạp mà bàn giao thất bại ⇒ người mua hủy được ngay và nhận lại đủ tiền.
- **I4:** người bán trung thực ⇒ luôn hoàn tất.

## 3.2 Kết quả trên mã hiện tại

Chạy lại ngày 12/11/2026 trên bản v2.1 (người mua khai báo tập tài sản kỳ vọng là một tập con ngẫu nhiên của danh sách chào bán),
mỗi seed 1.000 kịch bản.

| Seed | Bản Safe | Hoàn tất (đều sạch) | Từ chối lúc nạp | Từ chối lúc bàn giao (đã hoàn tiền) | Trung thực (đều hoàn tất) | Finalize bọc: thử / thành công |
|---|---|---|---|---|---|---|
| 101 | Safe 1.4.1 | 411 | 491 | 98 (98) | 273 | 116 / 0 |
| 202 | Safe 1.4.1 | 423 | 472 | 105 (105) | 245 | 151 / 0 |
| 303 | Safe 1.4.1 | 447 | 436 | 117 (117) | 280 | 146 / 0 |
| 404 | Safe 1.4.1 | 430 | 456 | 114 (114) | 247 | 148 / 0 |
| 505 | SafeL2 1.4.1 | 440 | 474 | 86 (86) | 263 | 140 / 0 |
| 606 | SafeL2 1.5.0 | 415 | 484 | 101 (101) | 265 | 131 / 0 |
| 707 | SafeL2 1.5.0 | 421 | 483 | 96 (96) | 252 | 128 / 0 |
| **Tổng** | | **2.987** | **3.296** | **717 (717)** | **1.825** | **960 / 0** |

7.000 kịch bản, **không vi phạm bất biến nào**. Tái lập:
`FUZZ_RUNS=1000 FUZZ_SEED=<seed> [SAFE_VERSION=1.5.0] [SAFE_VARIANT=L2] npx hardhat test test/CleanHandover.fuzz.test.cjs --config hardhat.config.cjs`.

## 3.3 Lỗ hổng fuzz test tìm ra ở thiết kế cũ

**Thiết kế cũ** (đã triển khai lần đầu trên Sepolia 30/10/2026): người bán tự thực hiện một MultiSend
`beginHandover → swapOwner → completeHandover`; cờ transient storage chứng minh `begin` và `complete` nằm trong cùng một giao dịch.

**Phản ví dụ** (fast-check rút gọn, lặp lại ở cả 3 seed đã chạy):

```
begin → swapToBuyer → complete → enableModule(attacker)
```

Safe kiểm tra chữ ký của người bán **một lần ở đầu** `execTransaction` rồi chạy hết MultiSend. `completeHandover` kiểm tra trạng thái
**tại thời điểm nó được gọi**, chứ không phải ở cuối giao dịch. Các lệnh đặt **sau** nó (bật module, rút tài sản, thêm owner) vẫn chạy với
quyền của người bán: người bán nhận tiền, người mua nhận ví có cửa hậu. Bất biến I1 bị vi phạm.

**Vì sao các lớp khác bỏ sót:**
- 33 test viết tay đều đặt `completeHandover` ở cuối, vì giả định ngầm của người viết.
- Slither và Mythril không mô hình hóa ngữ nghĩa "MultiSend tiếp tục chạy với quyền của owner" của Safe.

**Cách sửa** (mã hiện tại): escrow trở thành module và **tự** thực hiện bàn giao trong lời gọi do chính nó điều khiển
(`finalizeHandover`). Nó yêu cầu nonce của Safe không đổi kể từ lúc nạp tiền; Safe tăng nonce trước khi thực thi mọi giao dịch
do owner ký, nên `finalizeHandover` không thể chạy bên trong một giao dịch của ví. Test T8 tái hiện tấn công cũ và chứng minh bị chặn;
cột "Finalize bọc" ở bảng trên cho 661 lần thử, 0 lần thành công.

---

# 4. Đối chiếu với threat model

Các kịch bản T1–T13 trong `docs/THREAT_MODEL.md` được chứng minh bằng 38 ca kiểm thử (chạy trên Safe 1.4.1 và 1.5.0, mỗi bản cả Safe và SafeL2) và bằng fuzz test.
Slither và Mythril không phát hiện lớp lỗi nào nằm ngoài các kịch bản đó (reentrancy ghi trạng thái, biến chưa khởi tạo, ghi đè storage,
`tx.origin`, `delegatecall` không kiểm soát, `selfdestruct`...).
Các giới hạn đã biết (allowance, chữ ký đã ủy thác, token rebase…) được liệt kê ở mục 4 của threat model.
