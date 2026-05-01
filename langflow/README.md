# SafeExchange Chatbot — Langflow

Chatbot AI tích hợp trực tiếp vào SafeExchange, điều khiển bằng ngôn ngữ tự nhiên.

## Kiến trúc

```
Chat Widget (React) → POST /api/chat → Langflow Agent → Tools → SafeExchange API / Smart Contract
```

## Cài đặt

### 1. Chạy Langflow local

```bash
pip install langflow
langflow run --port 7860
```

### 2. Import flow

Vào Langflow UI (`http://localhost:7860`) → **Import** → chọn `flows/safeexchange-chatbot.json`

### 3. Cấu hình

Trong flow editor:
- **OpenAI GPT node**: nhập `OPENAI_API_KEY`
- Hoặc đổi sang Ollama/Anthropic nếu muốn dùng LLM khác

Tạo biến môi trường (hoặc trong Langflow Global Variables):
```
SAFEEXCHANGE_API_URL=http://localhost:5000
```

### 4. Lấy Flow ID

Sau khi deploy flow, copy **Flow ID** từ URL: `http://localhost:7860/flow/<FLOW_ID>`

### 5. Cập nhật `.env`

```env
LANGFLOW_API_URL=http://localhost:7860
LANGFLOW_FLOW_ID=<paste Flow ID ở đây>
```

---

## Tools trong Agent

| Tool | Mô tả |
|------|-------|
| `get_trade_status` | Tra cứu trade theo ID hoặc Safe address |
| `get_all_trades` | Liệt kê trades, lọc theo status |
| `check_nonce_status` | Kiểm tra drift nonce của Safe |
| `get_trade_logs` | Lịch sử sự kiện của trade |

---

## UI Actions (contract giữa Langflow và React UI)

Khi agent cần user thực hiện on-chain action, trả về JSON:

```json
{
  "message": "Bạn cần ký quỹ 0.5 ETH cho trade #42...",
  "ui_action": {
    "type": "sign_deposit",
    "params": {
      "tradeId": "42",
      "amount": "0.5",
      "contract": "0xabc..."
    }
  }
}
```

| `ui_action.type` | Hành động |
|-----------------|-----------|
| `sign_deposit` | Ký quỹ ETH (Buyer) |
| `sign_arm` | Kích hoạt trade (Seller) |
| `sign_release` | Giải ngân (Buyer) |
| `sign_cancel` | Hủy trade |
| `connect_wallet` | Kết nối MetaMask |
| `view_trade` | Xem chi tiết trade |

---

## Webhook Alert (nonce drift)

Safe Watcher gọi `POST /api/webhook/alert` khi phát hiện nonce thay đổi:

```json
{
  "tradeId": "42",
  "snapshot": 5,
  "current": 7,
  "type": "NONCE_DRIFT"
}
```

Server sẽ:
1. Log vào database (SECURITY event)
2. Push WebSocket notification tới buyer
3. Forward tới `LANGFLOW_ALERT_FLOW_ID` (nếu cấu hình)

---

## Files

```
langflow/
├── flows/
│   └── safeexchange-chatbot.json   ← Import vào Langflow
├── 01_usecase_tongquat.mmd         ← Use case diagram
├── 08_activity_langflow_pipeline.mmd ← Pipeline flow
├── 09_class_diagram.mmd            ← Class diagram
└── README.md                       ← File này
```
