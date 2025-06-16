"""
提示詞管理模組 - 向後相容性包裝器
重新導向到新的多品牌提示詞系統
"""

# 從新的多品牌系統導入所有功能
from prompts.manager import (
    get_chat_prompt as _get_chat_prompt,
    get_brand_info,
    get_quick_questions,
    is_valid_brand,
    get_simple_prompt
)

# 向後相容的函數
def get_chat_prompt(user_input: str, style: str = "professional") -> str:
    """向後相容的對話提示詞生成函數
    
    預設使用創造智能科技品牌
    
    Args:
        user_input: 用戶輸入
        style: 風格選擇 ("professional", "innovative", "caring")
        
    Returns:
        str: 完整的對話提示詞
    """
    return _get_chat_prompt("creative_tech", user_input, style)

def set_style(style: str):
    """向後相容的風格設定函數
    
    注意：在新的多品牌系統中，風格是在每次呼叫時指定的
    這個函數保留是為了向後相容性，但實際上不會改變全域設定
    
    Args:
        style: 風格選擇 ("professional", "innovative", "caring")
    """
    # 在新系統中，風格是在每次呼叫時指定的，所以這裡只是記錄
    import logging
    logger = logging.getLogger(__name__)
    logger.info(f"風格設定為: {style} (注意：新系統中風格在每次呼叫時指定)")

def get_available_styles():
    """向後相容的風格選項獲取函數
    
    Returns:
        dict: 創造智能科技品牌的風格選項
    """
    from prompts.creative_tech import get_available_styles
    return get_available_styles()

# 匯出向後相容的常數
# 這些常數來自創造智能科技品牌
from prompts.creative_tech import (
    PROFESSIONAL_SYSTEM_PROMPT,
    PROFESSIONAL_COMPANY_INFO,
    INNOVATIVE_SYSTEM_PROMPT,
    INNOVATIVE_COMPANY_INFO,
    CARING_SYSTEM_PROMPT,
    CARING_COMPANY_INFO,
    CHAT_TEMPLATE
)

# 預設設定（向後相容）
SYSTEM_PROMPT = PROFESSIONAL_SYSTEM_PROMPT
COMPANY_INFO = PROFESSIONAL_COMPANY_INFO

# 版本資訊
__version__ = "2.0.0-compat"

# 提示用戶遷移到新系統
import warnings
warnings.warn(
    "直接使用 prompts.py 已被棄用。請考慮遷移到新的多品牌系統：from prompts import get_chat_prompt",
    DeprecationWarning,
    stacklevel=2
)
