# Sơ Đồ Phân Tích Thiết Kế — WebSafeExchange

Bộ sơ đồ trả lời đủ 5 câu hỏi thiết yếu, không thừa không thiếu.

| # | Sơ đồ | Câu hỏi trả lời |
|---|-------|----------------|
| 0 | [Phân Rã Chức Năng](./00-decomposition.md) | Hệ thống gồm những mảng chức năng nào? Seller / Buyer làm gì? |
| 1 | [Use Case](./01-use-case.md) | Ai dùng hệ thống và họ làm được gì? |
| 2 | [Activity — Trade Lifecycle](./02-activity-trade.md) | Nghiệp vụ chính chạy thế nào từ đầu đến cuối? |
| 3 | [Sequence — Luồng Giao Dịch](./03-sequence-trade.md) | Frontend, Backend, DB, Blockchain tương tác theo thứ tự nào? |
| 4 | [Sequence — Safe Watcher](./04-sequence-watcher.md) | Hệ thống phát hiện ownership chuyển / gian lận như thế nào? |
| 5 | [ERD](./05-erd.md) | Dữ liệu được lưu như thế nào? |
| 6 | [Component Architecture](./06-component.md) | Hệ thống gồm những phần nào, liên kết ra sao? |
| 7 | [Deployment](./07-deployment.md) | Hệ thống deploy ở đâu? |

## Tổng quan hệ thống

**WebSafeExchange** là nền tảng cho phép mua bán chuyển nhượng **Gnosis Safe multisig wallet** có bảo đảm bằng escrow contract trên Ethereum (Sepolia).

- **Seller** đăng bán Safe → **Buyer** tham gia → Seller arm trade trên blockchain → Buyer nộp ETH ký quỹ → Seller chuyển ownership Safe → Hệ thống tự động phát hiện → Hoàn tất giải phóng ETH
- **Safe Watcher** giám sát on-chain theo kiểu event-driven (không polling) — phát hiện ownership transfer thành công hoặc cảnh báo gian lận
- **Forum** hỗ trợ cộng đồng: đăng bán, tìm mua, hỏi đáp
- **WebSocket** gửi thông báo real-time đúng đến ví người liên quan

## Tất cả sơ đồ dùng Mermaid

Render trực tiếp trong GitHub, VS Code (Markdown Preview Mermaid Support), và GitBook.
