# Sơ Đồ Deployment

Trả lời câu hỏi: **Hệ thống được triển khai ở đâu?**

```mermaid
graph TB
    subgraph USER["Người dùng"]
        BROWSER["Browser\n+ MetaMask Extension\n(Windows / Mac / Linux)"]
    end

    subgraph RAILWAY["Railway — Cloud Hosting"]
        subgraph NODEJS["Node.js Service (port 5000)"]
            EXPRESS["Express HTTP Server\n- REST API /api/*\n- Rate limiting\n- CORS whitelist"]
            STATIC["Static File Server\nReact build (production)\nVite dev server (development)"]
            WS_SERVER["WebSocket Server\n(ws library)\nroom per wallet address"]
            SAFE_WATCHER["Safe Watcher\n(background thread)\nviem WS + HTTP client"]
        end
        ENV["Environment Variables\nDATABASE_URL\nRPC_WS_URL · RPC_HTTP_URL\nVITE_ESCROW_CONTRACT_ADDRESS\nCHAIN_ID · ALLOWED_ORIGINS\nRAILWAY_PUBLIC_DOMAIN"]
    end

    subgraph NEON["Neon — Serverless PostgreSQL"]
        PG[("PostgreSQL\nwebsafeexchange DB\n(auto-scale, TLS)")]
    end

    subgraph RPC_PROVIDER["RPC Provider\n(Infura / Alchemy / khác)"]
        WS_RPC["WebSocket Endpoint\nwss://sepolia..."]
        HTTP_RPC["HTTP Endpoint\nhttps://sepolia..."]
    end

    subgraph SEPOLIA["Ethereum Sepolia (Testnet)"]
        ESCROW_CONTRACT["Escrow Contract\n0x... (deployed)"]
        GNOSIS_SAFE["Gnosis Safe\n(1 per trade)\nMultisig wallet"]
    end

    %% User ↔ Railway
    BROWSER -->|"HTTPS GET/POST/PATCH/DELETE\napi.domain.com"| EXPRESS
    BROWSER <-->|"WebSocket wss://\npush notifications"| WS_SERVER
    BROWSER -->|"Serve React App\nHTTPS"| STATIC

    %% Railway internal
    EXPRESS --- WS_SERVER
    EXPRESS --- SAFE_WATCHER
    EXPRESS --- STATIC
    EXPRESS <-->|"Drizzle ORM\nTCP + TLS"| PG

    %% Safe Watcher ↔ RPC
    SAFE_WATCHER <-->|"eth_subscribe\nexecutionSuccess / escrow events"| WS_RPC
    SAFE_WATCHER <-->|"eth_call\nisOwner, nonce"| HTTP_RPC

    %% RPC ↔ Blockchain
    WS_RPC <-->|"Ethereum P2P"| SEPOLIA
    HTTP_RPC <-->|"Ethereum P2P"| SEPOLIA

    %% User ↔ Blockchain (MetaMask)
    BROWSER -->|"MetaMask JSON-RPC\narmTrade / depositFunds\nexecTransaction"| SEPOLIA
```

## Cấu hình môi trường

| Biến | Dùng cho |
|------|---------|
| `DATABASE_URL` | Kết nối Neon PostgreSQL |
| `RPC_WS_URL` | Safe Watcher subscribe events (wss://) |
| `RPC_HTTP_URL` | Safe Watcher readContract (https://) |
| `VITE_ESCROW_CONTRACT_ADDRESS` | Địa chỉ Escrow Contract trên Sepolia |
| `CHAIN_ID` | Chain ID (11155111 = Sepolia, 1 = Mainnet) |
| `ALLOWED_ORIGINS` | Danh sách origin được phép CORS |
| `RAILWAY_PUBLIC_DOMAIN` | Railway tự inject, dùng cho CORS default |

## Ghi chú triển khai

- Frontend và Backend **cùng một service** trên Railway — Express serve React build trong production
- Neon **auto-scale** serverless PostgreSQL — không cần quản lý instance
- Safe Watcher tự **recover** khi restart: đọc lại trades ARMED/FUNDED từ DB và re-subscribe
- Railway tự cấp **HTTPS/WSS** certificate — không cần cấu hình thêm
