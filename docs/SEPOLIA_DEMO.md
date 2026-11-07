# Chạy thử thực tế trên Sepolia — giao dịch #1

Ngày 07/11/2026. Bán quyền kiểm soát ví **SafeL2 1.5.0** tạo bằng app.safe.global, thông qua CleanHandover v2
(`docs/DEPLOYMENTS.md`). Mọi thao tác thực hiện bằng Remix + MetaMask; không dùng giao diện Safe{Wallet} để ký.

## Các bên

| Vai trò | Địa chỉ |
|---|---|
| Ví được bán (SafeL2 1.5.0) | [`0xA766F35622931F335bf6ef0f15fD2F37d35b9716`](https://sepolia.etherscan.io/address/0xA766F35622931F335bf6ef0f15fD2F37d35b9716) |
| Người bán S (owner ban đầu) | `0x1eA84610a5Ba8F52BCcD1367cACD3AF30C74408b` |
| Người mua B | `0xba8222Bf4dd9b994eAFAB7B8c634a441BF3bBDD4` |
| CleanHandoverEscrow | [`0x256d891d310F76Fb8D2F9357CbEc987412f241A4`](https://sepolia.etherscan.io/address/0x256d891d310F76Fb8D2F9357CbEc987412f241A4) |

Điều kiện giao dịch: giá 0.001 ETH; owner mới chỉ gồm B, ngưỡng 1; fallback handler chấp nhận là
CompatibilityFallbackHandler 1.5.0; tài sản cam kết: ví giữ ≥ 0.01 ETH; hạn chót 10/11/2026.

## Diễn biến

| # | Bước | Người gửi | Giao dịch | Gas |
|---|---|---|---|---|
| 1 | S nạp 0.01 ETH vào Safe (tài sản sẽ bán kèm) | S | — | — |
| 2 | S bật escrow làm module của Safe (`execTransaction` → `enableModule`, chữ ký "approved by msg.sender") | S | [`0x542fe302…d3c7`](https://sepolia.etherscan.io/tx/0x542fe302e3e706ac9bc909b4265ed00e67cdf651da3be8b36e628309a97ed3c7) | 278.413 |
| 3 | S niêm yết (`createTrade`), tradeId = 1 | S | [`0xa00e795a…486c`](https://sepolia.etherscan.io/tx/0xa00e795af92c76b2c71d0eecd1f4a966e9044c4442bb0f00385b1d4a9257486c) | 1.501.384 |
| 4 | B nạp 0.001 ETH (`deposit`, kèm `termsHash`); escrow kiểm tra ví sẵn sàng, chụp nonce = 1 | B | [`0x5afc4c78…1eb7`](https://sepolia.etherscan.io/tx/0x5afc4c78f81138bd53ca888fb92da05676b6d9d2116194857fa975aaef1d1eb7) | 218.536 |
| 5 | B hoàn tất (`finalizeHandover`): escrow thêm B, xóa S, đặt ngưỡng, tự gỡ module, kiểm tra sạch + tài sản, ghi có cho S | B | [`0xa86c18d5…fc82`](https://sepolia.etherscan.io/tx/0xa86c18d56ab3d5bc02deec46bf7dbf47c2a7c5bbf4ac92413452c1c7a599fc82) | 429.632 |
| 6 | S rút 0.001 ETH (`withdraw`) | S | [`0x1582926b…6e51`](https://sepolia.etherscan.io/tx/0x1582926b252f43bfed1996e057bd7e2552a059be746100eb5166ec78c87d6e51) | 40.694 |

Trước bước 4, `getReadiness(1)` = `(0, 0)` (ví sẵn sàng, tài sản đủ). Trước mỗi bước gửi thật, lời gọi được giả lập
(`eth_call`) trên Sepolia để kiểm tra trước.

## Trạng thái sau bước 5 (đọc trực tiếp on-chain)

| Thuộc tính | Giá trị |
|---|---|
| `trades(1).status` | 3 = COMPLETED |
| Owner của Safe | chỉ `0xba82…BDD4` (B) |
| Ngưỡng ký | 1 |
| Module | không có (escrow đã tự gỡ) |
| Guard / module guard | `0x0` / `0x0` |
| Fallback handler | `0x3EfC…77f4` (CompatibilityFallbackHandler 1.5.0) |
| Số dư Safe | 0.01 ETH (còn nguyên) |
| Nonce Safe | 1 (bàn giao do escrow thực hiện qua module, không tốn nonce) |
| `getHandoverStatus(1)` | `(0, 0)`: sạch hoàn toàn |
| `pendingWithdrawals(S)` | 0.001 ETH |

## Ghi chú

- Ở lần thử trước (thiết kế cũ), việc bật module/guard qua giao diện Safe{Wallet} không thành công. Lần này người bán gọi thẳng
  `execTransaction` của Safe từ Remix bằng tài khoản owner, với chữ ký kiểu `v = 1` (chính người gửi là owner),
  nên không phụ thuộc giao diện Safe{Wallet}. Xem `docs/DEPLOY_REMIX.md` và `remix/SafeRemixHelper.sol`.
- Ban đầu verifier được deploy với danh sách singleton chưa có Safe 1.5.0, nên không nhận ví này (`0x7955…4532`, không dùng).
  Ví do app.safe.global tạo trên Sepolia hiện là SafeL2 1.5.0.

## Kết thúc

Sau bước 6: `pendingWithdrawals(S) = 0`, số dư escrow = 0. Toàn bộ vòng đời OPEN → FUNDED → COMPLETED → rút tiền
đã chạy trên mạng thật. Người mua nhận ví sạch kèm đủ tài sản, người bán nhận đúng giá, escrow không giữ lại đồng nào.
