# Triển khai CleanHandover lên Sepolia bằng Remix + MetaMask

## 0. Chuẩn bị

- MetaMask ở mạng **Sepolia**, có ít Sepolia ETH (faucet).
- Mở https://remix.ethereum.org, tạo file `CleanHandover_flat.sol` và dán nội dung từ `remix/CleanHandover_flat.sol`.
- Tab **Solidity Compiler**: compiler `0.8.24+commit.e11b9ed9`; trong *Advanced Configurations* chọn **EVM version = cancun**,
  bật Optimization **200** runs. Bấm Compile.
- Tab **Deploy & Run**: Environment **Injected Provider - MetaMask**, kiểm tra dòng *Sepolia (11155111) network*.
- File gộp chứa nhiều hợp đồng: chọn đúng tên trong ô **CONTRACT** trước khi bấm Deploy. Bỏ qua các interface (`I...`).

## 1. SafeWalletVerifier

Tham số `officialSingletons`:

```
["0x41675C099F32341bf84BFc5382aF534df5C7461a","0x29fcB43b46531BcA003ddC8FCB67FFE91900C762","0xd9Db270c1B5E3Bd161E8c8503c55cEABeE709552","0x3E5c63644E683549055b9Be8653de26E0B4CD36E","0x69f4D1788e39c87893C980c06EdF4b7f686e2938","0xfb1bffC9d739B8D520DaF37dF666da4C687191EA"]
```

(Safe và SafeL2 bản 1.4.1, Safe và SafeL2 bản 1.3.0 ở cả hai bản canonical và eip155.)
Safe tạo bằng app.safe.global trên Sepolia dùng **SafeL2 1.4.1** = `0x29fcB4...C762`.

## 2. Bốn asset checker

Bốn checker **không đổi** so với lần triển khai đầu, nên dùng lại địa chỉ trong `docs/DEPLOYMENTS.md`.
Nếu triển khai mới hoàn toàn, deploy theo đúng thứ tự (thứ tự = `checkerId`):
`EthBalanceChecker` (0), `Erc20BalanceChecker` (1), `Erc721OwnerChecker` (2), `OwnableOwnerChecker` (3).

## 3. CleanHandoverEscrow

- `verifiers`: `["<địa chỉ SafeWalletVerifier>"]`
- `assetCheckers`: `["<Eth>","<Erc20>","<Erc721>","<Ownable>"]`

## 4. Verify mã nguồn trên Etherscan

Verify and Publish → Solidity (Single file) → `v0.8.24+commit.e11b9ed9` → MIT → dán toàn bộ file gộp →
Optimization Yes / 200 → EVM `cancun`. Constructor arguments thường được Etherscan tự điền.

## 5. Địa chỉ Safe hữu ích trên Sepolia

| Thành phần | Địa chỉ |
|---|---|
| CompatibilityFallbackHandler 1.4.1 (dùng làm `allowedFallbackHandler`) | `0xfd0732Dc9E303f09fCEf3a7388Ad10A83459Ec99` |

## 6. Chạy thử một giao dịch bàn giao trên Sepolia

Cần **hai tài khoản MetaMask**: người bán (S) và người mua (B).

1. **(S) Tạo Safe** 1-of-1 tại https://app.safe.global (mạng Sepolia), owner là S. Nạp ít ETH vào Safe (ví dụ 0.01).
2. **(S) Niêm yết** trên Remix, gọi `createTrade` với tuple:
   ```
   ["<địa chỉ Safe>", 0, "<địa chỉ B>", <giá wei>, <deadline unix>, ["<địa chỉ B>"], 1,
    "0xfd0732Dc9E303f09fCEf3a7388Ad10A83459Ec99",
    [[0, "0x0000000000000000000000000000000000000000", <số wei ETH trong Safe>]]]
   ```
   Lấy `tradeId` từ `tradeCount()`.
3. **(S) Bật escrow làm module của Safe.** Trong app.safe.global chọn **New transaction → Transaction Builder**:
   - *Enter Address or ENS Name*: **địa chỉ của chính Safe**;
   - *Enter ABI*: dán `[{"inputs":[{"name":"module","type":"address"}],"name":"enableModule","outputs":[],"stateMutability":"nonpayable","type":"function"}]`;
   - chọn hàm `enableModule`, `module` = **địa chỉ CleanHandoverEscrow** → Add transaction → Create batch → ký và thực thi.
   Safe{Wallet} có thể hiện cảnh báo "enableModule": đây đúng là thao tác chủ đích.

   **Cách B, nếu giao diện Safe chặn hoặc lỗi (làm hoàn toàn trong Remix):**
   1. Tạo file `SafeRemixHelper.sol` từ `remix/SafeRemixHelper.sol` và compile.
   2. Chọn `SafeCalldata`, deploy lên **Remix VM** (miễn phí, chỉ để tính toán). Gọi:
      - `enableModuleData(<địa chỉ escrow>)` → copy kết quả `data`;
      - `ownerSignature(<địa chỉ S>)` → copy kết quả `signatures`.
   3. Chuyển Environment về **Injected Provider - MetaMask** (tài khoản S). Chọn `ISafeForRemix`,
      dán **địa chỉ Safe** vào ô *At Address* rồi bấm At Address.
   4. Gọi `execTransaction` với: `to` = địa chỉ Safe, `value` = 0, `data` = (bước 2), `operation` = 0,
      `safeTxGas`, `baseGas`, `gasPrice` = 0, `gasToken`, `refundReceiver` = `0x0000000000000000000000000000000000000000`,
      `signatures` = (bước 2). Xác nhận MetaMask.
   5. Kiểm tra `isModuleEnabled(<địa chỉ escrow>)` = true.
4. **(S / trợ lý) Kiểm tra sẵn sàng**: gọi `getReadiness(tradeId)` trên Remix → phải trả về `0, 0`.
5. **(B) Nạp tiền**: đổi tài khoản MetaMask sang B, đọc `trades(tradeId)` để lấy `termsHash`,
   gọi `deposit(tradeId, termsHash)` với VALUE = giá.
   Từ lúc này **S không được thực hiện thêm bất kỳ giao dịch nào với Safe** (nếu không, B sẽ hủy được và lấy lại tiền).
6. **(B) Hoàn tất**: gọi `finalizeHandover(tradeId)`. Kiểm tra trên app.safe.global: owner duy nhất là B, không còn module.
7. **(S) Rút tiền**: đổi sang S, gọi `withdraw()`.
