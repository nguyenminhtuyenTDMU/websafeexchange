# Phân tích an toàn tĩnh — CleanHandover

Hai công cụ bổ trợ nhau: Slither (phân tích tĩnh trên mã nguồn, mục 1) và Mythril (thực thi tượng trưng
trên bytecode, mục 2). Cả hai được chạy trên đúng mã đã triển khai trên Sepolia.

# 1. Slither

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

# 2. Mythril

## Công cụ và cấu hình

- Mythril 0.24.8 (thực thi tượng trưng với bộ giải z3), độ sâu 2 giao dịch (`-t 2`), solver timeout 10 giây.
- Đầu vào: runtime bytecode biên dịch từ `remix/CleanHandover_flat.sol` với cùng cấu hình compiler.
  Kích thước khớp với bytecode on-chain (Escrow 8849 byte, Verifier 3012 byte, ERC-20 checker 392 byte).
- Phân tích runtime bytecode (`--bin-runtime`) thay vì mã nguồn, vì Mythril không chạy được constructor nhận mảng động
  (báo "No contract was created" với độ phủ 4,46% — kết quả "no issues" đó không có giá trị và không được dùng).
- Ngày chạy: 04/11/2026, máy 7,8 GB RAM.

## Kết quả

| Hợp đồng | Độ phủ lệnh | Kết quả | Đánh giá |
|---|---|---|---|
| `CleanHandoverEscrow` | 27,6% | 1 × SWC-116 (Low): `cancelExpired` dùng `block.timestamp` | Đã giải trình ở mục Slither 5–7 |
| `SafeWalletVerifier` | 39,7% | 3 × SWC-101 (High): `txNonce`, `isSupportedWallet`, `isController` | Cảnh báo nhầm (xem dưới) |
| `EthBalanceChecker` | 91,5% | Không có | — |
| `Erc20BalanceChecker` | 89,4% | 1 × SWC-101 (High): `holds` | Cảnh báo nhầm (xem dưới) |
| `Erc721OwnerChecker` | 94,7% | 1 × SWC-101 (High): `holds` | Cảnh báo nhầm (xem dưới) |
| `OwnableOwnerChecker` | 92,9% | 1 × SWC-101 (High): `holds` | Cảnh báo nhầm (xem dưới) |

### Vì sao các cảnh báo SWC-101 là nhầm

Dịch ngược bytecode tại mọi vị trí bị báo (PC 396, 528, 686 của Verifier; PC 98 của ba checker) đều cho cùng một chuỗi lệnh:

```
EXTCODESIZE(addr)   ; kích thước mã của địa chỉ
PUSH0
SUB                 ; 0 - codesize   <- vị trí Mythril báo "underflow"
JUMPI               ; nhảy nếu kết quả khác 0
```

Đây là bản biên dịch của `if (addr.code.length == 0) return ...;`: trình tối ưu thay phép so sánh với 0 bằng phép trừ
rồi nhảy theo kết quả khác 0. Kết quả phép trừ chỉ được dùng như giá trị đúng/sai, không bao giờ được lưu hay tính tiếp,
nên "tràn số" không ảnh hưởng logic. Mythril phân tích bytecode nên không phân biệt được mẫu tối ưu này với phép tính của
lập trình viên; còn mọi phép tính số học trong mã nguồn đều được Solidity 0.8 tự kiểm tra tràn số.

Đối chứng: `EthBalanceChecker` là hợp đồng duy nhất không có dòng `code.length == 0` và cũng là hợp đồng duy nhất không bị báo.

## Giới hạn của lần phân tích Mythril

- Mythril 0.24.8 chưa hỗ trợ các opcode Cancun `TLOAD`/`TSTORE`/`MCOPY`. Nhánh thực thi qua `beginHandover`/`completeHandover`
  dừng tại các opcode này, nên phần bàn giao nguyên tử không được Mythril khám phá. Phần này được chứng minh bằng bộ test
  33 trường hợp chạy trên Safe v1.4.1 chính thức (`test/CleanHandover.test.cjs`).
- Các lời gọi sang hợp đồng ngoài (verifier, checker, Safe, token) được mô phỏng với giá trị trả về tùy ý, nên nhiều nhánh
  phụ thuộc kết quả gọi ngoài không được phủ; đây là nguyên nhân chính khiến độ phủ của Escrow và Verifier thấp.
- Lần chạy đầu bị dừng do máy thiếu RAM; các hợp đồng được chạy lại riêng từng cái.

## Lệnh chạy lại (Windows)

`pyethash` (phụ thuộc của py-evm, chỉ dùng cho Proof-of-Work) cần Microsoft C++ Build Tools để biên dịch; Mythril không dùng nó,
nên được thay bằng một module stub báo lỗi nếu bị gọi.

```
py -3.12 -m venv ~/.venvs/mythril
~/.venvs/mythril/Scripts/python -m pip install --no-deps mythril==0.24.8 py-evm==0.7.0a1
# cài các phụ thuộc còn lại của mythril và py-evm, trừ pyethash; thêm "setuptools<70"
# tạo ~/.venvs/mythril/Lib/site-packages/pyethash.py (stub: EPOCH_LENGTH, hashimoto_light, mkcache_bytes)
solc <flat.sol> --evm-version cancun --optimize --optimize-runs 200 --bin-runtime -o bin
PYTHONUTF8=1 myth -v 4 analyze --bin-runtime -c "$(cat bin/<Contract>.bin-runtime)" -t 2 \
  --execution-timeout 900 --solver-timeout 10000
```

# 3. Đối chiếu với threat model

Các kịch bản T1–T12 trong `docs/THREAT_MODEL.md` được chứng minh bằng 33 test chạy trên bộ hợp đồng Safe v1.4.1 chính thức.
Slither và Mythril không phát hiện lớp lỗi nào nằm ngoài các kịch bản đó (reentrancy, biến chưa khởi tạo, ghi đè storage, `tx.origin`, `delegatecall` không kiểm soát, `selfdestruct`...).
