# Sequence Diagram — Phân hệ Quản lý Safe

> Tương ứng với **Use Case Phân rã 4: Phân hệ Quản lý Safe**

Mô tả luồng người dùng kết nối ví, tra cứu thông tin Safe thông qua backend proxy, và xem các trạng thái on-chain.

---

```mermaid
sequenceDiagram
    actor User as User (Chủ Safe)
    participant Client as Client (React)
    participant BE as Backend (Express)
    participant SAFE_API as Safe Global API
    participant Wallet as MetaMask / Wagmi

    rect rgb(210, 235, 255)
        Note over User,Wallet: Luồng 1 — Kết nối ví Web3

        User->>Client: Nhấn "Connect Wallet"
        Client->>+Wallet: eth_requestAccounts
        Wallet-->>-Client: walletAddress
        Client-->>User: Hiển thị địa chỉ ví đã kết nối
    end

    rect rgb(210, 255, 215)
        Note over User,Wallet: Luồng 2 — Xem thông tin ví Safe

        User->>Client: Nhập safeAddress + chọn chain (Mainnet / Sepolia)
        Client->>+BE: GET /api/safe-info\n?address={safeAddress}&chainId={chainId}
        BE->>BE: validateEthAddress(address)
        BE->>BE: Chọn baseUrl theo chainId\n(mainnet / sepolia transaction service)
        BE->>+SAFE_API: GET /api/v1/safes/{safeAddress}/\n(safe-transaction-{network}.safe.global)

        alt Safe API trả về OK
            SAFE_API-->>-BE: { address, owners[], threshold, nonce, balance, version }
            BE-->>-Client: 200 Safe info
            Client-->>User: Hiển thị thông tin Safe\n(owners, threshold, nonce, balance)
        else Safe API lỗi / timeout
            SAFE_API-->>BE: 5xx / network timeout
            BE-->>Client: 500 { error }
            Client-->>User: Hiển thị testnet demo data\n(fallback snapshot)
        end
    end

    rect rgb(255, 245, 200)
        Note over User,Wallet: Luồng 3 — Xem danh sách chủ sở hữu

        User->>Client: Chuyển tab "Owners"
        Note right of Client: Dữ liệu lấy từ Safe info\nđã tải ở Luồng 2 — không request thêm
        Client-->>User: Hiển thị owners[] và threshold\n(N-of-M multisig)
    end

    rect rgb(255, 225, 195)
        Note over User,Wallet: Luồng 4 — Xem giao dịch chờ xác nhận

        User->>Client: Nhấn "Pending Transactions"
        Client->>+BE: GET /api/safe-info\n?address={safeAddress}&chainId={chainId}
        BE->>+SAFE_API: GET /api/v1/safes/{safeAddress}/\nmultisig-transactions/?executed=false
        SAFE_API-->>-BE: pendingTxs[]
        BE-->>-Client: 200 pending transactions
        Client-->>User: Hiển thị danh sách tx chờ chữ ký\n(nonce, to, value, confirmations)
    end

    rect rgb(230, 220, 255)
        Note over User,Wallet: Luồng 5 — Chuẩn bị cấu hình Safe

        User->>Client: Nhập owners mới / threshold mới
        Client->>Client: Validate cấu hình\n(threshold ≤ owners.length, địa chỉ hợp lệ)
        Client-->>User: Hiển thị preview cấu hình

        Note right of Client: Chỉ validate client-side\nKhông ký tx, không gọi API\nKhông deploy on-chain
    end

    rect rgb(215, 255, 240)
        Note over User,Wallet: Luồng 6 — Xem ảnh chụp trạng thái Safe

        User->>Client: Xem "Safe Snapshot"
        Note right of Client: Snapshot được tạo khi đăng bài SELL\ntrên Forum — lưu trong DB\n(owners, threshold, nonce tại thời điểm đăng)
        Client-->>User: Hiển thị trạng thái Safe\ntại thời điểm chụp (verifiedAt)
    end
```
