#!/usr/bin/env python3
"""
簡單的 HTTP 服務器來運行 AI 虛擬助理 Web 應用
"""

import http.server
import socketserver
import os
import sys
import webbrowser
from pathlib import Path

# 設定
PORT = 3000
HOST = 'localhost'

def main():
    # 切換到 web 目錄
    web_dir = Path(__file__).parent
    os.chdir(web_dir)
    
    print(f"🌐 啟動 AI 虛擬助理 Web 應用")
    print(f"📁 工作目錄: {web_dir}")
    print(f"🔗 服務地址: http://{HOST}:{PORT}")
    print(f"📋 請確保 API 服務已在 http://localhost:8000 運行")
    print("-" * 50)
    
    # 創建 HTTP 服務器
    handler = http.server.SimpleHTTPRequestHandler
    
    try:
        with socketserver.TCPServer((HOST, PORT), handler) as httpd:
            print(f"✅ HTTP 服務器已啟動在 http://{HOST}:{PORT}")
            print("🚀 正在自動打開瀏覽器...")
            
            # 自動打開瀏覽器
            try:
                webbrowser.open(f'http://{HOST}:{PORT}')
            except Exception as e:
                print(f"⚠️ 無法自動打開瀏覽器: {e}")
                print(f"請手動打開: http://{HOST}:{PORT}")
            
            print("\n按 Ctrl+C 停止服務器")
            print("-" * 50)
            
            # 啟動服務器
            httpd.serve_forever()
            
    except KeyboardInterrupt:
        print("\n🛑 服務器已停止")
        sys.exit(0)
    except OSError as e:
        if e.errno == 48:  # Address already in use
            print(f"❌ 端口 {PORT} 已被使用")
            print("請嘗試關閉其他使用該端口的程序，或修改 PORT 變數")
        else:
            print(f"❌ 服務器啟動失敗: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
