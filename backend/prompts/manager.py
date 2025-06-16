"""
多品牌提示詞管理器
統一管理不同品牌的 AI 助理設定
"""

from . import creative_tech
from . import probiotics

# 品牌註冊表
BRANDS = {
    "creative_tech": {
        "name": "創造智能科技股份有限公司",
        "module": creative_tech,
        "description": "MarTech 行銷科技解決方案"
    },
    "probiotics": {
        "name": "益生菌品牌 - 小益",
        "module": probiotics,
        "description": "腸道健康與免疫力調節的機能益生菌"
    }
}

def get_chat_prompt(brand: str, user_input: str, style: str = "default") -> str:
    """根據品牌獲取對話提示詞
    
    Args:
        brand: 品牌識別碼 ("creative_tech", "probiotics")
        user_input: 用戶輸入
        style: 風格選擇
        
    Returns:
        str: 完整的對話提示詞
        
    Raises:
        ValueError: 當品牌不存在時
    """
    if brand not in BRANDS:
        raise ValueError(f"未知的品牌: {brand}. 可用品牌: {list(BRANDS.keys())}")
    
    brand_module = BRANDS[brand]["module"]
    return brand_module.get_chat_prompt(user_input, style)

def get_available_styles(brand: str) -> dict:
    """獲取指定品牌的可用風格
    
    Args:
        brand: 品牌識別碼
        
    Returns:
        dict: 風格選項字典
    """
    if brand not in BRANDS:
        return {}
    
    brand_module = BRANDS[brand]["module"]
    return brand_module.get_available_styles()

def get_quick_questions(brand: str) -> list:
    """獲取指定品牌的預設問題卡片
    
    Args:
        brand: 品牌識別碼
        
    Returns:
        list: 預設問題列表
    """
    if brand not in BRANDS:
        return []
    
    brand_module = BRANDS[brand]["module"]
    return getattr(brand_module, 'QUICK_QUESTIONS', [])

def get_brand_info(brand: str = None) -> dict:
    """獲取品牌資訊
    
    Args:
        brand: 品牌識別碼，若為 None 則返回所有品牌
        
    Returns:
        dict: 品牌資訊
    """
    if brand is None:
        return {
            brand_id: {
                "name": info["name"],
                "description": info["description"]
            }
            for brand_id, info in BRANDS.items()
        }
    
    if brand not in BRANDS:
        return {}
    
    return {
        "name": BRANDS[brand]["name"],
        "description": BRANDS[brand]["description"],
        "styles": get_available_styles(brand),
        "quick_questions": get_quick_questions(brand)
    }

def is_valid_brand(brand: str) -> bool:
    """檢查品牌是否有效
    
    Args:
        brand: 品牌識別碼
        
    Returns:
        bool: 是否為有效品牌
    """
    return brand in BRANDS

# 向後相容性：預設使用創造智能科技
def get_simple_prompt(user_input: str, style: str = "professional") -> str:
    """向後相容的簡化提示詞函數
    
    Args:
        user_input: 用戶輸入
        style: 風格選擇
        
    Returns:
        str: 創造智能科技的對話提示詞
    """
    return get_chat_prompt("creative_tech", user_input, style)
