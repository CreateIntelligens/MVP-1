"""
TTS (Text-to-Speech) 服務模組
"""

import asyncio
import edge_tts
import base64
import logging
from config import TTS_VOICES, DEFAULT_SETTINGS

logger = logging.getLogger(__name__)

class TTSService:
    """TTS 服務類別"""
    
    def __init__(self, voice: str = None):
        """初始化 TTS 服務
        
        Args:
            voice: 語音模型名稱，預設使用配置中的預設語音
        """
        self.voice = voice or DEFAULT_SETTINGS["tts_voice"]
    
    def set_voice(self, voice: str):
        """設定語音模型
        
        Args:
            voice: 語音模型名稱
        """
        if voice in TTS_VOICES:
            self.voice = voice
            logger.info(f"TTS 語音已切換為: {TTS_VOICES[voice]}")
        else:
            logger.warning(f"不支援的語音模型: {voice}")
    
    async def generate_audio(self, text: str) -> str:
        """生成語音
        
        Args:
            text: 要轉換的文字
            
        Returns:
            base64 編碼的音訊數據，格式為 data:audio/wav;base64,{data}
            如果失敗則返回 None
        """
        try:
            if not text or not text.strip():
                logger.warning("TTS: 空文字輸入")
                return None
            
            # 限制文字長度
            if len(text) > 1000:
                text = text[:1000] + "..."
                logger.info("TTS: 文字過長，已截斷")
            
            logger.info(f"TTS: 開始生成語音，使用語音: {TTS_VOICES.get(self.voice, self.voice)}")
            
            # 創建 EdgeTTS 通信對象
            communicate = edge_tts.Communicate(text, self.voice)
            audio_data = b""
            
            # 收集音頻數據
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    audio_data += chunk["data"]
            
            if len(audio_data) == 0:
                logger.warning("TTS: EdgeTTS 返回空音頻數據")
                return None
            
            if audio_data:
                audio_base64 = base64.b64encode(audio_data).decode()
                logger.info("TTS: 語音生成成功")
                return f"data:audio/wav;base64,{audio_base64}"
            else:
                logger.warning("TTS: 未生成音訊數據")
                return None
                
        except Exception as e:
            logger.error(f"TTS 錯誤: {e}")
            # 即使出錯也不要拋出異常，返回 None 讓上層處理
            return None
    
    async def generate_audio_with_voice(self, text: str, voice: str) -> str:
        """使用指定語音生成語音
        
        Args:
            text: 要轉換的文字
            voice: 指定的語音模型
            
        Returns:
            base64 編碼的音訊數據
        """
        original_voice = self.voice
        self.set_voice(voice)
        result = await self.generate_audio(text)
        self.voice = original_voice  # 恢復原始語音設定
        return result
    
    def get_available_voices(self) -> dict:
        """獲取可用的語音列表
        
        Returns:
            語音字典 {voice_id: voice_name}
        """
        return TTS_VOICES.copy()
    
    def get_current_voice(self) -> str:
        """獲取當前使用的語音
        
        Returns:
            當前語音的顯示名稱
        """
        return TTS_VOICES.get(self.voice, self.voice)

# 全域 TTS 服務實例
tts_service = TTSService()

# 便利函數
async def generate_audio(text: str, voice: str = None) -> str:
    """生成語音的便利函數
    
    Args:
        text: 要轉換的文字
        voice: 可選的語音模型
        
    Returns:
        base64 編碼的音訊數據
    """
    if voice:
        return await tts_service.generate_audio_with_voice(text, voice)
    else:
        return await tts_service.generate_audio(text)

def set_voice(voice: str):
    """設定全域 TTS 語音的便利函數"""
    tts_service.set_voice(voice)

def get_available_voices() -> dict:
    """獲取可用語音的便利函數"""
    return tts_service.get_available_voices()

def get_current_voice() -> str:
    """獲取當前語音的便利函數"""
    return tts_service.get_current_voice()
