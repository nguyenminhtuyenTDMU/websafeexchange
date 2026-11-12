# CleanHandover

Hệ thống chuyển giao quyền kiểm soát ví đa chữ ký Safe giữa người bán và người mua, không cần bên trung gian.
Người mua nạp tiền vào hợp đồng ký quỹ; hợp đồng tự đổi tập owner của ví sang người mua, tự kiểm tra ví đã
"bàn giao sạch" (không còn owner cũ, module, guard, fallback handler lạ, tài sản còn đủ) rồi mới ghi có tiền
cho người bán. Mọi bước nằm trong một giao dịch: một điều kiện sai thì toàn bộ bị hoàn tác.

Đồ án tốt nghiệp, Trường Đại học Thủ Dầu Một. Tác giả: Nguyễn Minh Tuyền. GVHD: Hồ Đắc Hưng.

- **Dapp:** https://nguyenminhtuyentdmu.github.io/websafeexchange/ (mạng Sepolia)
- **Hợp đồng ký quỹ:** [`0xD0a1fed458bDA47758137EC06aa72c297009c351`](https://sepolia.etherscan.io/address/0xD0a1fed458bDA47758137EC06aa72c297009c351#code)
  (mã nguồn đã xác minh trên Etherscan; các hợp đồng còn lại ở [docs/DEPLOYMENTS.md](docs/DEPLOYMENTS.md))

Hệ thống không lưu ký tài sản và không có máy chủ: dapp chạy hoàn toàn trong trình duyệt, đọc dữ liệu từ
hợp đồng, còn mọi giao dịch do ví của người dùng ký.

## Cấu trúc mã nguồn

| Thư mục | Nội dung |
|---|---|
| `contracts/` | Hợp đồng ký quỹ `CleanHandoverEscrow`, giao diện `IWalletVerifier` / `IAssetChecker`, adapter `SafeWalletVerifier`, bốn bộ kiểm tra tài sản (ETH, ERC-20, ERC-721, Ownable), mock cho kiểm thử |
| `test/` | Kiểm thử theo kịch bản tấn công và kiểm thử fuzz trên bytecode Safe chính thức |
| `client/` | Dapp (React, TypeScript, wagmi, viem) |
| `script/e2e/` | Kiểm thử đầu-cuối qua giao diện trên node Hardhat cục bộ |
| `remix/` | Mã nguồn gộp một tệp dùng để triển khai bằng Remix và xác minh trên Etherscan |
| `docs/` | Mô hình nguy cơ, phân tích an toàn, địa chỉ triển khai, hướng dẫn triển khai, giao dịch thực nghiệm |
| `report/` | Mã sinh báo cáo đồ án (`.docx`) |

## Cài đặt

Cần Node.js 20 trở lên và Git.

```
git clone https://github.com/nguyenminhtuyenTDMU/websafeexchange.git
cd websafeexchange
npm ci
```

## Sử dụng dapp

Mở https://nguyenminhtuyentdmu.github.io/websafeexchange/ bằng trình duyệt có MetaMask (hoặc ví tương thích
EIP-1193), chuyển ví sang mạng Sepolia. Cần một ít Sepolia ETH để trả phí gas.

**Người bán**

1. Tạo hoặc dùng một ví Safe trên Sepolia (app.safe.global) mà mình là owner.
2. Vào **Niêm yết ví**, nhập địa chỉ ví, địa chỉ người mua, giá, hạn chót và các tài sản chào bán kèm ví; ký giao dịch.
3. Trang giao dịch hiện báo cáo kiểm tra ví. Làm theo hướng dẫn cho từng điều kiện chưa đạt; thường chỉ cần bật
   hợp đồng ký quỹ làm module của ví bằng Transaction Builder trong Safe{Wallet}.
4. Khi báo cáo là "Ví sẵn sàng", gửi đường dẫn giao dịch cho người mua. **Từ lúc người mua nạp tiền, không thực hiện
   giao dịch nào với ví**, nếu không người mua được quyền hủy.
5. Sau khi bàn giao hoàn tất, bấm **Rút** để nhận tiền về ví.

**Người mua**

1. Mở đường dẫn người bán gửi, kiểm tra báo cáo và điều kiện giao dịch.
2. Chọn các tài sản mình kỳ vọng nhận cùng ví, bấm **Xem lại và nạp**, xác nhận rồi ký.
3. Bấm **Hoàn tất bàn giao**. Hợp đồng đổi owner, tự gỡ module, kiểm tra lại toàn bộ điều kiện; thành công thì
   bạn là owner duy nhất của ví.
4. Nếu quá hạn chót mà chưa hoàn tất, hoặc người bán động vào ví sau khi bạn nạp tiền, bấm **Hủy** để nhận lại tiền.

Màn hình **Giao dịch** và **Tra cứu lịch sử** cho xem mọi giao dịch và lịch sử theo địa chỉ mà không cần kết nối ví.

## Chạy trên máy

| Lệnh | Việc làm |
|---|---|
| `npm run dev` | Chạy dapp (Sepolia) tại http://localhost:5173 |
| `npm run build` | Build dapp thành tệp tĩnh trong `dist/public` |
| `npm test` | Biên dịch hợp đồng, chạy kiểm thử theo kịch bản và kiểm thử fuzz 300 kịch bản (Safe 1.4.1) |
| `npm run check` | Kiểm tra kiểu TypeScript |

Biến môi trường cho kiểm thử:

- `SAFE_VERSION=1.5.0`: chạy với Safe 1.5.0 thay cho 1.4.1 (có thêm ca kiểm thử module guard).
- `SAFE_VARIANT=L2`: dùng SafeL2, bản mà Safe{Wallet} tạo trên Sepolia.
- `FUZZ_RUNS`, `FUZZ_SEED`: số kịch bản và seed của kiểm thử fuzz (mặc định 300 kịch bản, seed theo thời gian).
  Kiểm thử fuzz tự kiểm tra rằng nó đã sinh đủ mọi loại kết quả (hoàn tất, bị từ chối lúc nạp, bị từ chối lúc bàn giao),
  nên cần khoảng 100 kịch bản trở lên.

Ví dụ chạy lại kiểm thử fuzz với seed cố định trên Safe 1.5.0:

```
SAFE_VERSION=1.5.0 SAFE_VARIANT=L2 FUZZ_RUNS=1000 FUZZ_SEED=606 npx hardhat test test/CleanHandover.fuzz.test.cjs --config hardhat.config.cjs
```

Kiểm thử đầu-cuối qua giao diện: xem [script/e2e/README.md](script/e2e/README.md).

## Tự kiểm chứng

Không cần tin tác giả hay bản dapp đang chạy; có thể tự kiểm tra từng phần.

1. **Hợp đồng trên chuỗi đúng là mã nguồn này.** Mở trang hợp đồng trên Etherscan, tab *Contract*: mã nguồn đã được
   xác minh (Exact Match) với cấu hình Solidity 0.8.24, EVM `cancun`, optimizer 200 runs. So sánh với
   `remix/CleanHandover_flat.sol` tại commit ghi trong [docs/DEPLOYMENTS.md](docs/DEPLOYMENTS.md).
2. **Hợp đồng không có quyền quản trị.** Trong mã nguồn không có owner, không có hàm đổi cấu hình, không dùng proxy
   nâng cấp: danh sách verifier và bộ kiểm tra tài sản chỉ được đặt một lần trong constructor.
3. **Các cơ chế phòng thủ hoạt động.** Chạy `npm test` và kiểm thử fuzz như trên. Mỗi kịch bản tấn công trong
   [docs/THREAT_MODEL.md](docs/THREAT_MODEL.md) có ca kiểm thử tương ứng; kết quả đã chạy ghi ở
   [docs/SECURITY_ANALYSIS.md](docs/SECURITY_ANALYSIS.md).
4. **Dapp không làm gì ngoài những gì mã nguồn cho thấy.** Tự build và chạy (`npm run build`, rồi `npm run preview`)
   thay cho bản trên GitHub Pages. Địa chỉ hợp đồng mà dapp dùng nằm trong `client/src/lib/config.ts`.
5. **Không cần dapp.** Mọi chức năng gọi trực tiếp được trên Etherscan (tab *Read/Write Contract*) hoặc Remix;
   ví dụ `getReadiness(id)` và `getHandoverStatus(id)` trả về mặt nạ các điều kiện chưa đạt (bằng 0 là đạt).
6. **Một giao dịch thật đã chạy trọn vòng đời trên Sepolia**, kèm mã giao dịch từng bước:
   [docs/SEPOLIA_DEMO.md](docs/SEPOLIA_DEMO.md).

## Tự triển khai

- Hợp đồng: [docs/DEPLOY_REMIX.md](docs/DEPLOY_REMIX.md) (Remix + MetaMask, không cần khóa bí mật trong máy).
- Dapp: sửa địa chỉ hợp đồng trong `client/src/lib/config.ts`, chạy `npm run build` và đưa thư mục `dist/public`
  lên bất kỳ dịch vụ lưu trữ tĩnh nào. Repo này tự triển khai lên GitHub Pages qua `.github/workflows/pages.yml`.

## Giới hạn đã biết

- Chỉ hỗ trợ ví Safe (bản 1.3.0, 1.4.1, 1.5.0) và bốn loại tài sản: ETH, ERC-20, ERC-721, quyền owner theo Ownable.
- Token tự thay đổi số dư (rebase) hoặc thu phí khi chuyển không đối chiếu đúng được.
- Quyền đã ủy thác ra ngoài ví (allowance, chữ ký đã lưu) không phát hiện được bằng cách đọc trạng thái ví.
- Số owner mới và số tài sản mỗi giao dịch bị giới hạn để chặn chi phí gas.

Chi tiết ở [docs/THREAT_MODEL.md](docs/THREAT_MODEL.md).
