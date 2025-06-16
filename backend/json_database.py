"""
基於 JSON 文件的資料庫模型和操作
替代 SQLite，使用 JSON 文件存儲序號和對話記錄
"""

import json
import secrets
from datetime import datetime
from typing import Optional, List, Dict
import os
from pathlib import Path
from config import ADMIN_ACCESS_CODE

class JSONDatabase:
    def __init__(self, codes_file: str = "backend/access_codes.json", logs_file: str = "backend/chat_logs.json"):
        self.codes_file = codes_file
        self.logs_file = logs_file
        self.sessions = {}  # 內存中的會話存儲
        self.init_files()
    
    def init_files(self):
        """初始化 JSON 文件"""
        # 確保目錄存在
        Path(self.codes_file).parent.mkdir(parents=True, exist_ok=True)
        Path(self.logs_file).parent.mkdir(parents=True, exist_ok=True)
        
        # 初始化序號文件
        if not os.path.exists(self.codes_file):
            initial_codes = {
                "codes": [
                    {
                        "code": ADMIN_ACCESS_CODE,
                        "type": "permanent",
                        "description": "管理員永久序號",
                        "is_used": False,
                        "created_at": datetime.now().isoformat() + "Z",
                        "used_at": None,
                        "usage_history": []
                    }
                ]
            }
            self.save_codes(initial_codes)
        
        # 初始化對話記錄文件
        if not os.path.exists(self.logs_file):
            initial_logs = {"logs": []}
            self.save_logs(initial_logs)
    
    def load_codes(self) -> Dict:
        """載入序號數據"""
        try:
            with open(self.codes_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError) as e:
            # 檔案不存在或損壞時，自動重建
            print(f"序號檔案不存在或損壞 ({e})，自動重建中...")
            self.init_files()
            # 重建後再次嘗試載入
            try:
                with open(self.codes_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except Exception:
                # 如果還是失敗，返回空結構
                return {"codes": []}
    
    def save_codes(self, data: Dict):
        """保存序號數據"""
        with open(self.codes_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
    
    def load_logs(self) -> Dict:
        """載入對話記錄"""
        try:
            with open(self.logs_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            return {"logs": []}
    
    def save_logs(self, data: Dict):
        """保存對話記錄"""
        with open(self.logs_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
    
    def generate_access_code(self, code_type: str = "one_time", description: str = "") -> str:
        """生成存取序號"""
        code = secrets.token_hex(8).upper()
        
        codes_data = self.load_codes()
        new_code = {
            "code": code,
            "type": code_type,
            "description": description,
            "is_used": False,
            "created_at": datetime.now().isoformat() + "Z",
            "used_at": None,
            "usage_history": []
        }
        
        if code_type == "one_time":
            new_code["reset_count"] = 0
        
        codes_data["codes"].append(new_code)
        self.save_codes(codes_data)
        
        return code
    
    def validate_access_code(self, code: str) -> Dict:
        """驗證存取序號"""
        codes_data = self.load_codes()
        
        for code_info in codes_data["codes"]:
            if code_info["code"] == code:
                # 檢查一次性序號是否已使用
                if code_info["type"] == "one_time" and code_info["is_used"]:
                    return {"valid": False, "reason": "序號已使用"}
                
                return {
                    "valid": True,
                    "code": code_info["code"],
                    "type": code_info["type"],
                    "is_used": code_info["is_used"],
                    "created_at": code_info["created_at"]
                }
        
        return {"valid": False, "reason": "序號不存在"}
    
    def use_access_code(self, code: str) -> bool:
        """標記序號為已使用（僅限一次性序號）"""
        codes_data = self.load_codes()
        
        for code_info in codes_data["codes"]:
            if code_info["code"] == code and code_info["type"] == "one_time":
                code_info["is_used"] = True
                code_info["used_at"] = datetime.now().isoformat() + "Z"
                
                # 記錄使用歷史
                usage_record = {
                    "used_at": code_info["used_at"],
                    "action": "used"
                }
                code_info["usage_history"].append(usage_record)
                
                self.save_codes(codes_data)
                return True
        
        return False
    
    def reset_access_code(self, code: str, admin_code: str = None) -> Dict:
        """重置一次性序號（管理員功能）"""
        # 驗證管理員權限
        if admin_code:
            admin_validation = self.validate_access_code(admin_code)
            if not admin_validation["valid"] or admin_validation["type"] != "permanent":
                return {"success": False, "message": "無效的管理員序號"}
        
        codes_data = self.load_codes()
        
        for code_info in codes_data["codes"]:
            if code_info["code"] == code:
                if code_info["type"] != "one_time":
                    return {"success": False, "message": "只能重置一次性序號"}
                
                if not code_info["is_used"]:
                    return {"success": False, "message": "序號尚未使用，無需重置"}
                
                # 重置序號
                code_info["is_used"] = False
                code_info["used_at"] = None
                code_info["reset_count"] = code_info.get("reset_count", 0) + 1
                
                # 記錄重置歷史
                reset_record = {
                    "reset_at": datetime.now().isoformat() + "Z",
                    "action": "reset",
                    "reset_by": admin_code or "system"
                }
                code_info["usage_history"].append(reset_record)
                
                self.save_codes(codes_data)
                return {
                    "success": True, 
                    "message": f"序號已重置，重置次數: {code_info['reset_count']}"
                }
        
        return {"success": False, "message": "序號不存在"}
    
    def delete_access_code(self, code: str, admin_code: str = None) -> Dict:
        """刪除序號（管理員功能）"""
        # 驗證管理員權限
        if admin_code:
            admin_validation = self.validate_access_code(admin_code)
            if not admin_validation["valid"] or admin_validation["type"] != "permanent":
                return {"success": False, "message": "無效的管理員序號"}
        
        codes_data = self.load_codes()
        
        for i, code_info in enumerate(codes_data["codes"]):
            if code_info["code"] == code:
                # 不允許刪除管理員序號
                if code_info["type"] == "permanent" and code_info["code"] == ADMIN_ACCESS_CODE:
                    return {"success": False, "message": "不能刪除管理員序號"}
                
                # 刪除序號
                deleted_code = codes_data["codes"].pop(i)
                self.save_codes(codes_data)
                
                return {
                    "success": True, 
                    "message": f"序號 {code} 已刪除",
                    "deleted_code": deleted_code
                }
        
        return {"success": False, "message": "序號不存在"}
    
    def create_custom_code(self, custom_code: str, code_type: str = "one_time", description: str = "", admin_code: str = None) -> Dict:
        """創建自定義序號（管理員功能）"""
        # 驗證管理員權限
        if admin_code:
            admin_validation = self.validate_access_code(admin_code)
            if not admin_validation["valid"] or admin_validation["type"] != "permanent":
                return {"success": False, "message": "無效的管理員序號"}
        
        codes_data = self.load_codes()
        
        # 檢查序號是否已存在
        for code_info in codes_data["codes"]:
            if code_info["code"] == custom_code:
                return {"success": False, "message": "序號已存在"}
        
        # 創建新序號
        new_code = {
            "code": custom_code,
            "type": code_type,
            "description": description,
            "is_used": False,
            "created_at": datetime.now().isoformat() + "Z",
            "used_at": None,
            "usage_history": []
        }
        
        if code_type == "one_time":
            new_code["reset_count"] = 0
        
        codes_data["codes"].append(new_code)
        self.save_codes(codes_data)
        
        return {
            "success": True,
            "message": f"成功創建 {code_type} 序號: {custom_code}",
            "code": custom_code
        }
    
    def create_session(self, access_code: str, ip_address: str, user_agent: str = "") -> str:
        """創建會話"""
        session_id = secrets.token_hex(16)
        
        self.sessions[session_id] = {
            "session_id": session_id,
            "access_code": access_code,
            "ip_address": ip_address,
            "user_agent": user_agent,
            "started_at": datetime.now().isoformat() + "Z",
            "last_activity": datetime.now().isoformat() + "Z",
            "is_active": True
        }
        
        return session_id
    
    def validate_session(self, session_id: str) -> Dict:
        """驗證會話"""
        if session_id not in self.sessions:
            return {"valid": False, "reason": "會話無效或已過期"}
        
        session = self.sessions[session_id]
        if not session["is_active"]:
            return {"valid": False, "reason": "會話已失效"}
        
        # 獲取序號類型
        code_validation = self.validate_access_code(session["access_code"])
        code_type = code_validation.get("type", "unknown") if code_validation["valid"] else "unknown"
        
        return {
            "valid": True,
            "session_id": session["session_id"],
            "access_code": session["access_code"],
            "ip_address": session["ip_address"],
            "code_type": code_type
        }
    
    def update_session_activity(self, session_id: str):
        """更新會話活動時間"""
        if session_id in self.sessions:
            self.sessions[session_id]["last_activity"] = datetime.now().isoformat() + "Z"
    
    def log_chat(self, session_id: str, access_code: str, user_message: str, 
                 bot_response: str, brand: str, ip_address: str, user_agent: str = ""):
        """記錄對話（只保留最新50筆）"""
        logs_data = self.load_logs()
        
        log_entry = {
            "timestamp": datetime.now().isoformat() + "Z",
            "session_id": session_id,
            "access_code": access_code,
            "user_message": user_message,
            "bot_response": bot_response,
            "brand": brand,
            "ip_address": ip_address,
            "user_agent": user_agent
        }
        
        logs_data["logs"].append(log_entry)
        
        # 只保留最新的50筆記錄
        if len(logs_data["logs"]) > 50:
            # 按時間排序，保留最新的50筆
            logs_data["logs"].sort(key=lambda x: x["timestamp"], reverse=True)
            logs_data["logs"] = logs_data["logs"][:50]
        
        self.save_logs(logs_data)
    
    def get_chat_logs(self, access_code: str = None, limit: int = 100) -> List[Dict]:
        """獲取對話記錄"""
        logs_data = self.load_logs()
        logs = logs_data["logs"]
        
        if access_code:
            logs = [log for log in logs if log["access_code"] == access_code]
        
        # 按時間倒序排列並限制數量
        logs.sort(key=lambda x: x["timestamp"], reverse=True)
        return logs[:limit]
    
    def get_access_codes(self) -> List[Dict]:
        """獲取所有序號"""
        codes_data = self.load_codes()
        return codes_data["codes"]

# 全域資料庫實例
json_db = JSONDatabase()

# 初始化時確保有管理員序號
def init_admin_code():
    """確保管理員序號存在"""
    codes_data = json_db.load_codes()
    admin_exists = any(code["code"] == ADMIN_ACCESS_CODE for code in codes_data["codes"])
    
    if not admin_exists:
        admin_code = {
            "code": ADMIN_ACCESS_CODE,
            "type": "permanent",
            "description": "管理員測試用永久通行證",
            "is_used": False,
            "created_at": datetime.now().isoformat() + "Z",
            "used_at": None,
            "usage_history": []
        }
        codes_data["codes"].append(admin_code)
        json_db.save_codes(codes_data)
        print(f"已創建管理員永久通行證: {ADMIN_ACCESS_CODE}")

# 執行初始化
if __name__ == "__main__":
    init_admin_code()
