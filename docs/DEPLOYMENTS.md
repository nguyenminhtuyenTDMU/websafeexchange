# Địa chỉ triển khai — Sepolia (chainId 11155111)

Deployer: `0x1eA84610a5Ba8F52BCcD1367cACD3AF30C74408b`. Triển khai bằng Remix + MetaMask từ `remix/CleanHandover_flat.sol`.
Cấu hình compiler: `v0.8.24+commit.e11b9ed9`, EVM version `cancun`, optimizer bật với 200 runs, không dùng viaIR.

## Bản hiện hành (v2.1, người mua khai báo tập tài sản kỳ vọng)

Escrow triển khai lại 09/11/2026 sau khi `deposit` nhận thêm tập tài sản kỳ vọng của người mua (commit `5d72a5f`).
Đã kiểm tra on-chain: bytecode khớp `remix/CleanHandover_flat.sol` tại commit `5d72a5f` (trừ metadata), escrow nối đúng
verifier và 4 checker. Verifier (07/11/2026) và bốn asset checker (30/10/2026) dùng lại, mã không đổi.

| Hợp đồng | Vai trò | Địa chỉ |
|---|---|---|
| `CleanHandoverEscrow` | Hợp đồng ký quỹ lõi | [`0xD0a1fed458bDA47758137EC06aa72c297009c351`](https://sepolia.etherscan.io/address/0xD0a1fed458bDA47758137EC06aa72c297009c351) |
| `SafeWalletVerifier` | Trục ví, `verifierId = 0` (8 singleton, gồm Safe 1.5.0) | [`0x4A6A1454CDBcA552F3ee414A6c726ee1E1ef43d2`](https://sepolia.etherscan.io/address/0x4A6A1454CDBcA552F3ee414A6c726ee1E1ef43d2) |
| `EthBalanceChecker` | Trục tài sản, `checkerId = 0` | [`0x857b6a56F18e54a79c8C57d890314A92A1e2a633`](https://sepolia.etherscan.io/address/0x857b6a56F18e54a79c8C57d890314A92A1e2a633) |
| `Erc20BalanceChecker` | Trục tài sản, `checkerId = 1` | [`0x924088D6cA89e008b64Bb4B68C522bd94bC9E8ed`](https://sepolia.etherscan.io/address/0x924088D6cA89e008b64Bb4B68C522bd94bC9E8ed) |
| `Erc721OwnerChecker` | Trục tài sản, `checkerId = 2` | [`0x5edb0709D2EA755e536C299Ee64a8446fCf0FA40`](https://sepolia.etherscan.io/address/0x5edb0709D2EA755e536C299Ee64a8446fCf0FA40) |
| `OwnableOwnerChecker` | Trục tài sản, `checkerId = 3` | [`0xAf37b978570b33625f579bbEE90Af611c90488Bb`](https://sepolia.etherscan.io/address/0xAf37b978570b33625f579bbEE90Af611c90488Bb) |

Tham số constructor:
- `SafeWalletVerifier.officialSingletons`: 8 singleton gồm Safe / SafeL2 bản 1.4.1, bản 1.3.0 (canonical và eip155)
  và **bản 1.5.0** (xem `docs/DEPLOY_REMIX.md`). ABI-encoded:
  ```
  0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000800000000000000000000000041675c099f32341bf84bfc5382af534df5c7461a00000000000000000000000029fcb43b46531bca003ddc8fcb67ffe91900c762000000000000000000000000d9db270c1b5e3bd161e8c8503c55ceabee7095520000000000000000000000003e5c63644e683549055b9be8653de26e0b4cd36e00000000000000000000000069f4d1788e39c87893c980c06edf4b7f686e2938000000000000000000000000fb1bffc9d739b8d520daf37df666da4c687191ea000000000000000000000000ff51a5898e281db6dfc7855790607438df2ca44b000000000000000000000000edd160febbd92e350d4d398fb636302fccd67c7e
  ```
- `CleanHandoverEscrow.verifiers`: `[SafeWalletVerifier v2]`
- `CleanHandoverEscrow.assetCheckers`: `[EthBalanceChecker, Erc20BalanceChecker, Erc721OwnerChecker, OwnableOwnerChecker]`

## Đã deploy nhưng không dùng

| Hợp đồng | Địa chỉ | Lý do |
|---|---|---|
| `CleanHandoverEscrow` v2 (07/11/2026) | [`0x256d891d310F76Fb8D2F9357CbEc987412f241A4`](https://sepolia.etherscan.io/address/0x256d891d310F76Fb8D2F9357CbEc987412f241A4) | Người bán khai báo tài sản, người mua chỉ xác nhận bằng `termsHash`. Thay bằng v2.1 cho đúng đề cương. Giao dịch thật #1 (`docs/SEPOLIA_DEMO.md`) chạy trên bản này. Đã verify (commit `274c61b`). |
| `SafeWalletVerifier` v2, 6 singleton (07/11/2026) | [`0x7955EB43444C5c2a6f27d4Fc736F9Eb191Ad4532`](https://sepolia.etherscan.io/address/0x7955EB43444C5c2a6f27d4Fc736F9Eb191Ad4532) | Mã đúng (khớp bytecode), nhưng thiếu singleton Safe 1.5.0, là bản app.safe.global đang tạo. |

## Bản cũ (v1, 30/10/2026) — KHÔNG SỬ DỤNG

Thiết kế `beginHandover/completeHandover` có lỗ hổng do fuzz test phát hiện: người bán chèn lệnh gian lận sau `completeHandover`
trong cùng MultiSend (chi tiết: `docs/SECURITY_ANALYSIS.md`, mục 3.3). Giữ lại địa chỉ để đối chiếu.

| Hợp đồng | Địa chỉ | Verify |
|---|---|---|
| `CleanHandoverEscrow` v1 | [`0xF11E3e415FC09B77b08909Db04FF82653625596C`](https://sepolia.etherscan.io/address/0xF11E3e415FC09B77b08909Db04FF82653625596C) | Exact Match |
| `SafeWalletVerifier` v1 | [`0x67e001ebFee2a7651fF655b1452b11c043593770`](https://sepolia.etherscan.io/address/0x67e001ebFee2a7651fF655b1452b11c043593770) | Chưa |

## Trạng thái verify mã nguồn trên Etherscan

Đã verify toàn bộ ngày 08/11/2026 (Solidity single file, cấu hình compiler như trên):

- [ ] `CleanHandoverEscrow` v2.1 (`0xD0a1…c351`): dùng `remix/CleanHandover_flat.sol` tại commit `5d72a5f`, constructor args như trên.
- [x] `SafeWalletVerifier` v2 (và escrow v2 cũ): dùng `remix/CleanHandover_flat.sol` tại commit `274c61b`.
- [x] 4 asset checker: không có constructor args. Phải dùng file gộp **ngày 30/10** (`git show 4f13d99:remix/CleanHandover_flat.sol`),
  vì hash metadata cuối bytecode tính trên toàn bộ file nguồn; file gộp hiện tại khác nên không khớp.
