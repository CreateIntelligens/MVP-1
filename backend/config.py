"""
系統配置管理
"""

# Gemma 模型選項
GEMMA_MODELS = {
    "gemma-3-27b-it": "Gemma 3 27B (推薦)",
    "gemma-3-9b-it": "Gemma 3 9B (較快)",
    "gemma-3-2b-it": "Gemma 3 2B (最快)"
}

# Edge TTS 語音選項
TTS_VOICES = {
    "zh-TW-HsiaoChenNeural": "曉晨 (女聲)",
    "zh-TW-YunJheNeural": "雲哲 (男聲)", 
    "zh-TW-HsiaoYuNeural": "曉雨 (女聲)",
    "zh-CN-XiaoxiaoNeural": "曉曉 (女聲)",
    "zh-CN-YunxiNeural": "雲希 (男聲)"
}

# 助理模式選項
ASSISTANT_MODES = {
    "text_tts": "文字 + 語音 (我的TTS)",
    "avatar_nexavatar": "虛擬人物 + NexAvatar語音 (原始)",
    "avatar_my_tts": "虛擬人物 + 我的語音 (覆蓋)"
}

# 預設設定
DEFAULT_SETTINGS = {
    "llm_model": "gemma-3-27b-it",
    "tts_voice": "zh-TW-HsiaoChenNeural",
    "max_response_length": 40,
    "assistant_mode": "text_tts"
}
