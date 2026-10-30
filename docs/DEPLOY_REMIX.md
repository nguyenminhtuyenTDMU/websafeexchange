# Triển khai CleanHandover lên Sepolia bằng Remix + MetaMask

## 0. Chuẩn bị

- MetaMask ở mạng **Sepolia**, có ít Sepolia ETH (faucet).
- Mở https://remix.ethereum.org và tạo file `CleanHandover_flat.sol`, dán nội dung từ `remix/CleanHandover_flat.sol`.
- Tab **Solidity Compiler**: chọn compiler `0.8.24` trở lên. Trong *Advanced Configurations*, chọn **EVM version = cancun**
  (bắt buộc vì dùng transient storage), bật Optimization 200 runs. Bấm Compile.
- Tab **Deploy & Run**: chọn Environment **Injected Provider - MetaMask**.

## 1. Deploy SafeWalletVerifier

Tham số `officialSingletons` (singleton Safe chính thức trên Sepolia, lấy từ `@safe-global/safe-deployments`):

```
["0x41675C099F32341bf84BFc5382aF534df5C7461a","0x29fcB43b46531BcA003ddC8FCB67FFE91900C762","0xd9Db270c1B5E3Bd161E8c8503c55cEABeE709552","0x3E5c63644E683549055b9Be8653de26E0B4CD36E","0x69f4D1788e39c87893C980c06EdF4b7f686e2938","0xfb1bffC9d739B8D520DaF37dF666da4C687191EA"]
```

(Safe 1.4.1, SafeL2 1.4.1, Safe 1.3.0 và SafeL2 1.3.0 ở cả hai bản canonical và eip155.)
Safe tạo bằng app.safe.global trên Sepolia dùng **SafeL2 1.4.1** = `0x29fcB4...C762`.

## 2. Deploy 4 asset checker

Deploy lần lượt, không có tham số, theo **đúng thứ tự** (thứ tự này là `checkerId`):

| checkerId | Hợp đồng |
|---|---|
| 0 | `EthBalanceChecker` |
| 1 | `Erc20BalanceChecker` |
| 2 | `Erc721OwnerChecker` |
| 3 | `OwnableOwnerChecker` |

## 3. Deploy CleanHandoverEscrow

- `verifiers`: `["<địa chỉ SafeWalletVerifier>"]`
- `assetCheckers`: `["<Eth>","<Erc20>","<Erc721>","<Ownable>"]`

## 4. Verify mã nguồn trên Etherscan

Remix → Plugin manager → bật **Contract Verification - Etherscan**, nhập API key và verify cả 6 hợp đồng.
Cấu hình compiler phải giống hệt lúc deploy (0.8.24, cancun, optimizer 200).

## 5. Địa chỉ Safe hữu ích trên Sepolia

| Thành phần | Địa chỉ |
|---|---|
| CompatibilityFallbackHandler 1.4.1 (dùng làm `allowedFallbackHandler`) | `0xfd0732Dc9E303f09fCEf3a7388Ad10A83459Ec99` |
| MultiSendCallOnly 1.4.1 (dùng cho giao dịch bàn giao nguyên tử) | `0x9641d764fc13c8B624c04430C7356C1C7C8102e2` |

## 6. Chạy thử một giao dịch trên Sepolia

1. Tạo Safe 1-of-1 tại https://app.safe.global (Sepolia), owner là ví người bán. Nạp ít ETH vào Safe.
2. Người bán gọi `createTrade` trên Remix với tuple:
   `[safe, 0, buyer, price, deadline, [buyer], 1, "0xfd0732Dc9E303f09fCEf3a7388Ad10A83459Ec99", [[0,"0x0000000000000000000000000000000000000000", <số wei>]]]`
3. Người mua (đổi tài khoản MetaMask) đọc `trades(id).termsHash`, rồi gọi `deposit(id, termsHash)` kèm VALUE = price.
4. Người bán vào Safe → **Transaction Builder**, tạo batch 3 lệnh:
   1. `CleanHandoverEscrow.beginHandover(id)`
   2. `Safe.swapOwner(0x0000000000000000000000000000000000000001, seller, buyer)`
   3. `CleanHandoverEscrow.completeHandover(id)`

   Sau đó ký và thực thi. Safe sẽ gộp thành một giao dịch MultiSend.
5. Người bán gọi `withdraw()` để nhận tiền.
6. Trong lúc làm, gọi `getHandoverStatus(id)` để xem các bit chưa đạt (xem `docs/THREAT_MODEL.md`).
