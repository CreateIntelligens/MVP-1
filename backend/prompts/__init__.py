"""
多品牌 AI 助理提示詞管理套件
"""

from .manager import (
    get_chat_prompt,
    get_available_styles,
    get_quick_questions,
    get_brand_info,
    is_valid_brand,
    get_simple_prompt  # 向後相容
)

# 匯出主要函數供外部使用
__all__ = [
    'get_chat_prompt',
    'get_available_styles', 
    'get_quick_questions',
    'get_brand_info',
    'is_valid_brand',
    'get_simple_prompt'
]

# 版本資訊
__version__ = "2.0.0"
