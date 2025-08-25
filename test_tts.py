
#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TTS 功能測試腳本
"""

import json
import urllib.request
import sys
import time

def test_tts_local():
    """測試本地 TTS API"""
    print("=== 測試本地 TTS API (localhost:8000) ===")
    
    url = "http://localhost:8000/api/tts"
    data = {
        "text": "你好，這是一個TTS測試。",
        "session_id": "test-session"
    }

    req = urllib.request.Request(
        url, 
        data=json.dumps(data).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )

    try:
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode('utf-8'))
            print(f"[OK] TTS API 回應成功")
            print(f"  成功: {result.get('success')}")
            if result.get('audio_data'):
                print(f"  音頻數據長度: {len(result['audio_data'])} 字符")
                print(f"  音頻格式: {result['audio_data'][:50]}...")
            else:
                print(f"  音頻數據: 無")
            return result.get('success', False)
    except Exception as e:
        print(f"[FAIL] TTS API 測試失敗: {e}")
        return False

def test_tts_docker():
    """測試 Docker TTS API"""
    print("\n=== 測試 Docker TTS API (localhost:80) ===")
    
    url = "http://localhost/api/tts"
    data = {
        "text": "你好，這是一個Docker TTS測試。",
        "session_id": "test-session"
    }

    req = urllib.request.Request(
        url, 
        data=json.dumps(data).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )

    try:
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode('utf-8'))
            print(f"[OK] Docker TTS API 回應成功")
            print(f"  成功: {result.get('success')}")
            if result.get('audio_data'):
                print(f"  音頻數據長度: {len(result['audio_data'])} 字符")
                print(f"  音頻格式: {result['audio_data'][:50]}...")
            else:
                print(f"  音頻數據: 無")
            return result.get('success', False)
    except Exception as e:
        print(f"[FAIL] Docker TTS API 測試失敗: {e}")
        return False

def test_health():
    """測試健康檢查"""
    print("\n=== 測試健康檢查 ===")
    
    for url in ["http://localhost:8000/api/health", "http://localhost/api/health"]:
        try:
            with urllib.request.urlopen(url) as response:
                result = json.loads(response.read().decode('utf-8'))
                print(f"[OK] {url} - 狀態: {result.get('status')}")
        except Exception as e:
            print(f"[FAIL] {url} - 錯誤: {e}")

if __name__ == "__main__":
    print("TTS 功能測試")
    
    # 測試健康檢查
    test_health()
    
    # 測試 TTS 功能
    local_success = test_tts_local()
    docker_success = test_tts_docker()
    
    print(f"\n=== 測試結果 ===")
    print(f"本地 API: {'[OK] 通過' if local_success else '[FAIL] 失敗'}")
    print(f"Docker API: {'[OK] 通過' if docker_success else '[FAIL] 失敗'}")
    
    if local_success or docker_success:
        print("\n[SUCCESS] TTS 功能運作正常！")
        sys.exit(0)
    else:
        print("\n[ERROR] TTS 功能需要修復！")
        sys.exit(1)
