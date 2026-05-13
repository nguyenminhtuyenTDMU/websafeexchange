# Sơ Đồ ERD — Cơ Sở Dữ Liệu

Trả lời câu hỏi: **Dữ liệu được lưu như thế nào?**

```mermaid
erDiagram

    users {
        uuid id PK
        text walletAddress UK "lowercase, index"
        text displayName "nullable"
        timestamp createdAt
    }

    trades {
        uuid id PK
        text safeAddress "địa chỉ Gnosis Safe"
        text sellerAddress "ví người bán (lowercase)"
        text buyerAddress "ví người mua (nullable)"
        decimal priceEth "precision 18, scale 8"
        timestamp deadline "hạn chót giao dịch"
        text onchainTradeId "bytes32 từ Escrow Contract (nullable)"
        text snapshotNonce "nonce Safe lúc arm (nullable)"
        trade_status status "DRAFT|LISTED|JOINED|ARMED|FUNDED|COMPLETED|CANCELLED"
        timestamp createdAt
        timestamp updatedAt
    }

    system_logs {
        uuid id PK
        log_type type "TRADE_EVENT|SECURITY|SYSTEM"
        text message
        uuid relatedTradeId FK "nullable"
        text metadata "JSON string (nullable)"
        timestamp createdAt
    }

    forum_posts {
        uuid id PK
        forum_post_type type "SELL|BUY_REQUEST|DISCUSSION|QA|PINNED"
        text title "nullable"
        text question "nullable"
        text content
        text tags "JSON array string (nullable)"
        text authorAlias "default: Ẩn danh"
        text authorAddress "nullable (ẩn danh được phép)"
        text contact "nullable"
        decimal budgetEth "nullable, cho BUY_REQUEST"
        boolean isPinned
        text safeAddress "nullable, cho SELL post"
        text safeSnapshot "JSON snapshot Safe on-chain lúc đăng (nullable)"
        timestamp createdAt
        timestamp updatedAt
    }

    forum_comments {
        uuid id PK
        uuid postId FK
        uuid parentId "self-ref reply (nullable, không có FK constraint)"
        text content
        text authorAlias "default: Ẩn danh"
        text authorAddress "nullable"
        text anonId "12 ký tự đầu browser UUID (nullable)"
        timestamp createdAt
    }

    trades ||--o{ system_logs : "ghi log"
    forum_posts ||--o{ forum_comments : "có bình luận"
    forum_comments }o--o| forum_comments : "reply lồng nhau (parentId)"
```

## Quan hệ logic (không có FK trong DB)

| Trường | Bảng | Tham chiếu logic đến |
|--------|------|---------------------|
| `sellerAddress` | trades | users.walletAddress |
| `buyerAddress` | trades | users.walletAddress |
| `authorAddress` | forum_posts | users.walletAddress |
| `authorAddress` | forum_comments | users.walletAddress |

> Thiết kế cố ý **không dùng FK** cho wallet address vì người dùng có thể đăng bài ẩn danh mà không cần tạo tài khoản trước.

## Enum values

| Enum | Giá trị |
|------|--------|
| `trade_status` | `DRAFT`, `LISTED`, `JOINED`, `ARMED`, `FUNDED`, `COMPLETED`, `CANCELLED` |
| `log_type` | `TRADE_EVENT`, `SECURITY`, `SYSTEM` |
| `forum_post_type` | `SELL`, `BUY_REQUEST`, `DISCUSSION`, `QA`, `PINNED` |
