# SafeExchange — Software Design Description (SDD)

> **Chuẩn tham chiếu:** IEEE Std 1016-2009 · ISO/IEC/IEEE 42010  
> **Phiên bản:** 1.0  
> **Ngày:** 2026-04-16  
> **Tác giả:** NGUYEN MINH TUYEN  

---

## Mục lục

1. [Giới thiệu](#1-giới-thiệu)
2. [Tổng quan Hệ thống](#2-tổng-quan-hệ-thống)
3. [Actors](#3-actors)
4. [Sơ đồ Use Case Tổng quan](#4-sơ-đồ-use-case-tổng-quan)
5. [Sơ đồ Use Case Chi tiết](#5-sơ-đồ-use-case-chi-tiết)
6. [Đặc tả Use Case (15 UC)](#6-đặc-tả-use-case)
7. [Sơ đồ Trạng thái Trade](#7-sơ-đồ-trạng-thái-trade)
8. [Sequence Diagrams](#8-sequence-diagrams)
9. [Database ERD](#9-database-erd)
10. [Smart Contract — Class Diagram](#10-smart-contract--class-diagram)
11. [Kiến trúc Hệ thống](#11-kiến-trúc-hệ-thống)
12. [Frontend — Component Tree](#12-frontend--component-tree)
13. [API Design](#13-api-design)
14. [Bảo mật — STRIDE Threat Model](#14-bảo-mật--stride-threat-model)

---

## 1. Giới thiệu

### 1.1 Mục đích

Tài liệu này mô tả thiết kế phần mềm cho **SafeExchange** — nền tảng mua bán Gnosis Safe wallet có escrow on-chain. Tài liệu đóng vai trò **Single Source of Truth** cho mọi AI coding agent và thành viên nhóm phát triển.

### 1.2 Phạm vi

SafeExchange giải quyết bài toán: làm thế nào để buyer và seller thực hiện giao dịch chuyển nhượng Safe wallet một cách **trustless** (không cần tin tưởng lẫn nhau), sử dụng smart contract escrow để đảm bảo:
- ETH chỉ giải ngân khi buyer thực sự là owner mới của Safe (verify on-chain)
- Buyer được hoàn tiền nếu phát hiện Safe thực hiện giao dịch bất thường (nonce tăng)
- Mọi bên đều có bằng chứng on-chain không thể giả mạo

### 1.3 Các thành phần chính

| Layer | Công nghệ |
|-------|-----------|
| Smart Contract | Solidity 0.8.19 — `SafeExchangeEscrow` |
| Blockchain | Ethereum / Sepolia testnet |
| Backend | Express.js + TypeScript |
| Database | PostgreSQL via Drizzle ORM |
| Frontend | React + Wagmi + Viem |
| Real-time | WebSocket (ws) |
| Safe SDK | `@safe-global/protocol-kit` |

---

## 2. Tổng quan Hệ thống

SafeExchange hoạt động theo mô hình **dual-layer verification**:

1. **Off-chain layer** (Express API + PostgreSQL): quản lý trạng thái trade, listing, thông báo real-time
2. **On-chain layer** (Smart Contract): giữ ETH escrow, verify ownership Safe, emit events bất biến

Hai layer đồng bộ qua: frontend gọi contract → lắng nghe event → gọi API cập nhật DB.

---

## 3. Actors

| Actor | Loại | Mô tả |
|-------|------|-------|
| **Seller** | Primary | Chủ sở hữu Gnosis Safe muốn bán. Phải là `owner` của Safe on-chain |
| **Buyer** | Primary | Người muốn mua Safe. Cung cấp ETH escrow |
| **Anyone / Public** | Secondary | Bất kỳ ai có thể gọi `cancelTimeout()` và xem lịch sử |
| **Gnosis Safe** | System | Smart contract Safe — cung cấp `isOwner()`, `nonce()` để verify |
| **SafeExchangeEscrow** | System | Smart contract escrow — giữ ETH, verify, giải ngân |
| **Safe Watcher** | System | Background service theo dõi events on-chain |

---

## 4. Sơ đồ Use Case Tổng quan

> Render bằng VS Code extension **PlantUML by jebbs** hoặc paste vào [kroki.io](https://kroki.io/plantuml)

```plantuml
@startuml SafeExchange_UseCase_Overview
!theme plain
skinparam actorStyle awesome
skinparam usecaseBorderColor #2563EB
skinparam usecaseBackgroundColor #EFF6FF
skinparam packageBorderColor #64748B
skinparam packageBackgroundColor #F8FAFC

title SafeExchange — Use Case Tổng quan

actor "Seller\n(Safe Owner)" as Seller #LightGreen
actor "Buyer" as Buyer #LightBlue
actor "Anyone\n(Public)" as Anyone #LightGray
actor "Gnosis Safe\n(Contract)" as Safe #Orange
actor "Blockchain" as Chain #Gold

rectangle "SafeExchange System" {

  package "Quản lý Tài khoản" {
    usecase "UC01\nKết nối ví" as UC01
    usecase "UC02\nXem Dashboard" as UC02
  }

  package "Luồng Bán" {
    usecase "UC03\nTạo Listing Safe" as UC03
    usecase "UC04\nKích hoạt Giao dịch\n(armTrade)" as UC04
    usecase "UC05\nChuyển quyền Safe" as UC05
  }

  package "Luồng Mua" {
    usecase "UC06\nTìm kiếm Safe" as UC06
    usecase "UC07\nTham gia Giao dịch" as UC07
    usecase "UC08\nNạp ETH vào Escrow\n(deposit)" as UC08
    usecase "UC09\nGiải ngân\n(releaseFunds)" as UC09
    usecase "UC10\nYêu cầu Hoàn tiền\n(buyerRequestCancel)" as UC10
  }

  package "Hủy & Hoàn tiền" {
    usecase "UC11\nHủy khi Hết hạn\n(cancelTimeout)" as UC11
    usecase "UC12\nRút ETH thủ công\n(withdrawRefund)" as UC12
  }

  package "Minh bạch & Bằng chứng" {
    usecase "UC13\nXem Lịch sử\nGiao dịch" as UC13
    usecase "UC14\nXuất PDF\nBằng chứng" as UC14
    usecase "UC15\nKiểm tra Wallet\nTransparency" as UC15
  }
}

Seller --> UC01
Seller --> UC02
Seller --> UC03
Seller --> UC04
Seller --> UC05
Seller --> UC13
Seller --> UC14

Buyer --> UC01
Buyer --> UC02
Buyer --> UC06
Buyer --> UC07
Buyer --> UC08
Buyer --> UC09
Buyer --> UC10
Buyer --> UC12
Buyer --> UC13
Buyer --> UC14
Buyer --> UC15

Anyone --> UC11
Anyone --> UC13

UC04 ..> UC03 : <<include>>
UC08 ..> UC07 : <<include>>
UC09 ..> UC08 : <<include>>
UC10 ..> UC08 : <<include>>

UC04 ..> Chain : <<calls>>
UC08 ..> Chain : <<calls>>
UC09 ..> Chain : <<calls>>
UC10 ..> Chain : <<calls>>
UC11 ..> Chain : <<calls>>
UC09 ..> Safe : <<verify isOwner>>
UC10 ..> Safe : <<verify nonce>>

@enduml
```

---

## 5. Sơ đồ Use Case Chi tiết

### 5.1 Luồng Bán (Seller)

```plantuml
@startuml SafeExchange_UC_Seller_Detail
!theme plain
skinparam actorStyle awesome
title UC03–UC05: Luồng Bán Safe (Seller)

actor "Seller" as S
actor "Blockchain" as BC
actor "Gnosis Safe" as GS

rectangle "Seller Flow" {
  usecase "UC03: Tạo Listing\n─────────────────\nInput: safeAddress,\nprice, deadline\nOutput: status=LISTED" as UC03

  usecase "UC04: armTrade()\n─────────────────\nPre: isOwner(seller)✓\nPre: không có active trade\nPre: deadline > now\nAction: snapshot nonce\nPost: status=ARMED" as UC04

  usecase "UC04a: isOwner check" as UC04a
  usecase "UC04b: Snapshot Nonce" as UC04b

  usecase "UC05: Chuyển quyền Safe\n─────────────────\nPre: status=FUNDED\nAction: addOwner(buyer)\nAction: removeOwner(seller)\nPost: Safe sẵn sàng verify" as UC05
}

S --> UC03
S --> UC04
S --> UC05

UC04 ..> UC04a : <<include>>
UC04 ..> UC04b : <<include>>
UC04a --> GS : isOwner(seller)?
UC04b --> GS : nonce()
UC04 --> BC : emit TradeArmed

note right of UC04
  Custom Errors:
  Invalid() — địa chỉ null/amount=0
  NotSeller() — không phải owner Safe
  DeadlinePassed() — deadline quá khứ
  InvalidState() — safe đã có trade
end note

@enduml
```

### 5.2 Luồng Mua (Buyer)

```plantuml
@startuml SafeExchange_UC_Buyer_Detail
!theme plain
skinparam actorStyle awesome
title UC07–UC12: Luồng Mua Safe (Buyer)

actor "Buyer" as B
actor "Blockchain" as BC
actor "Gnosis Safe" as GS

rectangle "Buyer Flow" {
  usecase "UC07: Tham gia Trade\n─────────────────\nPre: status=LISTED\nPre: caller ≠ seller\nPost: status=JOINED" as UC07

  usecase "UC08: deposit()\n─────────────────\nPre: status=ARMED\nPre: msg.sender==buyer\nPre: msg.value==amount\nPre: timestamp≤deadline\nPost: status=FUNDED\nPost: ETH locked" as UC08

  usecase "UC09: releaseFunds()\n─────────────────\nPre: status=FUNDED\nPre: caller∈{buyer,seller}\nAction: verify on-chain\nPost: ETH→Seller\nPost: status=COMPLETED" as UC09

  usecase "UC09a: Verify Ownership" as UC09a

  usecase "UC10: buyerRequestCancel()\n─────────────────\nPre: status=FUNDED\nPre: caller==buyer\nPre: nonce>snapshotNonce\nPre: buyer chưa là owner\nPost: ETH→Buyer\nPost: status=CANCELLED" as UC10

  usecase "UC10a: Verify Nonce" as UC10a

  usecase "UC12: withdrawRefund()\n─────────────────\nPre: status=CANCELLED\nPre: fundsHeld=true\nPost: ETH→Buyer" as UC12
}

B --> UC07
B --> UC08
B --> UC09
B --> UC10
B --> UC12

UC09 ..> UC09a : <<include>>
UC09a --> GS : isOwner(buyer)? ✓\n!isOwner(seller)? ✓
UC09 --> BC : emit TradeCompleted

UC10 ..> UC10a : <<include>>
UC10a --> GS : nonce > snapshotNonce?
UC10 --> BC : emit TradeCancelled

note right of UC09
  Happy Path:
  Seller đã addOwner(buyer)
  và removeOwner(seller) trên Safe
end note

note right of UC10
  Suspicious Activity:
  Nonce tăng = Safe có TX lạ
  trong khi buyer chưa nhận ownership
end note

@enduml
```

---

## 6. Đặc tả Use Case

### UC01 — Kết nối Ví

| Thuộc tính | Nội dung |
|-----------|---------|
| **ID** | UC01 |
| **Tên** | Kết nối ví (MetaMask / WalletConnect) |
| **Actor** | Seller, Buyer |
| **Mô tả** | Người dùng kết nối ví Web3 để xác thực danh tính bằng địa chỉ Ethereum. Đây là bước bắt buộc trước mọi thao tác giao dịch. |
| **Tiền điều kiện** | Trình duyệt có cài MetaMask hoặc WalletConnect-compatible wallet |
| **Luồng chính** | 1. User click "Connect Wallet" trên Header<br>2. Modal hiện danh sách ví<br>3. User chọn ví, approve trong extension<br>4. Wagmi nhận `address` và `chainId`<br>5. UI cập nhật trạng thái kết nối<br>6. Header hiển thị địa chỉ rút gọn |
| **Luồng thay thế** | 3a. User từ chối → modal đóng, không có tác động<br>4a. Sai network → UI hiển thị cảnh báo "Sai mạng" |
| **Hậu điều kiện** | `address` và `isConnected=true` có sẵn trong Wagmi context |
| **MoSCoW** | **Must Have** |
| **Ghi chú bảo mật** | Không lưu private key. Chỉ dùng địa chỉ public để định danh. |

---

### UC02 — Xem Dashboard

| Thuộc tính | Nội dung |
|-----------|---------|
| **ID** | UC02 |
| **Tên** | Xem Dashboard |
| **Actor** | Seller, Buyer |
| **Mô tả** | Hiển thị tổng quan tất cả trade liên quan đến ví đang kết nối: đang active, đã hoàn thành, đã hủy. |
| **Tiền điều kiện** | UC01 đã hoàn thành (ví đã kết nối) |
| **Luồng chính** | 1. User điều hướng đến `/dashboard`<br>2. Frontend gọi `GET /api/trades`<br>3. Lọc trades có `sellerAddress` hoặc `buyerAddress` khớp với ví<br>4. Hiển thị danh sách với `TradeStatusBadge`<br>5. WebSocket listener cập nhật real-time khi có thay đổi |
| **Luồng thay thế** | 2a. API lỗi → hiển thị thông báo lỗi, retry button |
| **Hậu điều kiện** | Danh sách trade được render với trạng thái mới nhất |
| **MoSCoW** | **Should Have** |

---

### UC03 — Tạo Listing Safe

| Thuộc tính | Nội dung |
|-----------|---------|
| **ID** | UC03 |
| **Tên** | Tạo Listing Safe (Seller tạo đơn bán) |
| **Actor** | Seller |
| **Mô tả** | Seller điền thông tin Safe muốn bán, đặt giá ETH và deadline, tạo trade record trong DB với status DRAFT → LISTED. |
| **Tiền điều kiện** | UC01 hoàn thành. Seller là owner của Safe address nhập vào. |
| **Luồng chính** | 1. Seller truy cập `/transfer/sell`<br>2. Nhập `safeAddress`, `priceEth`, `deadline`<br>3. Frontend validate form (Zod schema)<br>4. Gọi `POST /api/trades`<br>5. API kiểm tra không có active trade cho Safe này<br>6. API tạo trade record `status=LISTED`<br>7. API emit WebSocket `broadcastNewTrade`<br>8. UI hiển thị tradeId và bước tiếp theo |
| **Luồng thay thế** | 5a. Safe đã có active trade → API trả 400 "Safe này đang có trade đang hoạt động"<br>3a. Form không hợp lệ → Zod errors hiển thị inline |
| **Hậu điều kiện** | Trade record tồn tại trong DB với `status=LISTED`, `sellerAddress` = ví Seller |
| **MoSCoW** | **Must Have** |
| **Ghi chú bảo mật** | API không verify on-chain tại bước này. On-chain verify xảy ra ở UC04. |

---

### UC04 — Kích hoạt Giao dịch (armTrade)

| Thuộc tính | Nội dung |
|-----------|---------|
| **ID** | UC04 |
| **Tên** | Kích hoạt Giao dịch on-chain (armTrade) |
| **Actor** | Seller |
| **Mô tả** | Seller gọi `armTrade()` trên smart contract, snapshot nonce của Safe tại thời điểm này làm baseline phát hiện bất thường sau này. Smart contract verify Seller thực sự là owner Safe on-chain. |
| **Tiền điều kiện** | Trade status = `JOINED` (có buyer). Seller đang kết nối ví. |
| **Luồng chính** | 1. Seller click "Kích hoạt" trên Sell page<br>2. Frontend gọi `armTrade(safeAddress, buyerAddress, amount, deadline)` via Wagmi `writeContractAsync`<br>3. Smart contract thực thi:<br>&nbsp;&nbsp;3a. Validate không null, amount > 0<br>&nbsp;&nbsp;3b. `_isOwner(safe, msg.sender)` → verify on-chain<br>&nbsp;&nbsp;3c. `deadline > block.timestamp`<br>&nbsp;&nbsp;3d. `activeTradeBySafe[safe] == 0x0`<br>&nbsp;&nbsp;3e. Snapshot `_safeNonce(safe)`<br>&nbsp;&nbsp;3f. Lưu Trade struct, set `status=ARMED`<br>&nbsp;&nbsp;3g. Emit `TradeArmed(tradeId, buyer, seller, safe, amount, deadline, nonce)`<br>4. Frontend lắng nghe event, lấy `tradeId`<br>5. Gọi `POST /api/trades/:id/arm` với `onchainTradeId`, `snapshotNonce`<br>6. DB cập nhật `status=ARMED` |
| **Luồng thay thế** | 3b. `NotSeller()` → revert, UI thông báo "Bạn không phải owner Safe này"<br>3c. `DeadlinePassed()` → revert<br>3d. `InvalidState()` → revert, Safe đã có active trade |
| **Hậu điều kiện** | On-chain: `trades[tradeId].status = ARMED`, nonce được snapshot. Off-chain: DB `status=ARMED`, `onchainTradeId` được lưu. |
| **MoSCoW** | **Must Have** |
| **Ghi chú bảo mật** | STRIDE — Spoofing: `isOwner()` on-chain ngăn giả mạo Seller. Tampering: `activeTradeBySafe` lock ngăn double-arm. |

---

### UC05 — Chuyển Quyền Safe cho Buyer

| Thuộc tính | Nội dung |
|-----------|---------|
| **ID** | UC05 |
| **Tên** | Chuyển quyền sở hữu Safe cho Buyer |
| **Actor** | Seller (thực hiện trực tiếp trên Gnosis Safe) |
| **Mô tả** | Sau khi Buyer deposit ETH (UC08), Seller thực hiện thao tác trên Gnosis Safe để `addOwner(buyer)` và `removeOwner(seller)`. Đây là bước off-chain Safe, không qua SafeExchange contract nhưng là điều kiện tiên quyết để UC09 thành công. |
| **Tiền điều kiện** | Trade status = `FUNDED`. Buyer đã lock ETH. |
| **Luồng chính** | 1. Seller truy cập app.safe.global<br>2. Thực hiện Safe transaction: `addOwner(buyerAddress)`<br>3. Sau khi confirm: `removeOwner(sellerAddress)`<br>4. Safe nonce tăng lên (bình thường)<br>5. Seller thông báo Buyer đã có thể gọi `releaseFunds()` |
| **Luồng thay thế** | 4a. Nếu Seller thực hiện TX khác (không phải transfer ownership) → nonce tăng + buyer chưa là owner → Buyer có thể gọi UC10 |
| **Hậu điều kiện** | On Safe: `isOwner(buyer)=true`, `isOwner(seller)=false`. |
| **MoSCoW** | **Must Have** |
| **Ghi chú bảo mật** | Đây là điểm then chốt của toàn bộ hệ thống. Smart contract verify trạng thái này on-chain tại UC09. |

---

### UC06 — Tìm kiếm & Xem Danh sách Safe

| Thuộc tính | Nội dung |
|-----------|---------|
| **ID** | UC06 |
| **Tên** | Tìm kiếm và xem danh sách Safe đang bán |
| **Actor** | Buyer, Anyone |
| **Mô tả** | Người dùng tìm kiếm trade bằng trade ID hoặc địa chỉ Safe, xem thông tin chi tiết trước khi quyết định mua. |
| **Tiền điều kiện** | Không cần đăng nhập để xem (chỉ cần kết nối ví để thực hiện hành động) |
| **Luồng chính** | 1. User nhập từ khóa vào ô tìm kiếm trên Buy page<br>2. Gọi `GET /api/trades/search?q=<query>`<br>3. API tìm theo `id` trước, sau đó `safeAddress` nếu bắt đầu bằng `0x`<br>4. Hiển thị thông tin: giá, deadline, seller address, trạng thái<br>5. User xem Wallet Transparency (UC15) để kiểm tra lịch sử Safe |
| **Luồng thay thế** | 3a. Không tìm thấy → 404 "Không tìm thấy trade" |
| **Hậu điều kiện** | User có đủ thông tin để quyết định tham gia (UC07) |
| **MoSCoW** | **Must Have** |

---

### UC07 — Tham gia Giao dịch

| Thuộc tính | Nội dung |
|-----------|---------|
| **ID** | UC07 |
| **Tên** | Tham gia Giao dịch (Buyer join) |
| **Actor** | Buyer |
| **Mô tả** | Buyer xác nhận muốn mua Safe, đăng ký địa chỉ ví vào trade. Bước này là off-chain, cần thiết để Seller biết gọi `armTrade()` với buyer address nào. |
| **Tiền điều kiện** | UC01 hoàn thành. Trade `status=LISTED`. `buyer ≠ seller`. |
| **Luồng chính** | 1. Buyer click "Tham gia giao dịch" trên Buy page<br>2. Gọi `POST /api/trades/:id/join` với `buyerAddress`<br>3. API kiểm tra `status == LISTED`<br>4. API kiểm tra `buyer ≠ seller`<br>5. Cập nhật `status=JOINED`, lưu `buyerAddress`<br>6. Emit WebSocket notification cho Seller<br>7. Buyer chờ Seller gọi UC04 |
| **Luồng thay thế** | 3a. `status ≠ LISTED` → 400 "Trade không ở trạng thái có thể tham gia"<br>4a. Buyer là Seller → 400 "Seller không thể tự mua" |
| **Hậu điều kiện** | `trade.buyerAddress` = buyer wallet, `status=JOINED`. Seller nhận notification. |
| **MoSCoW** | **Must Have** |

---

### UC08 — Nạp ETH vào Escrow (deposit)

| Thuộc tính | Nội dung |
|-----------|---------|
| **ID** | UC08 |
| **Tên** | Nạp ETH vào Escrow — `deposit()` |
| **Actor** | Buyer |
| **Mô tả** | Buyer gửi đúng số ETH theo giá thỏa thuận vào smart contract escrow. ETH bị lock cho đến khi trade hoàn thành hoặc bị hủy. |
| **Tiền điều kiện** | Trade on-chain `status=ARMED`. `msg.sender == trade.buyer`. Ví Buyer có đủ ETH. |
| **Luồng chính** | 1. Buyer click "Gửi ký quỹ" trên Buy page<br>2. Hiển thị số ETH cần gửi để confirm<br>3. Wagmi gọi `deposit(tradeId)` với `{value: amount}`<br>4. Smart contract kiểm tra:<br>&nbsp;&nbsp;4a. `status == ARMED`<br>&nbsp;&nbsp;4b. `msg.sender == t.buyer`<br>&nbsp;&nbsp;4c. `msg.value == t.amount` (exact match)<br>&nbsp;&nbsp;4d. `block.timestamp <= t.deadline`<br>5. Set `status=FUNDED`, `fundsHeld=true`<br>6. Emit `TradeFunded(tradeId, buyer, amount)`<br>7. Frontend cập nhật API `POST /api/trades/:id/deposit` |
| **Luồng thay thế** | 4b. `NotBuyer()` → revert<br>4c. `Invalid()` → revert, sai số ETH<br>4d. `DeadlinePassed()` → revert |
| **Hậu điều kiện** | ETH bị lock trong contract. `trade.fundsHeld=true`. `status=FUNDED` cả on-chain và DB. |
| **MoSCoW** | **Must Have** |
| **Ghi chú bảo mật** | `nonReentrant` modifier ngăn reentrancy attack. Exact amount check ngăn underpay/overpay. |

---

### UC09 — Giải ngân (releaseFunds)

| Thuộc tính | Nội dung |
|-----------|---------|
| **ID** | UC09 |
| **Tên** | Giải ngân ETH cho Seller — `releaseFunds()` |
| **Actor** | Buyer hoặc Seller (ai cũng có thể trigger) |
| **Mô tả** | Sau khi Seller đã chuyển quyền Safe (UC05), bất kỳ bên nào gọi `releaseFunds()`. Smart contract tự verify on-chain: `isOwner(buyer)=true` VÀ `isOwner(seller)=false` → giải ngân ETH cho Seller. Không cần tin tưởng bất kỳ ai. |
| **Tiền điều kiện** | Trade on-chain `status=FUNDED`. `fundsHeld=true`. `isOwner(buyer)=true`. `isOwner(seller)=false`. |
| **Luồng chính** | 1. Buyer (hoặc Seller) click "Xác nhận hoàn tất"<br>2. Wagmi gọi `releaseFunds(tradeId)`<br>3. Smart contract kiểm tra:<br>&nbsp;&nbsp;3a. `status == FUNDED`<br>&nbsp;&nbsp;3b. `msg.sender ∈ {buyer, seller}`<br>&nbsp;&nbsp;3c. `fundsHeld == true`<br>4. Gọi `_isOwner(safe, buyer)` → `true`<br>5. Gọi `_isOwner(safe, seller)` → `false`<br>6. Set `status=COMPLETED`, `fundsHeld=false`<br>7. Xóa `activeTradeBySafe[safe]`<br>8. `seller.call{value: amount}("")` — transfer ETH<br>9. Emit `TradeCompleted`<br>10. API cập nhật `status=COMPLETED` |
| **Luồng thay thế** | 4a. `isOwner(buyer)=false` → `require()` revert "Buyer chua la owner cua Safe"<br>5a. `isOwner(seller)=true` → `require()` revert "Seller van con la owner cua Safe"<br>8a. Transfer thất bại → `revert TransferFailed()` |
| **Hậu điều kiện** | ETH đã về ví Seller. `status=COMPLETED`. `activeTradeBySafe[safe]=0x0`. |
| **MoSCoW** | **Must Have** |
| **Ghi chú bảo mật** | STRIDE — Elevation of Privilege: on-chain dual ownership check không thể bypass. Repudiation: `TradeCompleted` event trên blockchain là bằng chứng bất biến. |

---

### UC10 — Yêu cầu Hoàn tiền (buyerRequestCancel)

| Thuộc tính | Nội dung |
|-----------|---------|
| **ID** | UC10 |
| **Tên** | Yêu cầu Hoàn tiền khi phát hiện bất thường — `buyerRequestCancel()` |
| **Actor** | Buyer |
| **Mô tả** | Trong trạng thái FUNDED, nếu Buyer phát hiện Safe thực hiện giao dịch bất thường (nonce tăng so với snapshot) nhưng Buyer chưa được thêm làm owner, Buyer có thể yêu cầu hủy và hoàn tiền ngay lập tức. |
| **Tiền điều kiện** | Trade `status=FUNDED`. `msg.sender == buyer`. |
| **Luồng chính** | 1. Buyer click "Báo giao dịch bất thường" (hoặc hệ thống auto-detect)<br>2. Wagmi gọi `buyerRequestCancel(tradeId)`<br>3. Smart contract kiểm tra:<br>&nbsp;&nbsp;3a. `status == FUNDED`<br>&nbsp;&nbsp;3b. `msg.sender == t.buyer`<br>&nbsp;&nbsp;3c. Nếu `isOwner(buyer) && !isOwner(seller)` → `revert TradeAlreadyCompleted()` (trade thực ra đã xong)<br>&nbsp;&nbsp;3d. `_safeNonce(safe) > t.snapshotNonce` → có TX bất thường<br>4. Gọi `_cancel(id, "SUSPICIOUS_ACTIVITY")`<br>5. Transfer ETH về Buyer<br>6. Emit `TradeCancelled(reason="SUSPICIOUS_ACTIVITY")`<br>7. API cập nhật `status=CANCELLED` |
| **Luồng thay thế** | 3c. `TradeAlreadyCompleted()` → transfer ownership đã đúng, Buyer nên gọi UC09<br>3d. `NoSuspiciousActivity()` → nonce chưa thay đổi, chưa có bằng chứng bất thường |
| **Hậu điều kiện** | ETH về Buyer. `status=CANCELLED`. |
| **MoSCoW** | **Must Have** |
| **Ghi chú bảo mật** | Đây là cơ chế bảo vệ cốt lõi của SafeExchange. Nonce snapshot tại `armTrade` là baseline. Bất kỳ TX nào trên Safe sau đó đều có thể bị phát hiện. |

---

### UC11 — Hủy khi Hết hạn (cancelTimeout)

| Thuộc tính | Nội dung |
|-----------|---------|
| **ID** | UC11 |
| **Tên** | Hủy Giao dịch khi hết Deadline — `cancelTimeout()` |
| **Actor** | Anyone (bất kỳ ai — permissionless) |
| **Mô tả** | Sau khi deadline đã qua, bất kỳ địa chỉ nào cũng có thể gọi `cancelTimeout()` để hủy trade và trả ETH về Buyer (nếu đã deposit). Thiết kế permissionless đảm bảo không ai có thể "giữ con tin" ETH vĩnh viễn. |
| **Tiền điều kiện** | Trade `status ∈ {ARMED, FUNDED}`. `block.timestamp > deadline`. |
| **Luồng chính** | 1. Bot/user gọi `cancelTimeout(tradeId)`<br>2. Kiểm tra `status ∈ {ARMED, FUNDED}`<br>3. Kiểm tra `block.timestamp > t.deadline`<br>4. Gọi `_cancel(id, "TIMEOUT")`<br>5. Nếu `fundsHeld=true` → transfer ETH về Buyer<br>6. Emit `TradeCancelled(reason="TIMEOUT")`<br>7. Safe Watcher phát hiện event → API cập nhật `status=CANCELLED` |
| **Luồng thay thế** | 3a. `block.timestamp <= deadline` → `revert InvalidState()` |
| **Hậu điều kiện** | Trade hủy. ETH về Buyer nếu đã deposit. |
| **MoSCoW** | **Must Have** |
| **Ghi chú bảo mật** | Permissionless design ngăn Seller ghim ETH vô thời hạn. |

---

### UC12 — Rút ETH thủ công (withdrawRefund)

| Thuộc tính | Nội dung |
|-----------|---------|
| **ID** | UC12 |
| **Tên** | Rút ETH thủ công sau khi bị hủy — `withdrawRefund()` |
| **Actor** | Buyer |
| **Mô tả** | Pull-pattern fallback: nếu vì lý do nào đó ETH chưa được tự động hoàn (ví dụ `_cancel()` không kèm transfer), Buyer có thể chủ động rút ETH về. |
| **Tiền điều kiện** | Trade `status=CANCELLED`. `fundsHeld=true`. |
| **Luồng chính** | 1. Buyer gọi `withdrawRefund(tradeId)`<br>2. Kiểm tra `status == CANCELLED`<br>3. Kiểm tra `fundsHeld == true`<br>4. Set `fundsHeld=false`<br>5. Transfer ETH về Buyer |
| **Luồng thay thế** | 2a. `status ≠ CANCELLED` → `revert InvalidState()`<br>3a. `fundsHeld=false` → `revert InvalidState()` (đã rút rồi) |
| **Hậu điều kiện** | ETH về Buyer. `fundsHeld=false`. |
| **MoSCoW** | **Should Have** |
| **Ghi chú bảo mật** | Pull-pattern tránh reentrancy. `nonReentrant` modifier vẫn được áp dụng. |

---

### UC13 — Xem Lịch sử Giao dịch

| Thuộc tính | Nội dung |
|-----------|---------|
| **ID** | UC13 |
| **Tên** | Xem Lịch sử Giao dịch và System Logs |
| **Actor** | Seller, Buyer, Anyone |
| **Mô tả** | Hiển thị toàn bộ lịch sử trades, system logs và events liên quan. Hỗ trợ lọc theo địa chỉ ví, trạng thái, thời gian. |
| **Tiền điều kiện** | Không bắt buộc kết nối ví (dữ liệu public) |
| **Luồng chính** | 1. User điều hướng đến Dashboard<br>2. Gọi `GET /api/trades` (toàn bộ hoặc filter)<br>3. Gọi `GET /api/logs` để lấy system logs<br>4. Hiển thị timeline với `TradeStatusBadge`<br>5. Real-time update qua WebSocket |
| **Hậu điều kiện** | User xem được toàn bộ lịch sử |
| **MoSCoW** | **Should Have** |

---

### UC14 — Xuất PDF Bằng chứng

| Thuộc tính | Nội dung |
|-----------|---------|
| **ID** | UC14 |
| **Tên** | Xuất PDF Bằng chứng Giao dịch |
| **Actor** | Seller, Buyer |
| **Mô tả** | Tạo file PDF chứa toàn bộ thông tin trade, on-chain transaction hashes, evidence signatures để làm bằng chứng pháp lý hoặc lưu trữ cá nhân. |
| **Tiền điều kiện** | Trade tồn tại trong DB. UC01 hoàn thành. |
| **Luồng chính** | 1. User click "Xuất PDF"<br>2. Frontend gọi `lib/export-pdf.ts`<br>3. Tổng hợp: trade info, `onchainTradeId`, `snapshotNonce`, `evidence` records, `systemLogs`<br>4. Render PDF qua thư viện client-side<br>5. Trigger download |
| **Hậu điều kiện** | File PDF được lưu về máy |
| **MoSCoW** | **Could Have** |

---

### UC15 — Kiểm tra Wallet Transparency

| Thuộc tính | Nội dung |
|-----------|---------|
| **ID** | UC15 |
| **Tên** | Kiểm tra Wallet Transparency — Lịch sử Safe |
| **Actor** | Buyer, Anyone |
| **Mô tả** | Buyer xem toàn bộ lịch sử giao dịch của Safe address (qua Etherscan hoặc Safe Transaction Service API) trước khi quyết định mua, để đánh giá rủi ro. |
| **Tiền điều kiện** | Có địa chỉ Safe cần kiểm tra |
| **Luồng chính** | 1. Buyer điều hướng đến trang Wallet Transparency<br>2. Nhập hoặc tự động load `safeAddress`<br>3. Fetch lịch sử từ Safe Transaction Service hoặc on-chain<br>4. Hiển thị: số lượng TX, owners hiện tại, balance, modules<br>5. Buyer đánh giá trước khi join (UC07) |
| **Hậu điều kiện** | Buyer có thông tin đầy đủ để ra quyết định |
| **MoSCoW** | **Could Have** |
| **Ghi chú bảo mật** | Giúp Buyer phát hiện Safe có lịch sử đáng ngờ trước khi commit ETH. |

---

## 7. Sơ đồ Trạng thái Trade

```mermaid
stateDiagram-v2
    [*] --> DRAFT : Seller tạo listing\nPOST /api/trades

    DRAFT --> LISTED : Published\n(auto hoặc confirm)

    LISTED --> JOINED : Buyer join\nPOST /api/trades/:id/join

    JOINED --> ARMED : Seller gọi armTrade()\non-chain ✓\nPOST /api/trades/:id/arm

    ARMED --> FUNDED : Buyer gọi deposit()\non-chain ✓\nPOST /api/trades/:id/deposit

    ARMED --> CANCELLED : cancelTimeout()\ndeadline hết

    FUNDED --> COMPLETED : releaseFunds()\nisOwner(buyer)✓\n!isOwner(seller)✓

    FUNDED --> CANCELLED : buyerRequestCancel()\nnonce > snapshot\nBuyer chưa là owner

    FUNDED --> CANCELLED : cancelTimeout()\ndeadline hết

    CANCELLED --> CANCELLED : withdrawRefund()\nBuyer rút ETH\n(pull pattern)

    COMPLETED --> [*]
    CANCELLED --> [*]

    note right of ARMED
        snapshotNonce được lưu tại đây
        làm baseline phát hiện TX bất thường
    end note

    note right of FUNDED
        ETH locked trong contract
        fundsHeld = true
    end note
```

---

## 8. Sequence Diagrams

### 8.1 Happy Path — Giao dịch thành công

```mermaid
sequenceDiagram
    actor Seller
    actor Buyer
    participant UI as Frontend (React/Wagmi)
    participant API as Express API
    participant DB as PostgreSQL
    participant ESC as SafeExchangeEscrow
    participant SAFE as Gnosis Safe

    Seller->>UI: Tạo listing (safe, price, deadline)
    UI->>API: POST /api/trades
    API->>DB: INSERT trade status=LISTED
    API-->>UI: {tradeId}

    Buyer->>UI: Tìm & tham gia trade
    UI->>API: POST /api/trades/:id/join {buyerAddress}
    API->>DB: UPDATE status=JOINED
    API-->>UI: WebSocket notify Seller

    Seller->>UI: Kích hoạt giao dịch
    UI->>SAFE: isOwner(seller)? ✓ [read]
    UI->>ESC: armTrade(safe, buyer, amount, deadline)
    ESC->>SAFE: _safeNonce(safe) → snapshot
    ESC-->>UI: emit TradeArmed(tradeId, snapshotNonce)
    UI->>API: POST /api/trades/:id/arm {onchainTradeId, snapshotNonce}
    API->>DB: UPDATE status=ARMED

    Buyer->>UI: Gửi ký quỹ
    UI->>ESC: deposit(tradeId) {value: amount}
    ESC->>ESC: nonReentrant lock
    ESC-->>UI: emit TradeFunded
    UI->>API: POST /api/trades/:id/deposit
    API->>DB: UPDATE status=FUNDED

    Seller->>SAFE: addOwner(buyer) + removeOwner(seller)

    Buyer->>UI: Xác nhận hoàn tất
    UI->>ESC: releaseFunds(tradeId)
    ESC->>SAFE: isOwner(buyer)? ✓
    ESC->>SAFE: isOwner(seller)? ✗
    ESC->>Seller: transfer ETH ✓
    ESC-->>UI: emit TradeCompleted
    UI->>API: PATCH status=COMPLETED
    API->>DB: UPDATE status=COMPLETED
```

### 8.2 Cancel Path — Phát hiện bất thường (buyerRequestCancel)

```mermaid
sequenceDiagram
    actor Buyer
    participant UI as Frontend
    participant ESC as SafeExchangeEscrow
    participant SAFE as Gnosis Safe
    participant API as Express API

    Note over Seller,SAFE: Seller thực hiện TX lạ trên Safe (nonce tăng)\nnhưng chưa addOwner(buyer)

    Buyer->>UI: Phát hiện Safe có TX bất thường
    UI->>ESC: buyerRequestCancel(tradeId)
    ESC->>SAFE: isOwner(buyer)? ✗ (chưa là owner)
    ESC->>SAFE: nonce() > snapshotNonce? ✓ (TX lạ xảy ra)
    ESC->>ESC: _cancel("SUSPICIOUS_ACTIVITY")
    ESC->>Buyer: transfer ETH refund ✓
    ESC-->>UI: emit TradeCancelled(reason=SUSPICIOUS_ACTIVITY)
    UI->>API: PATCH status=CANCELLED
```

### 8.3 Cancel Path — Timeout (cancelTimeout)

```mermaid
sequenceDiagram
    actor Anyone
    participant ESC as SafeExchangeEscrow
    participant API as Express API
    participant SW as Safe Watcher

    Note over Anyone,SW: block.timestamp > deadline

    Anyone->>ESC: cancelTimeout(tradeId)
    ESC->>ESC: block.timestamp > t.deadline? ✓
    ESC->>ESC: _cancel("TIMEOUT")
    ESC->>Buyer: transfer ETH (if fundsHeld)
    ESC-->>SW: emit TradeCancelled(reason=TIMEOUT)
    SW->>API: PATCH status=CANCELLED
```

---

## 9. Database ERD

```mermaid
erDiagram
    users {
        varchar id PK "gen_random_uuid()"
        text walletAddress UK "NOT NULL"
        timestamp createdAt "defaultNow()"
    }

    trades {
        varchar id PK "gen_random_uuid()"
        text safeAddress "NOT NULL"
        text sellerAddress "NOT NULL"
        text buyerAddress "nullable"
        decimal priceEth "precision=18, scale=8"
        timestamp deadline "NOT NULL"
        text onchainTradeId "bytes32 hex — set after armTrade()"
        text snapshotNonce "Safe.nonce() at armTrade time"
        trade_status status "DRAFT|LISTED|JOINED|ARMED|FUNDED|COMPLETED|CANCELLED"
        timestamp createdAt
        timestamp updatedAt
    }

    evidence {
        varchar id PK
        varchar tradeId FK
        text hash "NOT NULL — content hash"
        text signerAddress "NOT NULL"
        text onchainTxHash "nullable"
        text payload "JSON string"
        timestamp createdAt
    }

    systemLogs {
        varchar id PK
        log_type type "TRADE_EVENT|SECURITY|SYSTEM"
        text message "NOT NULL"
        varchar relatedTradeId FK "nullable"
        text metadata "JSON string"
        timestamp createdAt
    }

    trades ||--o{ evidence : "has many"
    trades ||--o{ systemLogs : "generates"
```

---

## 10. Smart Contract — Class Diagram

```mermaid
classDiagram
    class ISafe {
        <<interface>>
        +isOwner(address owner) bool
        +nonce() uint256
    }

    class SafeExchangeEscrow {
        <<contract>>
        -bool _locked
        +mapping~bytes32 Trade~ trades
        +mapping~address bytes32~ activeTradeBySafe
        +mapping~address bytes32[]~ buyerTrades
        +mapping~address bytes32[]~ sellerTrades

        +getTradeId(buyer, seller, safe) bytes32
        +armTrade(safe, buyer, amount, deadline) external
        +deposit(id) external payable
        +releaseFunds(id) external
        +buyerRequestCancel(id) external
        +cancelTimeout(id) external
        +withdrawRefund(id) external
        +receive() external payable

        -_isOwner(safe, account) bool
        -_safeNonce(safe) uint256
        -_cancel(tradeId, reason) internal
        -nonReentrant() modifier
    }

    class Trade {
        <<struct>>
        +address buyer
        +address seller
        +address safeAddress
        +uint256 amount
        +uint64 deadline
        +uint256 snapshotNonce
        +TradeStatus status
        +bool fundsHeld
    }

    class TradeStatus {
        <<enum>>
        NONE
        ARMED
        FUNDED
        COMPLETED
        CANCELLED
    }

    class Events {
        <<events>>
        TradeArmed(tradeId, buyer, seller, safe, amount, deadline, nonce)
        TradeFunded(tradeId, buyer, amount)
        TradeCancelled(tradeId, buyer, seller, reason)
        TradeCompleted(tradeId, buyer, seller, amount)
    }

    class CustomErrors {
        <<errors>>
        Invalid()
        NotSeller()
        NotBuyer()
        NotAuthorized()
        TransferFailed()
        InvalidState()
        DeadlinePassed()
        TradeAlreadyCompleted()
        NoSuspiciousActivity()
    }

    SafeExchangeEscrow --> ISafe : calls isOwner / nonce
    SafeExchangeEscrow *-- Trade : stores in mapping
    Trade --> TradeStatus : uses
    SafeExchangeEscrow ..> Events : emits
    SafeExchangeEscrow ..> CustomErrors : reverts
```

---

## 11. Kiến trúc Hệ thống

```mermaid
graph TB
    subgraph Client["Frontend (React + Wagmi + Viem)"]
        direction TB
        BUY[Buy Page\nUC06-UC12]
        SELL[Sell Page\nUC03-UC05]
        DASH[Dashboard\nUC02,UC13,UC14]
        WT[Wallet Transparency\nUC15]
        WP[WebSocket Provider\nreal-time updates]
    end

    subgraph Server["Backend (Express.js + TypeScript)"]
        direction TB
        API[REST API\n/api/trades/*]
        WS[WebSocket Server\neventBroadcaster]
        SW[Safe Watcher\npoll on-chain events]
    end

    subgraph DB["PostgreSQL (Drizzle ORM)"]
        T[(trades)]
        E[(evidence)]
        L[(systemLogs)]
        U[(users)]
    end

    subgraph Chain["Ethereum / Sepolia"]
        ESC[SafeExchangeEscrow\nescrow + verify]
        SAFE[Gnosis Safe\nisOwner / nonce]
    end

    BUY & SELL & DASH <-->|HTTP / React Query| API
    WP <-->|WebSocket ws://| WS
    API <-->|Drizzle ORM| DB
    WS --> DB
    SW -->|ethers.js listen events| Chain
    SW -->|notify| WS
    BUY & SELL <-->|wagmi writeContractAsync\nviem readContract| Chain
    ESC -.->|view calls| SAFE

    style Client fill:#EFF6FF,stroke:#2563EB
    style Server fill:#F0FDF4,stroke:#16A34A
    style DB fill:#FFF7ED,stroke:#EA580C
    style Chain fill:#FDF4FF,stroke:#9333EA
```

---

## 12. Frontend — Component Tree

```mermaid
graph TD
    APP[App.tsx\nRouter + Providers]

    APP --> WSP[WebSocketProvider\nuseWebSocket hook]
    APP --> LAYOUT[Layout]
    APP --> ROUTER{wouter Router}

    LAYOUT --> HEADER[Header]
    LAYOUT --> FOOTER[Footer]
    HEADER --> CWALLET[ConnectWallet\nWagmi useAccount]
    HEADER --> NOTIF[NotificationIndicator\nuseWebSocket]

    ROUTER --> HOME[Home Page]
    ROUTER --> DASH[Dashboard\nGET /api/trades]
    ROUTER --> BUY[Transfer/Buy\nUC06-UC12]
    ROUTER --> SELL[Transfer/Sell\nUC03-UC05]
    ROUTER --> EVIDENCE[Evidence Page]
    ROUTER --> WT[Wallet Transparency]
    ROUTER --> LEARN[Learn Page]
    ROUTER --> LEGAL[Legal Page]

    BUY --> STEPPER[Stepper\n5 bước buyer flow]
    BUY --> BADGE[TradeStatusBadge]
    BUY --> SEARCHFORM[Search Form\nzod validation]

    SELL --> STEPPER2[Stepper\n5 bước seller flow]
    SELL --> TRADECREATE[Create Trade Form]

    DASH --> PDFEXPORT[Export PDF\nlib/export-pdf.ts]
```

---

## 13. API Design

### 13.1 Endpoints

| Method | Path | Actor | Mô tả | UC |
|--------|------|-------|-------|-----|
| GET | `/api/trades` | Anyone | Lấy tất cả trades | UC13 |
| GET | `/api/trades/search?q=` | Anyone | Tìm theo id hoặc safeAddress | UC06 |
| GET | `/api/trades/:id` | Anyone | Chi tiết trade | UC06 |
| POST | `/api/trades` | Seller | Tạo trade mới | UC03 |
| POST | `/api/trades/:id/join` | Buyer | Buyer tham gia | UC07 |
| POST | `/api/trades/:id/arm` | Seller | Cập nhật sau armTrade() | UC04 |
| POST | `/api/trades/:id/deposit` | Buyer | Cập nhật sau deposit() | UC08 |
| POST | `/api/trades/:id/complete` | Buyer/Seller | Cập nhật sau releaseFunds() | UC09 |
| POST | `/api/trades/:id/cancel` | System | Cập nhật khi cancel | UC10,UC11 |
| POST | `/api/evidence` | Buyer/Seller | Lưu bằng chứng có chữ ký | UC14 |
| GET | `/api/logs` | Anyone | Lấy system logs | UC13 |

### 13.2 WebSocket Events

| Event | Direction | Payload | Trigger |
|-------|-----------|---------|---------|
| `new_trade` | Server→Client | `{trade}` | POST /api/trades |
| `trade_update` | Server→Client | `{tradeId, status, data}` | Bất kỳ status change |
| `notification` | Server→Client | `{title, message, type}` | Mọi sự kiện quan trọng |

---

## 14. Bảo mật — STRIDE Threat Model

```mermaid
graph LR
    subgraph S["S — Spoofing (Giả mạo)"]
        S1["Giả mạo seller\n→ armTrade với Safe người khác"]
        S2["Giả mạo buyer\n→ deposit thay buyer thật"]
    end

    subgraph T["T — Tampering (Giả mạo dữ liệu)"]
        T1["Thay đổi amount\nsau khi agree"]
        T2["Double-arm\ncùng một Safe"]
    end

    subgraph R["R — Repudiation (Chối bỏ)"]
        R1["Seller chối\nđã nhận ETH"]
        R2["Buyer chối\nđã deposit"]
    end

    subgraph I["I — Info Disclosure (Lộ thông tin)"]
        I1["snapshotNonce\nlộ thời điểm giao dịch"]
    end

    subgraph D["D — Denial of Service"]
        D1["Spam trades\ncùng Safe address"]
    end

    subgraph E["E — Elevation of Privilege"]
        E1["Buyer tự releaseFunds\nkhi chưa là owner"]
        E2["cancelTimeout\ntrước deadline"]
        E3["Seller giữ ETH\nvô thời hạn"]
    end

    S1 -->|"✅ Mitigated"| M_S1["isOwner(safe, msg.sender)\non-chain tại armTrade()"]
    S2 -->|"✅ Mitigated"| M_S2["msg.sender == t.buyer\ncheck tại deposit()"]
    T1 -->|"✅ Mitigated"| M_T1["amount locked trong struct\nsau armTrade()"]
    T2 -->|"✅ Mitigated"| M_T2["activeTradeBySafe[safe] != 0\nrevert InvalidState()"]
    R1 -->|"✅ Mitigated"| M_R1["emit TradeCompleted\non-chain — bất biến"]
    R2 -->|"✅ Mitigated"| M_R2["emit TradeFunded\non-chain — bất biến"]
    I1 -->|"⚠️ Low risk"| M_I1["nonce là dữ liệu public\ntrên blockchain anyway"]
    D1 -->|"✅ Mitigated"| M_D1["activeTradeBySafe lock\n1 trade / Safe tại một thời điểm"]
    E1 -->|"✅ Mitigated"| M_E1["require isOwner(buyer)\n&& !isOwner(seller)"]
    E2 -->|"✅ Mitigated"| M_E2["block.timestamp > deadline\ncheck on-chain"]
    E3 -->|"✅ Mitigated"| M_E3["cancelTimeout() permissionless\nbất kỳ ai có thể gọi"]
```

### 14.1 Checklist Bảo mật

| Hạng mục | Trạng thái | Ghi chú |
|---------|-----------|---------|
| Reentrancy Guard | ✅ | `nonReentrant` modifier trên deposit, releaseFunds, buyerRequestCancel, cancelTimeout, withdrawRefund |
| Integer Overflow | ✅ | Solidity 0.8.x built-in checked arithmetic |
| Access Control | ✅ | `msg.sender` checks trên mọi hàm public |
| On-chain Verification | ✅ | `isOwner()` và `nonce()` được gọi trực tiếp từ contract |
| Pull over Push | ✅ | `withdrawRefund()` dùng pull pattern |
| Event Logging | ✅ | Mọi state change đều emit event |
| Exact Amount Check | ✅ | `msg.value != t.amount` → revert |
| Deadline Enforcement | ✅ | `block.timestamp` check cả on-chain |
| No Selfdestruct | ✅ | Contract không có `selfdestruct` |
| OWASP A01 Broken Access | ✅ | Verify trên blockchain, không phụ thuộc DB |

---

> **Lưu ý cho AI Coding Agents:** Tài liệu này là Single Source of Truth. Trước khi thay đổi bất kỳ thành phần nào, kiểm tra cross-reference với UC specification tương ứng và đảm bảo state machine transitions ở Mục 7 vẫn nhất quán.
