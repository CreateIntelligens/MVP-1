"""
LLM + TTS API 服務
提供 RESTful API 供前端呼叫
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import asyncio
import logging
from typing import Optional
import os
from dotenv import load_dotenv
import google.generativeai as genai

# 導入現有模組
from prompts import get_chat_prompt, get_special_prompt, get_smart_prompt, get_enhanced_chat_prompt
from tts_service import generate_audio, set_voice
from config import GEMMA_MODELS, TTS_VOICES, DEFAULT_SETTINGS

# 載入環境變數
load_dotenv()

# 設定日誌
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 初始化 FastAPI
app = FastAPI(
    title="AI Assistant API",
    description="LLM + TTS API 服務",
    version="1.0.0"
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
class ChatRequest(BaseModel):
    message: str
    model: Optional[str] = DEFAULT_SETTINGS["llm_model"]
    max_length: Optional[int] = DEFAULT_SETTINGS["max_response_length"]

class TTSRequest(BaseModel):
    text: str
    voice: Optional[str] = DEFAULT_SETTINGS["tts_voice"]

class ChatTTSRequest(BaseModel):
    message: str
    model: Optional[str] = DEFAULT_SETTINGS["llm_model"]
    voice: Optional[str] = DEFAULT_SETTINGS["tts_voice"]
    max_length: Optional[int] = DEFAULT_SETTINGS["max_response_length"]

# 回應模型
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


async def get_llm_response(user_input: str, model_name: str = None) -> str:
    """從 Gemini 獲取回應 - 使用智能提示詞系統"""
    try:
        # 檢查輸入是否有效
        if not user_input or not user_input.strip():
            return "請提供有效的問題"
        
        # 檢查輸入長度
        if len(user_input) > 1000:
            return "輸入太長了，請縮短您的問題"
        
        # 使用智能提示詞系統 - 自動判斷用戶意圖並選擇最適合的提示詞
        logger.info(f"使用智能提示詞分析用戶意圖: {user_input[:30]}...")
        full_prompt = get_smart_prompt(user_input)
        
        logger.info("智能提示詞選擇完成，發送到 Gemini")
        
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
        "version": "1.0.0",
        "endpoints": {
            "chat": "/api/chat",
            "tts": "/api/tts", 
            "chat_with_tts": "/api/chat-tts",
            "models": "/api/models",
            "voices": "/api/voices"
        }
    }

@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """LLM 對話端點"""
    try:
        logger.info(f"收到聊天請求: {request.message}")
        
        # 獲取 LLM 回應
        response = await get_llm_response(request.message, request.model)
        original_length = len(response)
        
        # 不再進行截斷，直接返回原始回應
        logger.info(f"LLM 回應完成，長度: {original_length}")
        
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
        response = await get_llm_response(request.message, request.model)
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

@app.get("/api/health")
async def health_check():
    """健康檢查端點"""
    return {
        "status": "healthy",
        "timestamp": "2024-01-01T00:00:00Z"
    }

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
