"""
資料庫模型和操作
"""

import sqlite3
import hashlib
import secrets
from datetime import datetime
from typing import Optional, List, Dict
import json
import os

class Database:
    def __init__(self, db_path: str = "chat_system.db"):
        self.db_path = db_path
        self.init_database()
    
    def init_database(self):
        """初始化資料庫表格"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # 序號表
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS access_codes (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    code TEXT UNIQUE NOT NULL,
                    code_type TEXT NOT NULL,  -- 'one_time' 或 'permanent'
                    is_used BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    used_at TIMESTAMP NULL,
                    description TEXT
                )
            ''')
            
            # 對話記錄表
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS chat_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id TEXT NOT NULL,
                    access_code TEXT NOT NULL,
                    user_message TEXT NOT NULL,
                    bot_response TEXT NOT NULL,
                    brand TEXT NOT NULL,
                    ip_address TEXT NOT NULL,
                    user_agent TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # 會話表
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS sessions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id TEXT UNIQUE NOT NULL,
                    access_code TEXT NOT NULL,
                    ip_address TEXT NOT NULL,
                    user_agent TEXT,
                    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    is_active BOOLEAN DEFAULT TRUE
                )
            ''')
            
            conn.commit()
    
    def generate_access_code(self, code_type: str = "one_time", description: str = "") -> str:
        """生成存取序號"""
        # 生成 16 位隨機序號
        code = secrets.token_hex(8).upper()
        
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO access_codes (code, code_type, description)
                VALUES (?, ?, ?)
            ''', (code, code_type, description))
            conn.commit()
        
        return code
    
    def validate_access_code(self, code: str) -> Dict:
        """驗證存取序號"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT code, code_type, is_used, created_at
                FROM access_codes
                WHERE code = ?
            ''', (code,))
            
            result = cursor.fetchone()
            if not result:
                return {"valid": False, "reason": "序號不存在"}
            
            code_val, code_type, is_used, created_at = result
            
            # 檢查一次性序號是否已使用
            if code_type == "one_time" and is_used:
                return {"valid": False, "reason": "序號已使用"}
            
            return {
                "valid": True,
                "code": code_val,
                "type": code_type,
                "is_used": is_used,
                "created_at": created_at
            }
    
    def use_access_code(self, code: str) -> bool:
        """標記序號為已使用（僅限一次性序號）"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                UPDATE access_codes
                SET is_used = TRUE, used_at = CURRENT_TIMESTAMP
                WHERE code = ? AND code_type = 'one_time'
            ''', (code,))
            conn.commit()
            return cursor.rowcount > 0
    
    def create_session(self, access_code: str, ip_address: str, user_agent: str = "") -> str:
        """創建會話"""
        session_id = secrets.token_hex(16)
        
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO sessions (session_id, access_code, ip_address, user_agent)
                VALUES (?, ?, ?, ?)
            ''', (session_id, access_code, ip_address, user_agent))
            conn.commit()
        
        return session_id
    
    def validate_session(self, session_id: str) -> Dict:
        """驗證會話"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT s.session_id, s.access_code, s.ip_address, s.is_active,
                       ac.code_type
                FROM sessions s
                JOIN access_codes ac ON s.access_code = ac.code
                WHERE s.session_id = ? AND s.is_active = TRUE
            ''', (session_id,))
            
            result = cursor.fetchone()
            if not result:
                return {"valid": False, "reason": "會話無效或已過期"}
            
            return {
                "valid": True,
                "session_id": result[0],
                "access_code": result[1],
                "ip_address": result[2],
                "code_type": result[4]
            }
    
    def update_session_activity(self, session_id: str):
        """更新會話活動時間"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                UPDATE sessions
                SET last_activity = CURRENT_TIMESTAMP
                WHERE session_id = ?
            ''', (session_id,))
            conn.commit()
    
    def log_chat(self, session_id: str, access_code: str, user_message: str, 
                 bot_response: str, brand: str, ip_address: str, user_agent: str = ""):
        """記錄對話"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO chat_logs 
                (session_id, access_code, user_message, bot_response, brand, ip_address, user_agent)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (session_id, access_code, user_message, bot_response, brand, ip_address, user_agent))
            conn.commit()
    
    def get_chat_logs(self, access_code: str = None, limit: int = 100) -> List[Dict]:
        """獲取對話記錄"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            if access_code:
                cursor.execute('''
                    SELECT session_id, access_code, user_message, bot_response, 
                           brand, ip_address, user_agent, created_at
                    FROM chat_logs
                    WHERE access_code = ?
                    ORDER BY created_at DESC
                    LIMIT ?
                ''', (access_code, limit))
            else:
                cursor.execute('''
                    SELECT session_id, access_code, user_message, bot_response, 
                           brand, ip_address, user_agent, created_at
                    FROM chat_logs
                    ORDER BY created_at DESC
                    LIMIT ?
                ''', (limit,))
            
            results = cursor.fetchall()
            return [
                {
                    "session_id": row[0],
                    "access_code": row[1],
                    "user_message": row[2],
                    "bot_response": row[3],
                    "brand": row[4],
                    "ip_address": row[5],
                    "user_agent": row[6],
                    "created_at": row[7]
                }
                for row in results
            ]
    
    def get_access_codes(self) -> List[Dict]:
        """獲取所有序號"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT code, code_type, is_used, created_at, used_at, description
                FROM access_codes
                ORDER BY created_at DESC
            ''')
            
            results = cursor.fetchall()
            return [
                {
                    "code": row[0],
                    "type": row[1],
                    "is_used": row[2],
                    "created_at": row[3],
                    "used_at": row[4],
                    "description": row[5]
                }
                for row in results
            ]

# 全域資料庫實例
db = Database()

# 初始化時創建一個永久通行證給你測試用
def init_admin_code():
    """初始化管理員永久通行證"""
    admin_code = "ai360"
    
    with sqlite3.connect(db.db_path) as conn:
        cursor = conn.cursor()
        cursor.execute('''
            SELECT code FROM access_codes WHERE code = ?
        ''', (admin_code,))
        
        if not cursor.fetchone():
            cursor.execute('''
                INSERT INTO access_codes (code, code_type, description)
                VALUES (?, ?, ?)
            ''', (admin_code, "permanent", "管理員測試用永久通行證"))
            conn.commit()
            print(f"已創建管理員永久通行證: {admin_code}")

# 執行初始化
if __name__ == "__main__":
    init_admin_code()
