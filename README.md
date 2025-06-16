# 多品牌 AI 虛擬助理系統

支援多個品牌的 AI 虛擬助理系統，使用 NexAvatar 技術實現虛擬人物動畫。

## 支援品牌

### 創造智能科技股份有限公司 (`creative_tech`)
- MarTech 行銷科技解決方案
- 專業商務型、創新活力型、溫暖服務型三種風格
- 訪問：本地:`http://localhost(or IP)/web/` 或 `https://poc.5gao.ai/web/`

### 益生菌品牌 - 小益 (`probiotics`)
- 腸道健康與免疫力調節的虛擬銷售助理
- 自然中性、健康導向語氣
- 針對學生、上班族、銀髮族提供個人化建議
- 訪問：本地:`http://localhost(or IP)/probiotics/` 或 `https://poc.5gao.ai/probiotics/`

## 快速開始

```bash
# 1. 設定環境變數
cp .env.example .env
nano .env  # 設定 GOOGLE_API_KEY & admin 序號

# 2. 啟動服務
docker compose up -d

# 3. 訪問應用
# 創造智能科技：http://localhost/web/
# 小益益生菌：http://localhost/web/?brand=probiotics
```

## 對話模式

### NexAvatar (TTS+動畫) + LLM
- 使用 NexAvatar 內建語音系統
- 虛擬人物動畫 + NexAvatar TTS

### NexAvatar (動畫) + TTS + LLM
- 使用 Edge TTS 語音系統
- 虛擬人物動畫 + Edge TTS

## API 端點

### 基本功能
- `POST /api/chat` - 對話 (支援 `brand` 參數)
- `POST /api/tts` - 語音合成
- `POST /api/chat-tts` - 對話 + 語音合成

### 多品牌功能
- `GET /api/brands` - 獲取所有品牌列表
- `GET /api/brands/{brand}` - 獲取品牌詳細資訊
- `GET /api/brands/{brand}/quick-questions` - 獲取預設問題卡片

### 使用範例
```bash
# 小益對話
curl -X POST "http://localhost/api/chat" \
  -H "Content-Type: application/json" \
  -d '{"message": "我想了解益生菌產品", "brand": "probiotics"}'

# 創造智能科技對話
curl -X POST "http://localhost/api/chat" \
  -H "Content-Type: application/json" \
  -d '{"message": "你們的AI虛擬人技術有什麼特色？", "brand": "creative_tech"}'
```

## 系統架構

```
Internet → Nginx (Port 80) → Docker Network
                ↓
    ┌─────────────────────────────────┐
    │         app-network             │
    │                                 │
    │  ┌─────────┐  ┌─────────────┐   │
    │  │   API   │  │     Web     │   │
    │  │ :8000   │  │   :3000     │   │
    │  └─────────┘  └─────────────┘   │
    └─────────────────────────────────┘
```

## 專案結構

```
MVP-1/
├── backend/                       # 後端服務
│   ├── api_server.py             # API 服務
│   ├── tts_service.py            # TTS 服務
│   ├── config.py                 # 配置
│   ├── prompts.py                # 向後相容包裝器
│   ├── prompts/                  # 多品牌提示詞系統
│   │   ├── __init__.py          # 套件入口
│   │   ├── manager.py           # 品牌管理器
│   │   ├── creative_tech.py     # 創造智能科技
│   │   └── probiotics.py        # 益生菌品牌
│   ├── test_multi_brand.py      # 多品牌測試腳本
│   └── requirements.txt         # 後端依賴
├── web/                          # 前端 Web 應用
│   ├── index.html               # 主頁面
│   ├── css/style.css           # 樣式
│   ├── js/
│   │   ├── nexavatar_v1.7.js   # NexAvatar 原始檔案
│   │   └── app.js              # 應用邏輯 (支援多品牌)
│   └── start_web.py            # Web 服務器
├── nginx/                       # Nginx 配置
│   └── nginx.conf              # Nginx 配置檔
├── docker-compose.yml          # Docker 配置
├── Dockerfile                  # Docker 映像
├── .env.example               # 環境變數範例
└── README.md                  # 說明文件
```

## 多品牌功能

### 新增品牌
1. 在 `backend/prompts/` 建立新品牌檔案
2. 在 `manager.py` 的 `BRANDS` 字典中註冊
3. 定義品牌的系統提示詞、產品資訊、預設問題

### 品牌設定範例
```python
# backend/prompts/your_brand.py
SYSTEM_PROMPT = """你是 XXX 品牌的 AI 助理..."""
PRODUCT_INFO = """產品資訊..."""
QUICK_QUESTIONS = ["問題1", "問題2", "問題3"]

def get_chat_prompt(user_input: str, style: str = "default") -> str:
    return CHAT_TEMPLATE.format(
        system_prompt=SYSTEM_PROMPT,
        product_info=PRODUCT_INFO,
        user_input=user_input
    )
```

## 管理指令

```bash
# 查看服務狀態
docker compose ps

# 查看日誌
docker compose logs -f

# 重啟服務
docker compose restart

# 停止服務
docker compose down
```

## 環境變數

```bash
# .env
GOOGLE_API_KEY=your_google_api_key_here
ADMIN_ACCESS_CODE=ai360
```

### 環境變數說明

- `GOOGLE_API_KEY`: Google Gemini API 金鑰
- `ADMIN_ACCESS_CODE`: 管理員介面存取序號（預設：ai360）

### 安全性建議

1. **生產環境**：請更改預設的管理員序號
2. **Git 安全**：`.env` 文件已加入 `.gitignore`，不會被提交
3. **部署時**：每個環境可設定不同的管理員序號

## 管理員介面

訪問 `http://localhost/admin` 使用管理員序號登入，可以：

- 管理存取序號（最多10筆）
- 查看使用記錄（最多50筆）
- 導出對話記錄（CSV格式）
- 重置/刪除序號

預設管理員序號：`ai360`（可透過環境變數修改）

## 注意事項

1. **API 金鑰**：需要設定有效的 GOOGLE_API_KEY
2. **瀏覽器相容性**：建議使用現代瀏覽器
3. **音訊權限**：需要用戶互動才能播放音訊
4. **品牌參數**：前端會自動從 URL 讀取品牌設定

## 健康檢查

```bash
# 檢查服務健康狀態
curl http://localhost/health

# 檢查 API 狀態
curl http://localhost/api/health

# 檢查品牌功能
curl http://localhost/api/brands
