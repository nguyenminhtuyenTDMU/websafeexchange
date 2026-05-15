# Use Case Diagrams — WebSafeExchange

> Actor được biểu diễn bằng hình chữ nhật, use case bằng hình bầu dục `([...])` — tương thích với mọi phiên bản Mermaid.

---

## 1. Sơ đồ Use Case Tổng quan

> Seller và Buyer được gộp thành **User**. Chi tiết vai trò xem ở phần phân rã bên dưới.

```mermaid
flowchart LR
    ActorUser["User\n(Seller / Buyer)"]
    ActorAdmin["Admin"]

    subgraph WSE["WebSafeExchange"]
        AUTH([Xác thực ví Web3])

        UC1([Thực hiện giao dịch Safe])
        UC2([Tìm kiếm giao dịch])
        UC3([Xem chi tiết giao dịch])
        UC4([Quản lý ví Safe])
        UC5([Đăng bài diễn đàn])
        UC6([Xem bài diễn đàn])
        UC7([Bình luận bài viết])
        UC8([Cập nhật hồ sơ cá nhân])

        UC9([Quản lý nội dung diễn đàn])
        UC10([Xem nhật ký hệ thống])

        UC1 -.->|"<<include>>"| AUTH
        UC4 -.->|"<<include>>"| AUTH
        UC5 -.->|"<<include>>"| AUTH
        UC8 -.->|"<<include>>"| AUTH

        UC7 -.->|"<<extend>>"| UC6
        UC9 -.->|"<<extend>>"| UC6
    end

    ActorUser --- UC1
    ActorUser --- UC2
    ActorUser --- UC3
    ActorUser --- UC4
    ActorUser --- UC5
    ActorUser --- UC6
    ActorUser --- UC7
    ActorUser --- UC8

    ActorAdmin --- UC9
    ActorAdmin --- UC10
    ActorAdmin --- UC6
```

---

## 2. Phân rã: Phân hệ Giao dịch Safe

```mermaid
flowchart LR
    Seller["Seller\n(Người bán)"]
    Buyer["Buyer\n(Người mua)"]

    subgraph TRADE["Phân hệ Giao dịch Safe"]
        subgraph SEL["Chức năng Seller"]
            UC_CREATE([Tạo giao dịch bán Safe])
            UC_ARM([Ký bảo đảm giao dịch])
        end

        subgraph SHARED["Chức năng chung"]
            UC_SEARCH([Tìm kiếm giao dịch])
            UC_VIEW([Xem chi tiết giao dịch])
            UC_COMPLETE([Hoàn tất giao dịch])
            UC_CANCEL([Hủy giao dịch])
            UC_LOGS([Xem nhật ký giao dịch])
            AUTH_T([Xác thực ví Web3])
        end

        subgraph BUY["Chức năng Buyer"]
            UC_JOIN([Tham gia giao dịch])
            UC_DEPOSIT([Nạp tiền ký quỹ])
        end

        UC_CREATE -.->|"<<include>>"| AUTH_T
        UC_ARM    -.->|"<<include>>"| AUTH_T
        UC_JOIN   -.->|"<<include>>"| AUTH_T
        UC_DEPOSIT-.->|"<<include>>"| AUTH_T
        UC_COMPLETE-.->|"<<include>>"| AUTH_T
        UC_CANCEL -.->|"<<include>>"| AUTH_T

        UC_LOGS   -.->|"<<extend>>"| UC_VIEW
        UC_CANCEL -.->|"<<extend>>"| UC_VIEW
    end

    Seller --- UC_CREATE
    Seller --- UC_ARM
    Seller --- UC_SEARCH
    Seller --- UC_VIEW
    Seller --- UC_COMPLETE
    Seller --- UC_CANCEL
    Seller --- UC_LOGS

    Buyer --- UC_JOIN
    Buyer --- UC_DEPOSIT
    Buyer --- UC_SEARCH
    Buyer --- UC_VIEW
    Buyer --- UC_COMPLETE
    Buyer --- UC_CANCEL
    Buyer --- UC_LOGS
```

---

## 3. Phân rã: Phân hệ Diễn đàn

```mermaid
flowchart LR
    WalletUser["Người dùng\n(Có ví)"]
    AnonUser["Người dùng\nẩn danh"]
    ForumAdmin["Admin"]

    subgraph FORUM["Phân hệ Diễn đàn"]
        subgraph WALLET_UC["Chức năng người dùng có ví"]
            UC_SELL_POST([Đăng bài rao bán Safe])
            UC_BUY_POST([Đăng bài tìm mua Safe])
            UC_DISC_POST([Đăng bài thảo luận / Hỏi đáp])
            UC_DELETE([Xóa bài của mình])
        end

        subgraph COMMON_UC["Chức năng chung"]
            UC_READ([Xem bài diễn đàn])
            UC_COMMENT([Bình luận bài viết])
            AUTH_F([Xác thực ví Web3])
        end

        subgraph ADMIN_UC["Chức năng Admin"]
            UC_PIN([Ghim bài viết])
            UC_DEL_ANY([Xóa bài bất kỳ])
        end

        UC_SELL_POST -.->|"<<include>>"| AUTH_F
        UC_BUY_POST  -.->|"<<include>>"| AUTH_F
        UC_DISC_POST -.->|"<<include>>"| AUTH_F
        UC_DELETE    -.->|"<<include>>"| AUTH_F
        UC_PIN       -.->|"<<include>>"| AUTH_F

        UC_COMMENT   -.->|"<<extend>>"| UC_READ
        UC_DELETE    -.->|"<<extend>>"| UC_SELL_POST
    end

    WalletUser  --- UC_SELL_POST
    WalletUser  --- UC_BUY_POST
    WalletUser  --- UC_DISC_POST
    WalletUser  --- UC_DELETE
    WalletUser  --- UC_READ
    WalletUser  --- UC_COMMENT

    AnonUser    --- UC_READ
    AnonUser    --- UC_COMMENT

    ForumAdmin  --- UC_PIN
    ForumAdmin  --- UC_DEL_ANY
    ForumAdmin  --- UC_READ
```

---

## 4. Phân rã: Phân hệ Quản lý Safe

```mermaid
flowchart LR
    SafeUser["User\n(Chủ Safe)"]

    subgraph SAFE_SYS["Phân hệ Quản lý Safe"]
        UC_CONNECT([Kết nối ví Web3])
        UC_VIEW_SAFE([Xem thông tin ví Safe])
        UC_VIEW_OWNERS([Xem danh sách chủ sở hữu])
        UC_VIEW_PENDING([Xem giao dịch chờ xác nhận])
        UC_PREPARE([Chuẩn bị cấu hình Safe])
        UC_SNAPSHOT([Xem ảnh chụp trạng thái Safe])
        AUTH_S([Xác thực ví Web3])

        UC_CONNECT -.->|"<<include>>"| AUTH_S
        UC_PREPARE -.->|"<<include>>"| AUTH_S

        UC_VIEW_OWNERS  -.->|"<<extend>>"| UC_VIEW_SAFE
        UC_VIEW_PENDING -.->|"<<extend>>"| UC_VIEW_SAFE
        UC_SNAPSHOT     -.->|"<<extend>>"| UC_VIEW_SAFE
    end

    SafeUser --- UC_CONNECT
    SafeUser --- UC_VIEW_SAFE
    SafeUser --- UC_VIEW_OWNERS
    SafeUser --- UC_VIEW_PENDING
    SafeUser --- UC_PREPARE
    SafeUser --- UC_SNAPSHOT
```
