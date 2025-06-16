"""
LLM + TTS API 服務
提供 RESTful API 供前端呼叫
"""

from fastapi import FastAPI, HTTPException, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import asyncio
import logging
from typing import Optional
import os
from dotenv import load_dotenv
import google.generativeai as genai

# 導入現有模組
from prompts import get_chat_prompt, get_brand_info, get_quick_questions, is_valid_brand
from tts_service import generate_audio, set_voice
from config import GEMMA_MODELS, TTS_VOICES, DEFAULT_SETTINGS
from json_database import json_db, init_admin_code

# 載入環境變數
load_dotenv()

# 設定日誌
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 初始化 FastAPI
app = FastAPI(
    title="AI Assistant API",
    description="LLM + TTS API 服務",
    version="2.0.0"
)

# 設定 CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 生產環境應該限制特定域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 初始化 Gemini
api_key = os.getenv('GOOGLE_API_KEY')
if not api_key:
    raise ValueError("請設定 GOOGLE_API_KEY 環境變數")

genai.configure(api_key=api_key)

# 請求模型
class LoginRequest(BaseModel):
    access_code: str

class ChatRequest(BaseModel):
    message: str
    session_id: str
    model: Optional[str] = DEFAULT_SETTINGS["llm_model"]
    max_length: Optional[int] = DEFAULT_SETTINGS["max_response_length"]
    brand: Optional[str] = "creative_tech"  # 預設使用創造智能科技
    style: Optional[str] = "professional"

class TTSRequest(BaseModel):
    text: str
    session_id: str
    voice: Optional[str] = DEFAULT_SETTINGS["tts_voice"]

class ChatTTSRequest(BaseModel):
    message: str
    session_id: str
    model: Optional[str] = DEFAULT_SETTINGS["llm_model"]
    voice: Optional[str] = DEFAULT_SETTINGS["tts_voice"]
    max_length: Optional[int] = DEFAULT_SETTINGS["max_response_length"]
    brand: Optional[str] = "creative_tech"  # 預設使用創造智能科技
    style: Optional[str] = "professional"

class GenerateCodeRequest(BaseModel):
    code_type: str = "one_time"  # "one_time" 或 "permanent"
    description: str = ""
    admin_code: str  # 需要管理員序號才能生成新序號

class ResetCodeRequest(BaseModel):
    code_to_reset: str  # 要重置的序號
    admin_code: str     # 管理員序號

class DeleteCodeRequest(BaseModel):
    code_to_delete: str  # 要刪除的序號
    admin_code: str      # 管理員序號

class CreateCustomCodeRequest(BaseModel):
    custom_code: str     # 自定義序號
    code_type: str = "one_time"  # "one_time" 或 "permanent"
    description: str = ""
    admin_code: str      # 管理員序號

# 回應模型
class LoginResponse(BaseModel):
    success: bool
    session_id: Optional[str] = None
    message: str
    code_type: Optional[str] = None

class ChatResponse(BaseModel):
    response: str
    original_length: int
    truncated: bool

class TTSResponse(BaseModel):
    audio_data: str
    success: bool

class ChatTTSResponse(BaseModel):
    response: str
    audio_data: Optional[str]
    original_length: int
    truncated: bool
    tts_success: bool

class GenerateCodeResponse(BaseModel):
    success: bool
    code: Optional[str] = None
    message: str

# 輔助函數
def get_client_ip(request: Request) -> str:
    """獲取客戶端 IP 地址"""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host

def get_user_agent(request: Request) -> str:
    """獲取用戶代理字符串"""
    return request.headers.get("User-Agent", "")

async def validate_session_dependency(request: Request, session_id: str) -> dict:
    """驗證會話的依賴函數"""
    session_info = json_db.validate_session(session_id)
    if not session_info["valid"]:
        raise HTTPException(status_code=401, detail=session_info["reason"])
    
    # 更新會話活動時間
    json_db.update_session_activity(session_id)
    
    return session_info


async def get_llm_response(user_input: str, model_name: str = None, brand: str = "creative_tech", style: str = "professional") -> str:
    """從 Gemini 獲取回應 - 使用多品牌智能提示詞系統"""
    try:
        # 檢查輸入是否有效
        if not user_input or not user_input.strip():
            return "請提供有效的問題"
        
        # 檢查輸入長度
        if len(user_input) > 1000:
            return "輸入太長了，請縮短您的問題"
        
        # 檢查品牌是否有效
        if not is_valid_brand(brand):
            logger.warning(f"無效的品牌: {brand}，使用預設品牌")
            brand = "creative_tech"
            style = "professional"
        
        # 使用多品牌提示詞系統
        logger.info(f"使用品牌 {brand} 的提示詞: {user_input[:30]}...")
        full_prompt = get_chat_prompt(brand, user_input, style)
        
        logger.info("提示詞生成完成，發送到 Gemini")
        
        # 使用指定的模型或預設模型
        selected_model = model_name or DEFAULT_SETTINGS["llm_model"]
        model = genai.GenerativeModel(selected_model)
        
        # 生成回應
        response = model.generate_content(full_prompt)
        
        if response and response.text:
            logger.info(f"Gemini 回應成功，長度: {len(response.text)}")
            return response.text
        else:
            logger.warning("Gemini 沒有返回有效回應")
            return "抱歉，我暫時無法回應您的問題，請稍後再試"
            
    except Exception as e:
        logger.error(f"LLM Error: {e}")
        # 提供更友善的錯誤訊息
        return "抱歉，處理您的問題時遇到了技術問題，請稍後再試"

@app.get("/")
async def root():
    """API 根端點"""
    return {
        "message": "AI Assistant API",
        "version": "2.0.0",
        "description": "多品牌 AI 助理服務 (條件式序號登入)",
        "endpoints": {
            "login": "/api/login",
            "chat": "/api/chat",
            "tts": "/api/tts", 
            "chat_with_tts": "/api/chat-tts",
            "models": "/api/models",
            "voices": "/api/voices",
            "brands": "/api/brands",
            "brand_detail": "/api/brands/{brand}",
            "quick_questions": "/api/brands/{brand}/quick-questions",
            "generate_code": "/api/admin/generate-code",
            "chat_logs": "/api/admin/logs"
        }
    }

# 認證相關端點
@app.post("/api/login", response_model=LoginResponse)
async def login(request: LoginRequest, http_request: Request):
    """用戶登入端點"""
    try:
        # 驗證存取序號
        validation_result = json_db.validate_access_code(request.access_code)
        
        if not validation_result["valid"]:
            # 如果驗證失敗，檢查是否是因為檔案不存在
            if validation_result["reason"] == "序號不存在":
                logger.warning("access_codes.json 可能不存在或損壞，嘗試重新初始化")
                try:
                    # 重新初始化管理員序號
                    init_admin_code()
                    # 再次驗證
                    validation_result = json_db.validate_access_code(request.access_code)
                    if not validation_result["valid"]:
                        logger.warning(f"重新初始化後仍然登入失敗: {validation_result['reason']} - 序號: {request.access_code}")
                        return LoginResponse(
                            success=False,
                            message=validation_result["reason"]
                        )
                except Exception as e:
                    logger.error(f"重新初始化失敗: {e}")
                    return LoginResponse(
                        success=False,
                        message="系統初始化失敗，請聯繫管理員"
                    )
            else:
                logger.warning(f"登入失敗: {validation_result['reason']} - 序號: {request.access_code}")
                return LoginResponse(
                    success=False,
                    message=validation_result["reason"]
                )
        
        # 獲取客戶端資訊
        ip_address = get_client_ip(http_request)
        user_agent = get_user_agent(http_request)
        
        # 創建會話
        session_id = json_db.create_session(request.access_code, ip_address, user_agent)
        
        # 如果是一次性序號，標記為已使用
        if validation_result["type"] == "one_time":
            json_db.use_access_code(request.access_code)
        
        logger.info(f"用戶登入成功 - 序號: {request.access_code}, 類型: {validation_result['type']}, IP: {ip_address}")
        
        return LoginResponse(
            success=True,
            session_id=session_id,
            message="登入成功",
            code_type=validation_result["type"]
        )
        
    except Exception as e:
        logger.error(f"登入處理錯誤: {e}")
        raise HTTPException(status_code=500, detail="登入處理失敗")

@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest, http_request: Request):
    """LLM 對話端點 (條件式會話驗證)"""
    try:
        # 檢查品牌是否需要驗證 - 簡化版本
        brand_requires_auth = True  # 預設需要驗證
        
        # 創造智能科技不需要驗證
        if request.brand == 'creative_tech':
            brand_requires_auth = False
        
        session_info = None
        access_code = 'anonymous'
        
        if brand_requires_auth:
            # 需要驗證的品牌，進行會話驗證
            session_info = await validate_session_dependency(http_request, request.session_id)
            access_code = session_info['access_code']
            logger.info(f"收到聊天請求 (品牌: {request.brand}, 序號: {access_code}): {request.message}")
        else:
            # 不需要驗證的品牌，允許匿名訪問
            logger.info(f"收到聊天請求 (品牌: {request.brand}, 匿名訪問): {request.message}")
        
        # 獲取 LLM 回應
        response = await get_llm_response(
            request.message, 
            request.model, 
            request.brand, 
            request.style
        )
        original_length = len(response)
        
        # 記錄對話 (如果需要驗證才記錄)
        if brand_requires_auth and session_info:
            ip_address = get_client_ip(http_request)
            user_agent = get_user_agent(http_request)
            
            json_db.log_chat(
                session_id=request.session_id,
                access_code=access_code,
                user_message=request.message,
                bot_response=response,
                brand=request.brand,
                ip_address=ip_address,
                user_agent=user_agent
            )
            logger.info(f"LLM 回應完成，長度: {original_length}, 已記錄對話")
        else:
            logger.info(f"LLM 回應完成，長度: {original_length}, 匿名訪問不記錄對話")
        
        return ChatResponse(
            response=response,
            original_length=original_length,
            truncated=False
        )
        
    except Exception as e:
        logger.error(f"聊天處理錯誤: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/tts", response_model=TTSResponse)
async def text_to_speech(request: TTSRequest):
    """TTS 語音合成端點"""
    try:
        logger.info(f"收到 TTS 請求: {request.text[:50]}...")
        
        # 設定語音
        set_voice(request.voice)
        
        # 生成語音
        audio_data = await generate_audio(request.text)
        success = audio_data is not None
        
        logger.info(f"TTS 處理完成，成功: {success}")
        
        return TTSResponse(
            audio_data=audio_data or "",
            success=success
        )
        
    except Exception as e:
        logger.error(f"TTS 處理錯誤: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/chat-tts", response_model=ChatTTSResponse)
async def chat_with_tts(request: ChatTTSRequest):
    """LLM 對話 + TTS 語音合成組合端點"""
    try:
        logger.info(f"收到聊天+TTS請求: {request.message}")
        
        # 獲取 LLM 回應
        response = await get_llm_response(
            request.message, 
            request.model, 
            request.brand, 
            request.style
        )
        original_length = len(response)
        
        # 不再進行截斷，直接使用原始回應
        # 生成語音
        set_voice(request.voice)
        audio_data = await generate_audio(response)
        tts_success = audio_data is not None
        
        logger.info(f"聊天+TTS完成，文字長度: {len(response)}, TTS成功: {tts_success}")
        
        return ChatTTSResponse(
            response=response,
            audio_data=audio_data,
            original_length=original_length,
            truncated=False,
            tts_success=tts_success
        )
        
    except Exception as e:
        logger.error(f"聊天+TTS處理錯誤: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/models")
async def get_models():
    """獲取可用的 LLM 模型列表"""
    return {
        "models": GEMMA_MODELS,
        "default": DEFAULT_SETTINGS["llm_model"]
    }

@app.get("/api/voices")
async def get_voices():
    """獲取可用的 TTS 語音列表"""
    return {
        "voices": TTS_VOICES,
        "default": DEFAULT_SETTINGS["tts_voice"]
    }

@app.get("/api/brands")
async def get_brands():
    """獲取所有可用品牌列表"""
    return get_brand_info()

@app.get("/api/brands/{brand}")
async def get_brand_detail(brand: str):
    """獲取指定品牌的詳細資訊"""
    brand_info = get_brand_info(brand)
    if not brand_info:
        raise HTTPException(status_code=404, detail=f"品牌 '{brand}' 不存在")
    return brand_info

@app.get("/api/brands/{brand}/quick-questions")
async def get_brand_quick_questions(brand: str):
    """獲取指定品牌的預設問題卡片"""
    if not is_valid_brand(brand):
        raise HTTPException(status_code=404, detail=f"品牌 '{brand}' 不存在")
    
    questions = get_quick_questions(brand)
    return {
        "brand": brand,
        "quick_questions": questions
    }

# 管理員功能
@app.post("/api/admin/generate-code", response_model=GenerateCodeResponse)
async def generate_access_code(request: GenerateCodeRequest):
    """生成新的存取序號 (需要管理員權限)"""
    try:
        # 驗證管理員序號
        admin_validation = json_db.validate_access_code(request.admin_code)
        if not admin_validation["valid"] or admin_validation["type"] != "permanent":
            return GenerateCodeResponse(
                success=False,
                message="無效的管理員序號"
            )
        
        # 生成新序號
        new_code = json_db.generate_access_code(request.code_type, request.description)
        
        logger.info(f"管理員 {request.admin_code} 生成新序號: {new_code} (類型: {request.code_type})")
        
        return GenerateCodeResponse(
            success=True,
            code=new_code,
            message=f"成功生成 {request.code_type} 序號"
        )
        
    except Exception as e:
        logger.error(f"生成序號錯誤: {e}")
        raise HTTPException(status_code=500, detail="生成序號失敗")

@app.get("/api/admin/logs")
async def get_chat_logs(admin_code: str, access_code: str = None, limit: int = 100):
    """獲取對話記錄 (需要管理員權限)"""
    try:
        # 驗證管理員序號
        admin_validation = json_db.validate_access_code(admin_code)
        if not admin_validation["valid"] or admin_validation["type"] != "permanent":
            raise HTTPException(status_code=403, detail="無效的管理員序號")
        
        # 獲取對話記錄
        logs = json_db.get_chat_logs(access_code, limit)
        
        return {
            "success": True,
            "logs": logs,
            "total": len(logs)
        }
        
    except Exception as e:
        logger.error(f"獲取記錄錯誤: {e}")
        raise HTTPException(status_code=500, detail="獲取記錄失敗")

@app.get("/api/admin/codes")
async def get_access_codes(admin_code: str):
    """獲取所有序號 (需要管理員權限)"""
    try:
        # 驗證管理員序號
        admin_validation = json_db.validate_access_code(admin_code)
        if not admin_validation["valid"] or admin_validation["type"] != "permanent":
            raise HTTPException(status_code=403, detail="無效的管理員序號")
        
        # 獲取所有序號
        codes = json_db.get_access_codes()
        
        return {
            "success": True,
            "codes": codes,
            "total": len(codes)
        }
        
    except Exception as e:
        logger.error(f"獲取序號錯誤: {e}")
        raise HTTPException(status_code=500, detail="獲取序號失敗")

@app.post("/api/admin/reset-code", response_model=GenerateCodeResponse)
async def reset_access_code(request: ResetCodeRequest):
    """重置一次性序號 (需要管理員權限)"""
    try:
        # 重置序號
        reset_result = json_db.reset_access_code(request.code_to_reset, request.admin_code)
        
        if reset_result["success"]:
            logger.info(f"管理員 {request.admin_code} 重置序號: {request.code_to_reset}")
        
        return GenerateCodeResponse(
            success=reset_result["success"],
            code=request.code_to_reset if reset_result["success"] else None,
            message=reset_result["message"]
        )
        
    except Exception as e:
        logger.error(f"重置序號錯誤: {e}")
        raise HTTPException(status_code=500, detail="重置序號失敗")

@app.post("/api/admin/delete-code", response_model=GenerateCodeResponse)
async def delete_access_code(request: DeleteCodeRequest):
    """刪除序號 (需要管理員權限)"""
    try:
        # 刪除序號
        delete_result = json_db.delete_access_code(request.code_to_delete, request.admin_code)
        
        if delete_result["success"]:
            logger.info(f"管理員 {request.admin_code} 刪除序號: {request.code_to_delete}")
        
        return GenerateCodeResponse(
            success=delete_result["success"],
            code=request.code_to_delete if delete_result["success"] else None,
            message=delete_result["message"]
        )
        
    except Exception as e:
        logger.error(f"刪除序號錯誤: {e}")
        raise HTTPException(status_code=500, detail="刪除序號失敗")

@app.post("/api/admin/create-custom-code", response_model=GenerateCodeResponse)
async def create_custom_access_code(request: CreateCustomCodeRequest):
    """創建自定義序號 (需要管理員權限)"""
    try:
        # 創建自定義序號
        create_result = json_db.create_custom_code(
            request.custom_code, 
            request.code_type, 
            request.description, 
            request.admin_code
        )
        
        if create_result["success"]:
            logger.info(f"管理員 {request.admin_code} 創建自定義序號: {request.custom_code} (類型: {request.code_type})")
        
        return GenerateCodeResponse(
            success=create_result["success"],
            code=request.custom_code if create_result["success"] else None,
            message=create_result["message"]
        )
        
    except Exception as e:
        logger.error(f"創建自定義序號錯誤: {e}")
        raise HTTPException(status_code=500, detail="創建自定義序號失敗")

@app.get("/api/health")
async def health_check():
    """健康檢查端點"""
    return {
        "status": "healthy",
        "timestamp": "2024-01-01T00:00:00Z"
    }

# 啟動時初始化
@app.on_event("startup")
async def startup_event():
    """應用啟動時執行"""
    try:
        # 初始化管理員序號
        init_admin_code()
        logger.info("資料庫初始化完成")
    except Exception as e:
        logger.error(f"啟動初始化錯誤: {e}")

if __name__ == "__main__":
    import uvicorn
    
    # 開發模式
    uvicorn.run(
        "api_server:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
