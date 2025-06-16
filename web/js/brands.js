/**
 * 多品牌配置系統
 * 集中管理所有品牌的配置資訊
 */

const BRAND_CONFIGS = {
    creative_tech: {
        id: 'creative_tech',
        name: '創造智能科技',
        title: '創造智能科技 - AI虛擬助理',
        logo: 'img/logo.png',
        logoAlt: '創造智能科技',
        theme: 'blue',
        requireAuth: false,  // 創造智能科技不需要驗證
        startup: {
            title: '歡迎使用創造智能科技AI助理',
            description: '歡迎來到創造智能科技股份有限公司！我們是台灣領先的MarTech行銷科技公司，專注於AI+行銷整合解決方案。',
            services: [
                'CDP顧客數據平台 - 整合多管道數據，AI智能分析',
                'AI虛擬人技術 - 2D/3D客製虛擬人，用於客服代言',
                '智能客服chatbot - 24/7全天候智能客服解決方案',
                'AIGC內容創作 - 端到端影音工作流，腳本到成品',
                '社群代操服務 - YouTube、FB、IG專業內容經營'
            ],
            achievements: '🏆 榮獲2023年YouTube創新應用獎、2024年LINE最佳行銷獎',
            callToAction: '點選「開始體驗」立即與我們的AI助理互動，探索MarTech的無限可能！'
        },
        header: {
            title: '創造智能科技 AI助理'
        },
        quickQuestions: [
            'AI虛擬人可以為我的品牌做什麼？',
            'AITAGO平台如何幫助我做LINE行銷？',
            'AIGC內容創作可以製作什麼影片？'
        ],
        welcomeMessage: '您好！我是創造智能科技的AI助理，專精於MarTech行銷科技解決方案，請選擇對話模式並開始探索AI的無限可能！',
        placeholder: '請輸入您的問題...'
    },
    probiotics: {
        id: 'probiotics',
        name: '小益',
        title: '小益 - 益生菌健康顧問',
        logo: 'img/logo.png',
        logoAlt: '小益益生菌',
        theme: 'green',
        requireAuth: true,   // 益生菌品牌需要驗證
        startup: {
            title: '歡迎使用小益益生菌助理',
            description: '您好！我是小益，您的專屬益生菌健康顧問。專注於腸道健康與免疫力調節，為不同族群提供個人化的益生菌建議。',
            services: [
                '活力系列 - 適合學生族群，支持消化健康，提升學習專注力',
                '職場系列 - 適合上班族，調節腸道機能，舒緩工作壓力',
                '樂活系列 - 適合銀髮族，溫和調理，支持整體健康',
                '綜合調理包 - 結合三大系列精華，適用全家人共同保健',
                '會員專屬服務 - 健康諮詢、定期配送、生日優惠'
            ],
            achievements: '🌿 天然健康，科學配方，專業營養師推薦',
            callToAction: '點選「開始諮詢」立即獲得專屬的益生菌健康建議！'
        },
        header: {
            title: '小益 益生菌健康顧問'
        },
        quickQuestions: [
            '根據我的生活習慣推薦益生菌',
            '不同產品有什麼差異？',
            '加入會員有什麼好處？'
        ],
        welcomeMessage: '您好！我是小益，您的專屬益生菌健康顧問。我可以根據您的生活習慣推薦最適合的益生菌產品，並協助您了解產品差異和會員權益。請告訴我您的需求！',
        placeholder: '請告訴我您的健康需求...'
    }
};

// 預設品牌
const DEFAULT_BRAND = 'creative_tech';

// 獲取品牌配置
function getBrandConfig(brandId) {
    return BRAND_CONFIGS[brandId] || BRAND_CONFIGS[DEFAULT_BRAND];
}

// 獲取所有品牌列表
function getAllBrands() {
    return Object.keys(BRAND_CONFIGS);
}

// 檢查品牌是否有效
function isValidBrand(brandId) {
    return brandId && BRAND_CONFIGS.hasOwnProperty(brandId);
}

// 從 URL 獲取品牌 ID
function getBrandFromURL() {
    // 先檢查 URL 參數
    const urlParams = new URLSearchParams(window.location.search);
    let brandId = urlParams.get('brand');
    
    // 如果沒有 URL 參數，檢查路徑
    if (!brandId) {
        const path = window.location.pathname;
        if (path === '/probiotics') {
            brandId = 'probiotics';
        } else if (path === '/creative-tech') {
            brandId = 'creative_tech';
        } else {
            brandId = DEFAULT_BRAND;
        }
    }
    
    return isValidBrand(brandId) ? brandId : DEFAULT_BRAND;
}

// 導出到全域
window.BRAND_CONFIGS = BRAND_CONFIGS;
window.getBrandConfig = getBrandConfig;
window.getAllBrands = getAllBrands;
window.isValidBrand = isValidBrand;
window.getBrandFromURL = getBrandFromURL;
window.DEFAULT_BRAND = DEFAULT_BRAND;
