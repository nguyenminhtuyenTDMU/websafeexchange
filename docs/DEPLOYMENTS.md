# Địa chỉ triển khai — Sepolia (chainId 11155111)

Triển khai ngày 30/10/2026 bằng Remix + MetaMask, deployer `0x1eA84610a5Ba8F52BCcD1367cACD3AF30C74408b`.
Mã nguồn: `remix/CleanHandover_flat.sol`.

| Hợp đồng | Vai trò | Địa chỉ |
|---|---|---|
| `CleanHandoverEscrow` | Hợp đồng ký quỹ lõi | [`0xF11E3e415FC09B77b08909Db04FF82653625596C`](https://sepolia.etherscan.io/address/0xF11E3e415FC09B77b08909Db04FF82653625596C) |
| `SafeWalletVerifier` | Trục ví, `verifierId = 0` | [`0x67e001ebFee2a7651fF655b1452b11c043593770`](https://sepolia.etherscan.io/address/0x67e001ebFee2a7651fF655b1452b11c043593770) |
| `EthBalanceChecker` | Trục tài sản, `checkerId = 0` | [`0x857b6a56F18e54a79c8C57d890314A92A1e2a633`](https://sepolia.etherscan.io/address/0x857b6a56F18e54a79c8C57d890314A92A1e2a633) |
| `Erc20BalanceChecker` | Trục tài sản, `checkerId = 1` | [`0x924088D6cA89e008b64Bb4B68C522bd94bC9E8ed`](https://sepolia.etherscan.io/address/0x924088D6cA89e008b64Bb4B68C522bd94bC9E8ed) |
| `Erc721OwnerChecker` | Trục tài sản, `checkerId = 2` | [`0x5edb0709D2EA755e536C299Ee64a8446fCf0FA40`](https://sepolia.etherscan.io/address/0x5edb0709D2EA755e536C299Ee64a8446fCf0FA40) |
| `OwnableOwnerChecker` | Trục tài sản, `checkerId = 3` | [`0xAf37b978570b33625f579bbEE90Af611c90488Bb`](https://sepolia.etherscan.io/address/0xAf37b978570b33625f579bbEE90Af611c90488Bb) |

## Tham số constructor

- `SafeWalletVerifier.officialSingletons`: Safe / SafeL2 bản 1.4.1, cùng bản 1.3.0 canonical và eip155
  (xem `docs/DEPLOY_REMIX.md`).
- `CleanHandoverEscrow.verifiers`: `[SafeWalletVerifier]`
- `CleanHandoverEscrow.assetCheckers`: `[EthBalanceChecker, Erc20BalanceChecker, Erc721OwnerChecker, OwnableOwnerChecker]`

Đã kiểm tra on-chain: `verifierAt(0)` và `assetCheckerAt(0..3)` trả về đúng các địa chỉ trên;
`isOfficialSingleton(SafeL2 1.4.1) = true`.

## Cấu hình compiler (đã đối chiếu metadata trong bytecode on-chain)

- `v0.8.24+commit.e11b9ed9`, EVM version `cancun`, optimizer bật với 200 runs, không dùng viaIR.

## Trạng thái verify mã nguồn trên Etherscan

- [x] `CleanHandoverEscrow`: Exact Match (30/10/2026)
- [ ] `SafeWalletVerifier` và 4 asset checker: chưa verify. Dùng đúng cấu hình compiler ở trên; 4 checker không có constructor args.

Constructor args (ABI-encoded) của `SafeWalletVerifier`:

```
0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000600000000000000000000000041675c099f32341bf84bfc5382af534df5c7461a00000000000000000000000029fcb43b46531bca003ddc8fcb67ffe91900c762000000000000000000000000d9db270c1b5e3bd161e8c8503c55ceabee7095520000000000000000000000003e5c63644e683549055b9be8653de26e0b4cd36e00000000000000000000000069f4d1788e39c87893c980c06edf4b7f686e2938000000000000000000000000fb1bffc9d739b8d520daf37df666da4c687191ea
```
