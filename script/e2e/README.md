# Kiểm thử đầu-cuối qua giao diện (local)

Chạy toàn bộ một giao dịch qua giao diện dapp trên node Hardhat của máy: người bán niêm yết, bật module,
người mua xem báo cáo, xác nhận và nạp tiền, hoàn tất bàn giao, người bán rút tiền, rồi tra cứu.
Chrome được điều khiển bằng `playwright-core`; ví được giả lập bằng một EIP-1193 provider chuyển yêu cầu
tới node (tài khoản thử nghiệm của Hardhat đã mở khóa sẵn), nên không cần MetaMask và không có private key thật nào.

Mở 3 terminal ở thư mục gốc repo:

```
# 1. node Hardhat
npx hardhat node --config hardhat.config.cjs

# 2. deploy Safe 1.5.0 (SafeL2), verifier, checker, escrow và một ví Safe của người bán; ghi client/.env.e2e
SAFE_VERSION=1.5.0 SAFE_VARIANT=L2 npx hardhat run script/e2e/deploy-local.cjs --network localhost --config hardhat.config.cjs

# 3. dapp trỏ vào node local
npx vite --mode e2e --port 5175
```

Rồi chạy: `npm run e2e`. Ảnh chụp từng bước lưu ở `script/e2e/out/`; dòng cuối in `KẾT QUẢ: ĐẠT` khi owner
duy nhất của ví sau bàn giao là người mua. Mỗi lần chạy lại cần node mới (khởi động lại bước 1 và 2),
vì ví Safe đã thuộc về người mua sau lần chạy trước.

Bước "bật module" do script làm trực tiếp bằng `execTransaction` của Safe, đúng như người bán tự làm trong
Safe{Wallet}: dapp chỉ hướng dẫn, không dựng giao dịch Safe thay người bán.
