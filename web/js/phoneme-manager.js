/**
 * 簡化的音素管理系統
 * 直接循環播放音素圖片，不考慮文字內容
 */

class PhonemeManager {
    constructor() {
        this.phonemeImages = [];
        this.originalImages = [];
        this.isPhonemeMode = false;
        this.currentPhonemeIndex = 0;
        this.phonemeFrameRate = 15;
        this.lastPhonemeUpdate = 0;
        this.isInitialized = false;
        this.avatar = null;
    }

    // 初始化音素圖片
    async initialize() {
        if (this.isInitialized) return;

        console.log('開始初始化音素圖片...');
        
        try {
            // 載入所有音素圖片 (00017 到 00160)
            for (let i = 17; i <= 160; i++) {
                const imagePath = `/phoneme/ComfyUI_test1_${String(i).padStart(5, '0')}_.png`;
                const img = await this.loadImage(imagePath);
                this.phonemeImages.push(img);
            }
            
            this.isInitialized = true;
            console.log(`音素圖片初始化完成，共載入 ${this.phonemeImages.length} 張圖片`);
        } catch (error) {
            console.error('音素圖片初始化失敗:', error);
        }
    }

    // 載入單張圖片
    loadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
            img.src = src;
        });
    }

    // 開始音素動畫模式
    startPhonemeMode(avatar) {
        console.log('startPhonemeMode 被調用');
        console.log('isInitialized:', this.isInitialized);
        console.log('phonemeImages.length:', this.phonemeImages.length);
        
        if (!this.isInitialized) {
            console.warn('音素管理器尚未初始化');
            return;
        }

        this.avatar = avatar;
        console.log('avatar.images.length:', avatar.images.length);

        // 保存原始圖片
        this.originalImages = [...avatar.images];
        console.log('已保存原始圖片，數量:', this.originalImages.length);
        
        // 切換到音素模式
        this.isPhonemeMode = true;
        this.currentPhonemeIndex = 0;
        this.lastPhonemeUpdate = 0;
        
        // 替換avatar的圖片為音素圖片
        this.switchToPhonemeImages(avatar);
        
        console.log('已切換到音素動畫模式');
    }

    // 結束音素動畫模式
    endPhonemeMode() {
        if (!this.isPhonemeMode || !this.avatar) return;

        // 恢復原始圖片
        this.avatar.images = [...this.originalImages];
        
        this.isPhonemeMode = false;
        this.currentPhonemeIndex = 0;
        this.avatar = null;
        
        console.log('已恢復到原始動畫模式');
    }

    // 切換到音素圖片
    switchToPhonemeImages(avatar) {
        console.log('switchToPhonemeImages 被調用');
        console.log('avatar.images.length:', avatar.images.length);
        console.log('phonemeImages.length:', this.phonemeImages.length);
        
        // 確保avatar.images陣列存在且足夠大
        if (!avatar.images) {
            avatar.images = [];
        }
        
        // 將音素圖片映射到avatar的images陣列
        for (let i = 0; i < Math.min(50, this.phonemeImages.length); i++) {
            const phonemeIndex = i % this.phonemeImages.length; // 循環使用音素圖片
            avatar.images[i] = this.phonemeImages[phonemeIndex];
        }
        
        // 確保陣列長度足夠
        while (avatar.images.length < 50) {
            const phonemeIndex = avatar.images.length % this.phonemeImages.length;
            avatar.images.push(this.phonemeImages[phonemeIndex]);
        }
        
        console.log('已替換圖片，avatar.images.length:', avatar.images.length);
        console.log('avatar.images[0]:', avatar.images[0]);
    }

    // 更新音素動畫
    updatePhonemeAnimation(timestamp) {
        if (!this.isPhonemeMode || this.phonemeImages.length === 0 || !this.avatar) return;

        if (timestamp - this.lastPhonemeUpdate > (1000 / this.phonemeFrameRate)) {
            this.currentPhonemeIndex = (this.currentPhonemeIndex + 1) % this.phonemeImages.length;
            this.lastPhonemeUpdate = timestamp;
            
            // 更新avatar的圖片陣列，讓動畫更流暢
            this.updateAvatarImages();
        }
    }

    // 更新avatar的圖片陣列
    updateAvatarImages() {
        if (!this.avatar || !this.isPhonemeMode) return;
        
        // 根據當前音素索引更新圖片
        for (let i = 0; i < 50; i++) {
            const phonemeIndex = (this.currentPhonemeIndex + i) % this.phonemeImages.length;
            this.avatar.images[i] = this.phonemeImages[phonemeIndex];
        }
    }

    // 檢查是否為音素模式
    isInPhonemeMode() {
        return this.isPhonemeMode;
    }

    // 獲取當前音素索引
    getCurrentPhonemeIndex() {
        return this.currentPhonemeIndex;
    }

    // 獲取音素圖片總數
    getPhonemeCount() {
        return this.phonemeImages.length;
    }
}

// 導出全局實例
window.PhonemeManager = PhonemeManager; 