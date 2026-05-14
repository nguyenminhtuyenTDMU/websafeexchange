# ERD — Sơ đồ Quan hệ Cơ sở dữ liệu

> Database: **PostgreSQL** — ORM: **Drizzle ORM**
>
> Ghi chú: `sellerAddress`, `buyerAddress`, `authorAddress` là cột `text` tham chiếu ngữ nghĩa đến `users.walletAddress`, **không có FK vật lý** (Web3 identity — ví có thể tồn tại trước khi đăng ký profile).

---

```mermaid
erDiagram

    users {
        varchar id PK "UUID — gen_random_uuid()"
        text wallet_address UK "lowercase ETH address — duy nhất"
        text display_name "nullable — tên hiển thị"
        timestamp created_at "defaultNow"
    }

    trades {
        varchar id PK "UUID"
        text safe_address "lowercase Gnosis Safe address"
        text seller_address "lowercase ETH address (ref users)"
        text buyer_address "nullable — set khi buyer join"
        decimal price_eth "precision 18 scale 8 — giá tính bằng ETH"
        timestamp deadline "hạn chót hoàn tất giao dịch"
        text onchain_trade_id "nullable — set khi arm on-chain"
        text snapshot_nonce "nullable — nonce Safe lúc arm"
        trade_status status "DRAFT|LISTED|JOINED|ARMED|FUNDED|COMPLETED|CANCELLED"
        timestamp created_at "defaultNow"
        timestamp updated_at "cập nhật mỗi lần đổi trạng thái"
    }

    system_logs {
        varchar id PK "UUID"
        log_type type "TRADE_EVENT|SECURITY|SYSTEM"
        text message "nội dung log"
        varchar related_trade_id FK "nullable → trades.id"
        text metadata "nullable — JSON tùy chọn"
        timestamp created_at "defaultNow"
    }

    forum_posts {
        varchar id PK "UUID"
        forum_post_type type "SELL|BUY_REQUEST|DISCUSSION|QA|PINNED"
        text title "nullable — tiêu đề bài viết"
        text question "nullable — dùng cho loại QA"
        text content "nội dung — max 10000 ký tự"
        text tags "nullable — JSON array: [tag1, tag2]"
        text author_alias "tên tác giả — default: Ẩn danh"
        text author_address "nullable — lowercase ETH (ref users)"
        text contact "nullable — thông tin liên hệ"
        decimal budget_eth "nullable — ngân sách (BUY_REQUEST)"
        boolean is_pinned "false — true chỉ Admin set"
        text safe_address "nullable — Safe rao bán (SELL)"
        text safe_snapshot "nullable — JSON on-chain snapshot lúc đăng"
        timestamp created_at "defaultNow"
        timestamp updated_at "defaultNow"
    }

    forum_comments {
        varchar id PK "UUID"
        varchar post_id FK "→ forum_posts.id (ON DELETE CASCADE)"
        varchar parent_id "nullable — self-ref (không có FK vật lý)"
        text content "nội dung — max 5000 ký tự"
        text author_alias "tên tác giả — default: Ẩn danh"
        text author_address "nullable — lowercase ETH address"
        text anon_id "nullable — 12 ký tự đầu browser UUID"
        timestamp created_at "defaultNow"
    }

    trades      ||--o{   system_logs   : "relatedTradeId (nullable FK)"
    forum_posts ||--|{   forum_comments : "postId (CASCADE DELETE)"
    forum_comments }o--o| forum_comments : "parentId (self-ref reply)"
```

---

## Ghi chú thiết kế

| Quyết định | Lý do |
|---|---|
| `wallet_address` là `UNIQUE` không phải PK | Cho phép hệ thống dùng UUID làm PK chuẩn, tránh phụ thuộc vào địa chỉ ví |
| Không có FK từ `trades` → `users` | Seller/buyer có thể giao dịch mà chưa tạo profile — identity qua chữ ký EIP-191 |
| `safe_snapshot` lưu JSON text | Tránh join phức tạp; snapshot chỉ đọc sau khi tạo |
| `tags` lưu JSON text | Linh hoạt thêm/bớt tag không cần migration schema |
| `parent_id` không có FK | Tránh circular FK; tính toàn vẹn kiểm soát ở tầng ứng dụng |
| `CASCADE DELETE` trên `forum_comments.post_id` | Xóa bài tự động xóa toàn bộ comment — đơn giản hóa logic xóa |
| `status` dùng PostgreSQL enum | Đảm bảo data integrity, không cần check constraint riêng |
