# AI 虛擬助理 - 三種模式 Web 應用

這是一個獨立的 Web 應用，支援三種對話模式，完全按照 Toyota 原始方式實現 NexAvatar 整合。

## 🎯 三種模式

### 1. 🎭 他的語音 (NexAvatar)
- 使用 NexAvatar 原始語音系統
- 虛擬人物動畫 + NexAvatar TTS
- 完全按照 Toyota 官方方式

### 2. 🔊 我的語音 (Edge TTS)
- 使用我們的 Edge TTS 語音
- 虛擬人物動畫 + 我們的 TTS
- 同步播放動畫和語音

### 3. 💬 純文字對話
- 純文字對話，無虛擬人物
- 適合快速對話
- 節省資源

## 🚀 快速開始

### 1. 啟動 API 服務
```bash
# 在主目錄中啟動 API 服務
cd /home/csl/toyotapoc
python api_server.py
```

### 2. 啟動 Web 應用
```bash
# 在 web 目錄中啟動 Web 服務器
cd web
python start_web.py
```

### 3. 打開瀏覽器
- 自動打開：http://localhost:3000
- 或手動打開上述網址

## 📁 檔案結構

```
web/
├── index.html              # 主頁面
├── css/
│   └── style.css          # 樣式檔案
├── js/
│   ├── nexavatar_v1.7.js  # NexAvatar 原始檔案
│   └── app.js             # 應用邏輯
├── start_web.py           # Web 服務器啟動腳本
└── README.md              # 說明文件
```

## 🔧 技術特點

### 完全按照 Toyota 原始方式
- 使用相同的 NexAvatar 初始化流程
- 相同的事件監聽器
- 相同的說話方式

### 無 Streamlit 限制
- 直接在瀏覽器中運行
- 沒有 iframe 限制
- 完整的 JavaScript 支援

### 三種模式切換
- 即時切換對話模式
- 界面自動調整
- 狀態即時反饋

## 🎮 使用方法

1. **選擇模式**：點擊頂部的模式按鈕
2. **輸入問題**：在輸入框中輸入您的問題
3. **發送訊息**：點擊發送按鈕或按 Enter
4. **查看回應**：AI 會根據選擇的模式回應

## 🔍 調試

### 瀏覽器開發者工具
- 按 F12 打開開發者工具
- 查看 Console 標籤頁的日誌
- 檢查網路請求狀態

### 常見問題

#### NexAvatar 無法載入
- 檢查 Console 是否有錯誤訊息
- 確認 nexavatar_v1.7.js 檔案存在
- 檢查網路連接

#### API 連接失敗
- 確認 API 服務在 http://localhost:8000 運行
- 檢查防火牆設定
- 查看 API 服務的日誌

#### 語音播放失敗
- 檢查瀏覽器是否允許自動播放
- 確認音量設定
- 嘗試手動點擊播放

## 📊 狀態指示

- 🟢 **綠色**：操作成功
- 🔵 **藍色**：處理中
- 🔴 **紅色**：錯誤
- ⚪ **灰色**：一般資訊

## 🛠️ 開發

### 修改 API 端點
編輯 `js/app.js` 中的 `API_BASE_URL`：
```javascript
const API_BASE_URL = 'http://your-api-server:port';
```

### 修改樣式
編輯 `css/style.css` 來自定義界面樣式。

### 添加新功能
在 `js/app.js` 中添加新的函數和事件監聽器。

## 📝 注意事項

1. **API 服務必須先啟動**：Web 應用依賴 API 服務
2. **瀏覽器兼容性**：建議使用現代瀏覽器（Chrome, Firefox, Safari）
3. **網路連接**：需要穩定的網路連接來訪問 NexAvatar 服務
4. **音訊權限**：某些瀏覽器可能需要用戶互動才能播放音訊

## 🎉 享受使用！

現在您可以享受三種不同模式的 AI 虛擬助理對話體驗！
