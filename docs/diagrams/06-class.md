# Sơ đồ Lớp — WebSafeExchange

Gồm 2 phần: **Domain Model** (thực thể nghiệp vụ) và **Application Layer** (tầng ứng dụng).

---

## 1. Domain Model — Thực thể nghiệp vụ & quan hệ

```mermaid
classDiagram
    direction TB

    class TradeStatus {
        <<enumeration>>
        DRAFT
        LISTED
        JOINED
        ARMED
        FUNDED
        COMPLETED
        CANCELLED
    }

    class LogType {
        <<enumeration>>
        TRADE_EVENT
        SECURITY
        SYSTEM
    }

    class ForumPostType {
        <<enumeration>>
        SELL
        BUY_REQUEST
        DISCUSSION
        QA
        PINNED
    }

    class User {
        +String id
        +String walletAddress
        +String displayName
        +Date createdAt
    }

    class Trade {
        +String id
        +String safeAddress
        +String sellerAddress
        +String buyerAddress
        +Decimal priceEth
        +Date deadline
        +String onchainTradeId
        +String snapshotNonce
        +TradeStatus status
        +Date createdAt
        +Date updatedAt
    }

    class SystemLog {
        +String id
        +LogType type
        +String message
        +String relatedTradeId
        +String metadata
        +Date createdAt
    }

    class ForumPost {
        +String id
        +ForumPostType type
        +String title
        +String question
        +String content
        +String tags
        +String authorAlias
        +String authorAddress
        +String contact
        +Decimal budgetEth
        +Boolean isPinned
        +String safeAddress
        +String safeSnapshot
        +Date createdAt
        +Date updatedAt
    }

    class ForumComment {
        +String id
        +String postId
        +String parentId
        +String content
        +String authorAlias
        +String authorAddress
        +String anonId
        +Date createdAt
    }

    Trade --> TradeStatus : status
    SystemLog --> LogType : type
    ForumPost --> ForumPostType : type

    Trade "1" --> "0..*" SystemLog : sinh ra
    ForumPost "1" *-- "0..*" ForumComment : chứa (CASCADE)
    ForumComment "0..1" --> "0..*" ForumComment : trả lời (self-ref)

    User "1" ..> "0..*" Trade : đăng bán / tham gia mua
    User "1" ..> "0..*" ForumPost : đăng bài (authorAddress)
```

---

## 2. Application Layer — Tầng ứng dụng

```mermaid
classDiagram
    direction LR

    class IStorage {
        <<interface>>
        +getUser(id) User
        +getUserByWallet(address) User
        +createUser(user) User
        +getUserByWalletOrCreate(address) User
        +updateUserDisplayName(address, name) User
        +getTrade(id) Trade
        +getAllTrades() Trade[]
        +getTradesBySeller(address) Trade[]
        +getTradesByBuyer(address) Trade[]
        +getTradeBySafeAddress(address) Trade
        +createTrade(trade) Trade
        +updateTrade(id, data) Trade
        +createLog(log) SystemLog
        +getLogsByTrade(tradeId) SystemLog[]
        +getForumPosts(type) ForumPost[]
        +getForumPost(id) ForumPost
        +createForumPost(post) ForumPost
        +deleteForumPost(id) boolean
        +getCommentsByPost(postId) ForumComment[]
        +createComment(comment) ForumComment
        +seedForumPosts() void
    }

    class DatabaseStorage {
        -db DrizzleORM
        +getUser(id) User
        +getUserByWallet(address) User
        +createUser(user) User
        +getUserByWalletOrCreate(address) User
        +updateUserDisplayName(address, name) User
        +getTrade(id) Trade
        +getAllTrades() Trade[]
        +getTradesBySeller(address) Trade[]
        +getTradesByBuyer(address) Trade[]
        +getTradeBySafeAddress(address) Trade
        +createTrade(trade) Trade
        +updateTrade(id, data) Trade
        +createLog(log) SystemLog
        +getLogsByTrade(tradeId) SystemLog[]
        +getForumPosts(type) ForumPost[]
        +getForumPost(id) ForumPost
        +createForumPost(post) ForumPost
        +deleteForumPost(id) boolean
        +getCommentsByPost(postId) ForumComment[]
        +createComment(comment) ForumComment
        +seedForumPosts() void
    }

    class Auth {
        <<module>>
        +verifySignature(sig, msg, addr) VerifyResult
        +requireSignature(req, addr, action, scope) Error
        +validateEthAddress(address) boolean
        +buildSignMessage(action, scope, ts) String
    }

    class EventBroadcaster {
        -wss WebSocketServer
        -clients Set
        +initialize(server) void
        +broadcastNewTrade(trade) void
        +broadcastTradeUpdate(id, status, data) void
        +broadcastContractEvent(name, data) void
        +sendToWallet(address, title, msg, type) void
        +sendToParticipants(title, msg, type) void
        +getClientCount() int
    }

    class TradeController {
        +getAll(req, res) void
        +search(req, res) void
        +getById(req, res) void
        +create(req, res) void
        +join(req, res) void
        +arm(req, res) void
        +deposit(req, res) void
        +complete(req, res) void
        +cancel(req, res) void
    }

    class ForumController {
        +getPosts(req, res) void
        +createPost(req, res) void
        +getPost(req, res) void
        +deletePost(req, res) void
        +createComment(req, res) void
    }

    class SafeController {
        +getInfo(req, res) void
    }

    class UserController {
        +getProfile(req, res) void
        +updateProfile(req, res) void
    }

    DatabaseStorage ..|> IStorage : implements

    TradeController --> IStorage : uses
    TradeController --> Auth : xác thực chữ ký
    TradeController --> EventBroadcaster : phát sự kiện

    ForumController --> IStorage : uses
    ForumController --> Auth : xác thực chữ ký

    SafeController --> Auth : validate address

    UserController --> IStorage : uses
    UserController --> Auth : xác thực chữ ký
```
