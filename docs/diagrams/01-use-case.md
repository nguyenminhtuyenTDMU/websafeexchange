# Sơ Đồ Use Case Tổng Quát

Trả lời câu hỏi: **Ai dùng hệ thống và họ làm được gì?**

> Seller và Buyer được gộp chung thành **Người dùng** trong sơ đồ này — cùng một ví, đóng vai trò khác nhau tùy từng giao dịch. Xem [00-decomposition.md](./00-decomposition.md) để biết chức năng nào thuộc về vai trò nào.

```mermaid
flowchart LR
    Guest(["Khách\n(chưa kết nối ví)"])
    User(["Người dùng\n(đã kết nối ví)"])
    Sys(["Hệ thống\n(Safe Watcher)"])

    subgraph BOUNDARY["Hệ thống WebSafeExchange"]

        subgraph PUBLIC["Công khai"]
            UC1("Xem danh sách\ngiao dịch")
            UC2("Tìm kiếm\ngiao dịch / Safe")
            UC3("Xem forum")
            UC4("Xem thông tin\nSafe on-chain")
        end

        subgraph TRADE["Giao dịch Safe"]
            UC5("Tạo listing bán Safe")
            UC6("Tham gia giao dịch")
            UC7("Arm giao dịch on-chain")
            UC8("Nộp ký quỹ ETH")
            UC9("Xác nhận hoàn tất")
            UC10("Hủy giao dịch")
        end

        subgraph COMMUNITY["Cộng đồng & Hồ sơ"]
            UC11("Đăng bài forum")
            UC12("Bình luận")
            UC13("Cập nhật hồ sơ")
        end

        subgraph BASE["Cơ sở"]
            UCB1("Ký xác thực ví\nEIP-191 signature")
            UCB2("Gọi Escrow Contract\non-chain TX")
        end

        subgraph WATCHER["Tự động — Safe Watcher"]
            UCW1("Giám sát Safe\nwatch ExecutionSuccess")
            UCW2("Kiểm tra isOwner\n& nonce")
            UCW3("Phát hiện\nownership transfer")
            UCW4("Cảnh báo\ngian lận")
            UCW5("Gửi thông báo\nWebSocket")
        end

    end

    Guest --> UC1
    Guest --> UC2
    Guest --> UC3
    Guest --> UC4

    User --> UC1
    User --> UC2
    User --> UC3
    User --> UC4
    User --> UC5
    User --> UC6
    User --> UC7
    User --> UC8
    User --> UC9
    User --> UC10
    User --> UC11
    User --> UC12
    User --> UC13

    Sys --> UCW1

    %% ── Include ──────────────────────────────────────────────────────────────
    UC5 -. "«include»" .-> UCB1
    UC6 -. "«include»" .-> UCB1
    UC7 -. "«include»" .-> UCB1
    UC8 -. "«include»" .-> UCB1
    UC9 -. "«include»" .-> UCB1
    UC10 -. "«include»" .-> UCB1

    UC7 -. "«include»" .-> UCB2
    UC8 -. "«include»" .-> UCB2

    UCW1 -. "«include»" .-> UCW2
    UCW3 -. "«include»" .-> UCW2
    UCW3 -. "«include»" .-> UCW5

    %% ── Extend ───────────────────────────────────────────────────────────────
    UC10 -. "«extend»\n[trước khi hoàn tất]" .-> UC9
    UCW4 -. "«extend»\n[nonce tăng, buyer chưa là owner]" .-> UCW1
    UCW4 -. "«include»" .-> UCW5
```

## Ghi chú

| Quan hệ | Ý nghĩa trong hệ thống |
|---------|----------------------|
| `«include»` UCB1 | Mọi thao tác ghi đều yêu cầu chữ ký EIP-191 để xác thực quyền sở hữu ví |
| `«include»` UCB2 | Arm và Deposit đòi hỏi giao dịch on-chain trực tiếp với Escrow Contract |
| `«extend»` UC10 → UC9 | Buyer hoặc Seller có thể hủy thay vì xác nhận hoàn tất (trước khi trade COMPLETED) |
| `«extend»` UCW4 → UCW1 | Cảnh báo gian lận chỉ kích hoạt khi nonce Safe tăng mà buyer chưa thành owner |
