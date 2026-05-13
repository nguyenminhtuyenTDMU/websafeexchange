# Sơ Đồ Activity — Vòng Đời Giao Dịch Safe

Trả lời câu hỏi: **Nghiệp vụ chính chạy thế nào từ đầu đến cuối?**

```mermaid
flowchart TD
    START(["Bắt đầu"])

    START --> S1["Seller: Kết nối ví MetaMask\nXem thông tin Safe on-chain"]
    S1 --> S2["Seller: Tạo listing bán Safe\nKý xác thực EIP-191\nPOST /api/trades"]
    S2 --> SYS1["Hệ thống: Lưu trade\nTrạng thái: LISTED\nBroadcast WebSocket"]

    SYS1 --> D_BUYER{Buyer tìm\nvà chọn trade?}
    D_BUYER -->|"Không có / hủy"| CANCEL
    D_BUYER -->|Có| B1["Buyer: Tham gia giao dịch\nKý xác thực EIP-191\nPOST /api/trades/:id/join"]

    B1 --> SYS2["Hệ thống: Cập nhật JOINED\nThông báo Seller qua WebSocket"]
    SYS2 --> S3["Seller: Arm giao dịch on-chain\nGọi Escrow Contract\nSnapshot nonce Safe\nPOST /api/trades/:id/arm"]

    S3 --> SYS3["Hệ thống: Cập nhật ARMED\nBắt đầu watch Safe\nThông báo Buyer qua WebSocket"]
    SYS3 --> B2["Buyer: Nộp ký quỹ ETH\nDeposit vào Escrow Contract\nPOST /api/trades/:id/deposit"]

    B2 --> D_DEADLINE{Còn trong\nthời hạn?}
    D_DEADLINE -->|"Hết hạn"| CANCEL
    D_DEADLINE -->|Còn hạn| SYS4["Hệ thống: Cập nhật FUNDED\nThông báo Seller qua WebSocket"]

    SYS4 --> S4["Seller: Chuyển ownership Safe\nexecTransaction on-chain\n(remove seller + add buyer)"]
    S4 --> W1["Safe Watcher:\nExecutionSuccess event fire\nreadIsOwner buyer & seller\nreadNonce"]

    W1 --> D_OWNER{buyerIsOwner\n= true?}

    D_OWNER -->|"Có — ownership OK"| N1["Safe Watcher: Broadcast\nOWNERSHIP_TRANSFERRED\nThông báo Buyer"]
    D_OWNER -->|"Không — nonce tăng\nbất thường"| N2["Safe Watcher: Broadcast\nSUSPICIOUS_ACTIVITY\nCảnh báo gian lận"]

    N1 --> B3["Buyer: Xác nhận hoàn tất\nKý xác thực EIP-191\nPOST /api/trades/:id/complete"]
    B3 --> SYS5["Hệ thống: Cập nhật COMPLETED\nEscrow giải phóng ETH cho Seller\nThông báo cả hai bên"]
    SYS5 --> DONE(["Giao dịch hoàn tất"])

    N2 --> D_FRAUD{Quyết định\ncủa Buyer}
    D_FRAUD -->|"Yêu cầu hoàn tiền"| CANCEL
    D_FRAUD -->|"Đợi thêm"| S4

    %% ── Cancel paths ──────────────────────────────────────────────────────────
    CANCEL["Hủy giao dịch\nPOST /api/trades/:id/cancel\nEscrow hoàn ETH cho Buyer\n(nếu đã funded)"]
    CANCEL --> CANCELLED(["Giao dịch đã hủy"])

    S2 -. "Seller hủy" .-> CANCEL
    B1 -. "Buyer hủy" .-> CANCEL
    S3 -. "Seller hủy" .-> CANCEL
    B2 -. "Buyer hủy" .-> CANCEL
```

## Chú giải

| Ký hiệu | Ý nghĩa |
|---------|--------|
| Hình chữ nhật thường | Hành động của người dùng hoặc hệ thống |
| Hình thoi `{ }` | Điểm quyết định (decision) |
| Oval `([ ])` | Trạng thái bắt đầu / kết thúc |
| Mũi tên đứt `-.->` | Luồng hủy (có thể xảy ra tại nhiều điểm) |
| `Safe Watcher` | Background service, không có user interaction |
