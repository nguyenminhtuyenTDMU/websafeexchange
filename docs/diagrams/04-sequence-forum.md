# Sequence Diagram — Phân hệ Diễn đàn

> Tương ứng với **Use Case Phân rã 3: Phân hệ Diễn đàn**

Mô tả các luồng tương tác với diễn đàn cộng đồng: xem bài, bình luận ẩn danh, đăng bài có ví, xóa bài.

---

```mermaid
sequenceDiagram
    actor Anon as Người dùng ẩn danh
    actor WU as Người dùng (có ví)
    actor Admin as Admin
    participant BE as Backend (Express)
    participant DB as Database
    participant SAFE_API as Safe Global API

    rect rgb(210, 235, 255)
        Note over Anon,SAFE_API: Luồng 1 — Xem bài diễn đàn (không cần ví)

        Anon->>+BE: GET /api/forum/posts?type=DISCUSSION
        BE->>DB: getForumPosts(type: DISCUSSION)
        DB-->>BE: posts[]
        BE-->>-Anon: 200 posts[]

        Anon->>+BE: GET /api/forum/posts/:id
        BE->>DB: getForumPost(id)
        DB-->>BE: post
        BE->>DB: getCommentsByPost(id)
        DB-->>BE: comments[]
        BE-->>-Anon: 200 { post, comments }
    end

    rect rgb(210, 255, 215)
        Note over Anon,SAFE_API: Luồng 2 — Bình luận ẩn danh (không cần ký)

        Anon->>+BE: POST /api/forum/posts/:id/comments\n{ content, anonId }
        BE->>DB: getForumPost(id)
        DB-->>BE: post
        BE->>BE: Kiểm tra content ≤ 5000 ký tự
        BE->>DB: createComment(content, anonId, postId)
        DB-->>BE: comment
        BE-->>-Anon: 201 comment
    end

    rect rgb(255, 245, 200)
        Note over Anon,SAFE_API: Luồng 3 — Đăng bài rao bán Safe (SELL — phải ký)

        WU->>WU: Ký message\n"SafeExchange:create-forum-post:sell:{ts}"
        WU->>+BE: POST /api/forum/posts\n{ type: SELL, safeAddress, title, content,\n  authorAddress, signature, signedMessage }
        BE->>BE: Verify EIP-191 — recover address == authorAddress
        BE->>BE: Kiểm tra title ≤ 300, content ≤ 10000
        BE->>+SAFE_API: GET /api/v1/safes/{safeAddress}/\n(safe-transaction-sepolia.safe.global)
        SAFE_API-->>-BE: { owners[], threshold, nonce, version }
        BE->>BE: Tạo safeSnapshot JSON\n{ address, owners, threshold, nonce, verifiedAt }
        BE->>DB: createForumPost(type: SELL, safeSnapshot)
        DB-->>BE: post
        BE-->>-WU: 201 post

        Note right of BE: Nếu Safe API timeout/lỗi\n→ post vẫn được tạo\nkhông có safeSnapshot
    end

    rect rgb(230, 220, 255)
        Note over Anon,SAFE_API: Luồng 4 — Đăng bài thảo luận / hỏi đáp (không cần ký)

        WU->>+BE: POST /api/forum/posts\n{ type: DISCUSSION, title, content }
        BE->>BE: Kiểm tra type không phải PINNED
        BE->>BE: Kiểm tra content ≤ 10000
        BE->>DB: createForumPost(type: DISCUSSION)
        DB-->>BE: post
        BE-->>-WU: 201 post
    end

    rect rgb(255, 225, 195)
        Note over Anon,SAFE_API: Luồng 5 — Xóa bài (chỉ tác giả, phải ký)

        WU->>WU: Ký message\n"SafeExchange:delete-forum-post:{postId}:{ts}"
        WU->>+BE: DELETE /api/forum/posts/:id\n{ authorAddress, signature, signedMessage }
        BE->>DB: getForumPost(id)
        DB-->>BE: post
        BE->>BE: Kiểm tra post.isPinned == false
        BE->>BE: Kiểm tra post.authorAddress == authorAddress
        BE->>BE: Verify EIP-191 — recover address == authorAddress
        BE->>DB: deleteForumPost(id)
        BE-->>-WU: 200 { success: true }
    end

    rect rgb(215, 255, 240)
        Note over Anon,SAFE_API: Luồng 6 — Admin ghim bài (PINNED — future)

        Admin->>+BE: POST /api/forum/posts\n{ type: PINNED, isPinned: true, ... }
        Note right of BE: Hiện tại endpoint từ chối type PINNED\ncho người dùng thông thường\n(reserved cho admin)
        BE-->>-Admin: 403 Forbidden (nếu không phải admin)
    end
```
