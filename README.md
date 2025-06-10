# AI 虛擬助理 - NexAvatar 系統

這是一個完整的 AI 虛擬助理系統，支援兩種對話模式，使用 NexAvatar 技術實現虛擬人物動畫。

## 兩種對話模式

### 1. NexAvatar (TTS+動畫) + LLM
- 使用 NexAvatar 內建語音系統
- 虛擬人物動畫 + NexAvatar TTS
- 完整的 NexAvatar 功能

### 2. NexAvatar (動畫) + TTS + LLM
- 使用 Edge TTS 語音系統
- 虛擬人物動畫 + Edge TTS
- 同步播放動畫和語音

## Docker 部署

### 環境準備
```bash
# 1. 確保有 .env 檔案
cp .env.example .env
nano .env  # 設定 GOOGLE_API_KEY
```

### 啟動服務
```bash
# 構建並啟動所有容器
docker compose up --build -d

# 查看服務狀態
docker compose ps

# 查看日誌
docker compose logs -f
```

### 停止服務
```bash
# 停止所有容器
docker compose down

# 停止並清理
docker compose down -v
```

## 服務端點

- **主要應用**: http://localhost/web/
- **API 服務**: http://localhost/api/
- **健康檢查**: http://localhost/health

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

**三個容器:**
- **Nginx**: 反向代理 (nginx:alpine)
- **API**: 後端服務 (自建映像)
- **Web**: 前端服務 (自建映像)

## 專案結構

```
toyotapoc/
├── backend/                       # 後端服務
│   ├── api_server.py             # API 服務
│   ├── tts_service.py            # TTS 服務
│   ├── config.py                 # 配置
│   ├── prompts.py                # 提示詞
│   └── requirements.txt          # 後端依賴
├── web/                          # 前端 Web 應用
│   ├── index.html               # 主頁面
│   ├── css/style.css           # 樣式
│   ├── js/
│   │   ├── nexavatar_v1.7.js   # NexAvatar 原始檔案
│   │   └── app.js              # 應用邏輯
│   └── start_web.py            # Web 服務器
├── nginx/                       # Nginx 配置
│   ├── nginx.conf              # Nginx 配置檔
│   └── logs/                   # 日誌目錄
├── docs/                        # 文件目錄
│   └── README.md               # 技術文件
├── docker-compose.yml          # Docker 配置
├── Dockerfile                  # Docker 映像
├── .env.example               # 環境變數範例
└── README.md                  # 說明文件
```

## 技術特點

### Nginx 反向代理
- 統一入口點 (Port 80)
- 靜態文件優化和緩存
- 安全標頭和 Gzip 壓縮
- 負載均衡和健康檢查

### Docker 容器化
- 三容器架構
- 自動重啟和健康檢查
- 完整的日誌記錄
- 內部網路隔離

### NexAvatar 整合
- 完全按照 Toyota 原始方式
- 相同的事件監聽器和說話方式
- 支援動畫和語音同步

## 使用方法

1. **啟動服務**: `docker compose up -d`
2. **打開瀏覽器**: 訪問 http://localhost/web/
3. **選擇模式**: 點擊頂部的模式按鈕
4. **開始對話**: 輸入問題並發送

## 管理和監控

### 查看日誌
```bash
# 查看所有服務日誌
docker compose logs -f

# 查看特定服務日誌
docker compose logs -f nginx
docker compose logs -f api
docker compose logs -f web
```

### 服務管理
```bash
# 檢查服務狀態
docker compose ps

# 重啟特定服務
docker compose restart nginx
docker compose restart api
docker compose restart web

# 重啟所有服務
docker compose restart
```

### 健康檢查
```bash
# 檢查健康狀態
curl http://localhost/health

# 檢查 API 狀態
curl http://localhost/api/health
```

## 配置

### 環境變數 (.env)
```bash
GOOGLE_API_KEY=your_google_api_key_here
```

### 端口配置
- **Nginx**: 80 (HTTP), 443 (HTTPS)
- **API**: 內部 8000
- **Web**: 內部 3000

## 開發

### 修改代碼
```bash
# 修改後重新構建
docker compose up --build -d

# 或重啟特定服務
docker compose restart api
```

### 進入容器調試
```bash
# 進入 API 容器
docker compose exec api bash

# 進入 Web 容器
docker compose exec web bash

# 進入 Nginx 容器
docker compose exec nginx sh
```

## 注意事項

1. **API 金鑰**: 需要設定有效的 GOOGLE_API_KEY
2. **網路連接**: 需要穩定的網路連接來訪問 NexAvatar 服務
3. **瀏覽器兼容性**: 建議使用現代瀏覽器 (Chrome, Firefox, Safari)
4. **音訊權限**: 某些瀏覽器可能需要用戶互動才能播放音訊

## 快速測試

```bash
# 1. 設定環境
cp .env.example .env
nano .env  # 設定 GOOGLE_API_KEY

# 2. 啟動服務
docker compose up -d

# 3. 訪問應用
# http://localhost/web/

# 4. 測試對話
# 選擇模式，輸入 "你好"
```

---

## 支援

如有問題，請檢查：
1. Docker 服務狀態: `docker compose ps`
2. 服務日誌: `docker compose logs -f`
3. 瀏覽器 Console 日誌
4. 健康檢查: `curl http://localhost/health`
