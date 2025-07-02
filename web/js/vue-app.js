/**
 * Vue.js 多品牌 AI 虛擬助理應用
 */

const { createApp } = Vue;

// 啟動介面組件
const StartupCover = {
    props: ['brandConfig', 'countdown', 'accessCode', 'loginError', 'isLoggingIn', 'isLoggedIn', 'requireAuth'],
    emits: ['start-app', 'login', 'update-access-code'],
    template: `
        <div id="startup-cover" class="cover-screen">
            <div class="cover-content">
                <div class="startup-main-content">
                    <div id="disclaimer-box">
                        <h2 style="text-align: center; margin-bottom: 2rem;">
                            {{ brandConfig.startup.title }}
                        </h2>
                        <div id="scroll-section" class="scrollable-content">
                            <p style="font-size: 1.2em;">{{ brandConfig.startup.description }}</p>
                            <div style="font-size: 1.1em; margin: 1.5rem 0;">
                                <h3>🚀 我們的核心服務：</h3>
                                <ul style="text-align: left; margin-left: 2rem;">
                                    <li v-for="service in brandConfig.startup.services" :key="service">
                                        {{ service }}
                                    </li>
                                </ul>
                            </div>
                            <p style="font-size: 1.2em;">{{ brandConfig.startup.achievements }}</p>
                            <p style="font-size: 1.2em;">{{ brandConfig.startup.callToAction }}</p>
                        </div>
                    </div>
                    
                    <div class="startup-bottom">
                        <button 
                            id="start-button" 
                            :class="buttonClass"
                            @click="startApp"
                            :disabled="!canStart"
                        >
                            {{ buttonText }}
                        </button>
                    </div>
                </div>
                
                <!-- 序號輸入區域 - 只有需要驗證的品牌才顯示 -->
                <div v-if="requireAuth" class="access-code-panel">
                    <div class="access-code-box">
                        <h3>存取序號驗證</h3>
                        <p>請輸入您的存取序號</p>
                        
                        <div class="access-code-form">
                            <input 
                                type="text" 
                                :value="accessCode"
                                @input="updateAccessCode"
                                placeholder="請輸入存取序號"
                                class="access-code-input"
                                @keypress.enter="handleLogin"
                                :disabled="isLoggingIn"
                            />
                            
                            <button 
                                class="access-code-button"
                                @click="handleLogin"
                                :disabled="isLoggingIn || !accessCode.trim()"
                            >
                                <span v-if="isLoggingIn">驗證中...</span>
                                <span v-else>驗證</span>
                            </button>
                            
                            <div v-if="loginError" class="access-code-error">
                                {{ loginError }}
                            </div>
                            
                            <div v-if="isLoggedIn" class="access-code-success">
                                ✓ 序號驗證成功！
                            </div>
                        </div>
                        
                        <div class="access-code-info">
                            <p>如需一次性序號，請聯繫管理員</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `,
    computed: {
        buttonClass() {
            if (this.countdown > 0) {
                return 'ok-button-disabled';
            }
            // 如果需要驗證但未登入，按鈕禁用
            if (this.requireAuth && !this.isLoggedIn) {
                return 'ok-button-disabled';
            }
            return 'ok-button';
        },
        buttonText() {
            if (this.countdown > 0) {
                return `開始使用 (${this.countdown})`;
            } else if (this.requireAuth && !this.isLoggedIn) {
                return '請先驗證序號';
            } else {
                return '開始使用';
            }
        },
        canStart() {
            // 倒數計時結束 且 (不需要驗證 或 已經登入)
            return this.countdown === 0 && (!this.requireAuth || this.isLoggedIn);
        }
    },
    methods: {
        startApp() {
            if (this.canStart) {
                this.$emit('start-app');
            }
        },
        handleLogin() {
            this.$emit('login');
        },
        updateAccessCode(event) {
            this.$emit('update-access-code', event.target.value);
        }
    }
};

// 虛擬人容器組件
const AvatarContainer = {
    props: ['brandConfig', 'isAvatarReady'],
    template: `
        <div id="avatar-container" class="avatar-container">
            <!-- 公司 Logo -->
            <div class="company-logo">
                <img :src="brandConfig.logo" :alt="brandConfig.logoAlt" />
            </div>
        </div>
    `
};

// 對話容器組件
const ChatContainer = {
    props: ['brandConfig', 'messages', 'isProcessing', 'quickQuestions'],
    emits: ['send-message', 'select-question'],
    data() {
        return {
            userInput: ''
        };
    },
    template: `
        <div class="chat-container">
            <div id="conversation" class="conversation">
                <!-- 訊息列表 -->
                <div 
                    v-for="(message, index) in messages" 
                    :key="index"
                    :class="['message', message.type + '-message']"
                >
                    <div class="message-content">
                        <p v-if="message.isLoading">
                            <span class="blinking">...</span>
                        </p>
                        <p v-else v-html="message.text"></p>
                    </div>
                </div>
            </div>

            <!-- 快速問題卡片 -->
            <div class="quick-questions" v-if="quickQuestions.length > 0">
                <div class="question-cards">
                    <button 
                        v-for="question in quickQuestions" 
                        :key="question"
                        class="question-card" 
                        @click="selectQuestion(question)"
                    >
                        {{ question }}
                    </button>
                </div>
            </div>

            <!-- 輸入區域 -->
            <div class="input-section">
                <div class="input-container">
                    <input 
                        type="text" 
                        v-model="userInput"
                        :placeholder="brandConfig.placeholder"
                        @keypress.enter="sendMessage"
                    />
                    <button 
                        id="send-btn"
                        @click="sendMessage"
                        :disabled="isProcessing"
                        :style="{ opacity: isProcessing ? '0.7' : '1' }"
                    >
                        發送
                    </button>
                </div>
            </div>
        </div>
    `,
    methods: {
        sendMessage() {
            if (this.userInput.trim()) {
                this.$emit('send-message', this.userInput.trim());
                this.userInput = '';
            }
        },
        selectQuestion(question) {
            this.$emit('select-question', question);
        }
    }
};

// 主應用
const app = createApp({
    components: {
        StartupCover,
        AvatarContainer,
        ChatContainer
    },
    data() {
        return {
            // 認證相關
            isLoggedIn: false,
            sessionId: null,
            accessCode: '',
            loginError: '',
            isLoggingIn: false,
            
            // 品牌相關
            currentBrand: 'creative_tech',
            brandConfig: {
                title: '載入中...',
                header: { title: '載入中...' },
                startup: { title: '載入中...', description: '', services: [], achievements: '', callToAction: '' },
                quickQuestions: [],
                welcomeMessage: '',
                placeholder: '載入中...',
                logo: 'img/logo.png',
                logoAlt: '載入中...'
            },
            
            // UI 狀態
            // showStartup: true,  // 暫時註解掉啟動介面
            // countdown: 3,       // 暫時註解掉倒數計時
            showStartup: false,    // 直接進入主應用
            countdown: 0,          // 不需要倒數
            
            // 對話相關
            messages: [],
            quickQuestions: [],
            isProcessing: false,
            userInput: '',
            
            // 語音和模式
            currentMode: 'mytts',
            selectedVoice: 'zh-TW-HsiaoChenNeural',
            
            // NexAvatar
            avatar: null,
            isAvatarReady: false,
            hasUserInteracted: false,
            pendingWelcomeMessage: false,
            
            // 音素管理器
    
            
            // 狀態顯示
            statusMessage: 'System initializing...',
            statusType: 'info',
            
            // API 配置
            API_BASE_URL: window.location.origin
        };
    },
    computed: {
        pageTitle() {
            return this.brandConfig.title || '多品牌 AI 助理';
        }
    },
    mounted() {
        this.initApp();
    },
    methods: {
        // 初始化應用
        async initApp() {
            console.log('Vue 應用初始化開始');
            
            // 載入品牌配置
            this.loadBrandConfig();
            
            // 載入問題卡片
            await this.loadQuestionCards();
            
            // 直接啟動應用（跳過啟動介面）
            this.hasUserInteracted = true;
            this.showWelcomeMessage();
            
            // 初始化 NexAvatar
            this.$nextTick(() => {
                setTimeout(() => {
                    this.initNexAvatar();
                }, 100);
            });
            
            console.log('Vue 應用初始化完成');
        },
        

        
        // 載入品牌配置
        loadBrandConfig() {
            try {
                console.log('開始載入品牌配置...');
                console.log('當前 URL:', window.location.href);
                console.log('URL 參數:', window.location.search);
                
                // 檢查品牌配置函數是否可用
                if (typeof getBrandFromURL === 'undefined' || typeof getBrandConfig === 'undefined') {
                    console.error('品牌配置函數未載入，使用預設配置');
                    // 嘗試從 URL 路徑判斷品牌
                    const path = window.location.pathname;
                    if (path === '/probiotics') {
                        this.currentBrand = 'probiotics';
                    } else if (path === '/creative-tech') {
                        this.currentBrand = 'creative_tech';
                    } else {
                        this.currentBrand = 'creative_tech';
                    }
                    this.brandConfig = {
                        title: '創造智能科技 - AI虛擬助理',
                        header: { title: '創造智能科技 AI助理' },
                        startup: { 
                            title: '歡迎使用創造智能科技AI助理',
                            description: '歡迎來到創造智能科技股份有限公司！',
                            services: ['AI虛擬人技術', 'AIGC內容創作'],
                            achievements: '🏆 榮獲多項獎項',
                            callToAction: '點選「開始體驗」立即與我們的AI助理互動！'
                        },
                        quickQuestions: ['AI虛擬人可以為我的品牌做什麼？'],
                        welcomeMessage: '您好！我是創造智能科技的AI助理',
                        placeholder: '請輸入您的問題...',
                        logo: 'img/logo.png',
                        logoAlt: '創造智能科技',
                        requireAuth: false  // 預設不需要驗證
                    };
                } else {
                    console.log('品牌配置函數已載入');
                    this.currentBrand = getBrandFromURL();
                    console.log('從 URL 獲取的品牌:', this.currentBrand);
                    this.brandConfig = getBrandConfig(this.currentBrand);
                    console.log('載入的品牌配置:', this.brandConfig);
                }
                
                // 如果品牌不需要驗證，自動設為已登入狀態
                if (!this.brandConfig.requireAuth) {
                    this.isLoggedIn = true;
                    this.sessionId = 'anonymous_' + Date.now(); // 創建匿名會話ID
                    console.log('品牌不需要驗證，自動登入');
                }
                
                // 更新頁面標題
                document.title = this.brandConfig.title;
                
                console.log('品牌配置載入完成:', this.currentBrand, '需要驗證:', this.brandConfig.requireAuth);
            } catch (error) {
                console.error('載入品牌配置時發生錯誤:', error);
                // 使用預設配置
                this.brandConfig = {
                    title: '多品牌 AI 助理',
                    header: { title: 'AI 助理' },
                    startup: { 
                        title: '歡迎使用 AI 助理',
                        description: '載入中...',
                        services: [],
                        achievements: '',
                        callToAction: '請稍候...'
                    },
                    quickQuestions: [],
                    welcomeMessage: '您好！',
                    placeholder: '請輸入您的問題...',
                    logo: 'img/logo.png',
                    logoAlt: 'AI 助理',
                    requireAuth: false
                };
                this.isLoggedIn = true;
                this.sessionId = 'anonymous_' + Date.now();
            }
        },
        
        // 開始倒數計時
        startCountdown() {
            const timer = setInterval(() => {
                if (this.countdown > 0) {
                    this.countdown--;
                } else {
                    clearInterval(timer);
                }
            }, 1000);
        },
        
        // 啟動應用
        startApp() {
            console.log('用戶啟動應用');
            this.hasUserInteracted = true;
            this.showStartup = false;
            
            // 顯示歡迎訊息
            this.showWelcomeMessage();
            
            // 在主界面顯示後初始化 NexAvatar
            this.$nextTick(() => {
                setTimeout(() => {
                    this.initNexAvatar();
                }, 100);
            });
        },
        
        // 初始化 NexAvatar
        initNexAvatar() {
            console.log('開始初始化 NexAvatar');
            
            // 延遲初始化，確保 DOM 完全渲染
            this.$nextTick(() => {
                setTimeout(() => {
                    try {
                        if (typeof NexAvatar === 'undefined') {
                            console.error('NexAvatar 類別未找到');
                            this.updateStatus('NexAvatar 載入失敗', 'error');
                            return;
                        }
                        
                        // 確保容器存在且有正確尺寸
                        const container = document.getElementById('avatar-container');
                        if (!container) {
                            console.error('找不到 avatar-container');
                            this.updateStatus('虛擬人容器未找到', 'error');
                            return;
                        }
                        
                        console.log('容器尺寸:', container.clientWidth, 'x', container.clientHeight);
                        
                        this.avatar = new NexAvatar();
                        window.avatar = this.avatar;
                        
                        // 設定事件監聽器
                        this.avatar.on('intialSucccess', async () => {
                            console.log('NexAvatar 初始化成功');
                            this.isAvatarReady = true;
                            this.updateStatus('虛擬助理已準備就緒！', 'success');
                            

                            
                            this.avatar.start({
                                wipeGreen: true,
                                debug: false,
                                api: 'https://nexretail.scsonic.com'
                            }).then(() => {
                                if (this.pendingWelcomeMessage && this.hasUserInteracted) {
                                    setTimeout(() => {
                                        this.playWelcomeMessage();
                                        this.pendingWelcomeMessage = false;
                                    }, 300);
                                }
                            }).catch(err => {
                                console.error('NexAvatar 啟動失敗:', err);
                                this.updateStatus('虛擬助理啟動失敗', 'error');
                            });
                        });
                        
                        this.avatar.on('speakStart', () => {
                            this.updateStatus('虛擬助理正在說話...', 'info');
                        });
                        
                        this.avatar.on('speakEnd', () => {
                            this.updateStatus('準備接收下一個問題', 'success');
                            setTimeout(() => {
                                this.isProcessing = false;
                            }, 100);
                        });
                        
                        this.avatar.on('speakError', (data) => {
                            console.error('說話錯誤:', data);
                            this.updateStatus('語音播放錯誤', 'error');
                            this.isProcessing = false;
                        });
                        
                        this.avatar.on('error', (data) => {
                            console.error('NexAvatar 錯誤:', data);
                            this.updateStatus('虛擬助理發生錯誤', 'error');
                            this.isProcessing = false;
                        });
                        
                        // 初始化 NexAvatar
                        this.avatar.init({
                            containerLable: '#avatar-container'
                        }).then(data => {
                            if (data && data.err === "Signature verification failed") {
                                console.error('簽名驗證失敗:', data.err);
                                this.updateStatus('NexAvatar 驗證失敗', 'error');
                            } else {
                                console.log('NexAvatar init 完成');
                            }
                        }).catch(error => {
                            console.error('NexAvatar init 錯誤:', error);
                            this.updateStatus('NexAvatar 初始化錯誤', 'error');
                        });
                        
                    } catch (error) {
                        console.error('NexAvatar 初始化失敗:', error);
                        this.updateStatus('NexAvatar 初始化失敗', 'error');
                    }
                }, 500);
            });
        },
        
        // 載入問題卡片
        async loadQuestionCards() {
            try {
                console.log('載入品牌問題卡片:', this.currentBrand);
                
                const response = await fetch(`${this.API_BASE_URL}/api/brands/${this.currentBrand}/quick-questions`);
                
                if (response.ok) {
                    const data = await response.json();
                    this.quickQuestions = data.quick_questions || [];
                    console.log('品牌問題卡片已載入');
                } else {
                    console.log('無法載入品牌問題，使用預設問題');
                    this.quickQuestions = this.brandConfig.quickQuestions || [];
                }
                
            } catch (error) {
                console.error('載入問題卡片失敗:', error);
                this.quickQuestions = this.brandConfig.quickQuestions || [];
            }
        },
        
        // 顯示歡迎訊息
        showWelcomeMessage() {
            const welcomeText = this.brandConfig.welcomeMessage;
            this.addMessage(welcomeText, 'bot');
        },
        
        // 播放歡迎訊息
        async playWelcomeMessage() {
            const welcomeText = this.brandConfig.welcomeMessage;
            
            try {
                await this.handleVoiceResponse(welcomeText);
                console.log('歡迎訊息播放完成');
            } catch (error) {
                console.error('播放歡迎訊息失敗:', error);
                this.updateStatus('歡迎訊息播放失敗', 'error');
            }
        },
        
        // 處理發送訊息
        async handleSendMessage(message) {
            console.log('處理發送訊息:', message);
            
            if (this.isProcessing) {
                this.forceStopCurrentSpeech();
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            
            this.isProcessing = true;
            this.addMessage(message, 'user');
            
            const loadingMessage = this.addLoadingMessage();
            
            try {
                this.updateStatus('正在處理您的問題...', 'info');
                
                const response = await this.getLLMResponse(message);
                
                if (!response || !response.response) {
                    throw new Error('API 回應格式錯誤或無回應內容');
                }
                
                this.updateLoadingMessage(loadingMessage, response.response);
                await this.handleVoiceResponse(response.response);
                
            } catch (error) {
                console.error('處理訊息錯誤:', error);
                this.updateLoadingMessage(loadingMessage, '抱歉，處理您的問題時發生錯誤。');
                this.updateStatus('處理錯誤', 'error');
                this.isProcessing = false;
            }
        },
        
        // 處理選擇問題
        handleSelectQuestion(question) {
            console.log('選擇問題:', question);
            this.handleSendMessage(question);
        },
        
        // 登入功能
        async handleLogin() {
            if (!this.accessCode.trim()) {
                this.loginError = '請輸入存取序號';
                return;
            }
            
            this.isLoggingIn = true;
            this.loginError = '';
            
            try {
                const response = await fetch(`${this.API_BASE_URL}/api/login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        access_code: this.accessCode.trim()
                    })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    this.sessionId = data.session_id;
                    this.isLoggedIn = true;
                    this.showLogin = false;
                    console.log('登入成功，序號類型:', data.code_type);
                    
                    // 如果是一次性序號，提醒用戶
                    if (data.code_type === 'one_time') {
                        this.updateStatus('登入成功！此序號為一次性使用', 'success');
                    } else {
                        this.updateStatus('登入成功！', 'success');
                    }
                } else {
                    this.loginError = data.message;
                }
                
            } catch (error) {
                console.error('登入錯誤:', error);
                this.loginError = '登入失敗，請檢查網路連接';
            } finally {
                this.isLoggingIn = false;
            }
        },
        
        // 登出功能
        logout() {
            this.isLoggedIn = false;
            this.sessionId = null;
            this.accessCode = '';
            this.showStartup = true;
            this.messages = [];
            this.updateStatus('已登出', 'info');
        },

        // 獲取 LLM 回應
        async getLLMResponse(message) {
            try {
                const response = await fetch(`${this.API_BASE_URL}/api/chat`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        message: message,
                        session_id: this.sessionId,
                        model: 'gemma-3-27b-it',
                        brand: this.currentBrand
                    })
                });
                
                if (response.status === 401) {
                    // 會話過期，需要重新登入
                    this.logout();
                    throw new Error('會話已過期，請重新登入');
                }
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }
                
                const data = await response.json();
                console.log('LLM 回應成功');
                return data;
                
            } catch (error) {
                console.error('LLM API 錯誤:', error);
                return {
                    response: error.message || '無法連接到 AI 服務，請確認 API 服務已啟動',
                    original_length: 0,
                    truncated: false
                };
            }
        },
        
        // 處理語音回應
        async handleVoiceResponse(text) {
            try {
                if (this.currentMode === 'nexavatar') {
                    await this.handleNexAvatarSpeak(text);
                } else if (this.currentMode === 'mytts') {
                    await this.handleMyTTSSpeak(text);
                }
            } catch (error) {
                console.error('語音處理錯誤:', error);
                this.updateStatus('語音處理錯誤', 'error');
                this.isProcessing = false;
            }
        },
        
        // NexAvatar 說話
        async handleNexAvatarSpeak(text) {
            if (!this.isAvatarReady || !this.avatar) {
                this.updateStatus('虛擬助理未準備就緒', 'error');
                this.isProcessing = false;
                return;
            }
            
            try {
                const rangeId = this.selectRangeId(text);
                
                await this.avatar.speak({
                    text: text,
                    avatar: "toyota",
                    rangeIds: [rangeId]
                });
                
                console.log('NexAvatar 說話指令已發送');
                
            } catch (error) {
                console.error('NexAvatar 說話失敗:', error);
                this.updateStatus('NexAvatar 語音失敗', 'error');
                this.isProcessing = false;
            }
        },
        
        // 我的 TTS 說話
        async handleMyTTSSpeak(text) {
            if (!this.isAvatarReady || !this.avatar) {
                this.updateStatus('虛擬助理未準備就緒', 'error');
                this.isProcessing = false;
                return;
            }
            
            try {
                const rangeId = this.selectRangeId(text);
                
                const ttsResponse = await fetch(`${this.API_BASE_URL}/api/tts`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        text: text,
                        session_id: this.sessionId,
                        voice: this.selectedVoice
                    })
                });
                
                if (!ttsResponse.ok) {
                    throw new Error(`TTS API 錯誤: ${ttsResponse.status}`);
                }
                
                const ttsData = await ttsResponse.json();
                
                if (!ttsData.success) {
                    throw new Error('TTS 生成失敗');
                }
                
                await this.avatar.speak({
                    text: text,
                    avatar: "toyota",
                    rangeIds: [rangeId],
                    customAudio: ttsData.audio_data
                });
                
                console.log('我的 TTS + NexAvatar 動畫完成');
                
            } catch (error) {
                console.error('我的 TTS 失敗:', error);
                this.updateStatus('我的語音生成失敗', 'error');
                this.isProcessing = false;
            }
        },
        
        // 選擇 rangeId
        selectRangeId(text) {
            const numbers = [0, 18, 19];
            const randomIndex = Math.floor(Math.random() * numbers.length);
            let rangeId = numbers[randomIndex];
            
            const imageKeywords = ['圖片', '照片', '顏色', '外觀', '設計', '造型'];
            const hasImageContent = imageKeywords.some(keyword => text.includes(keyword));
            
            if (hasImageContent) {
                rangeId = 20;
            }
            
            console.log(`選擇 rangeId: ${rangeId}`);
            return rangeId;
        },
        
        // 強制停止當前語音
        forceStopCurrentSpeech() {
            console.log('強制停止當前語音');
            
            try {
                if (this.avatar) {
                    this.avatar.stop();
                    

                    
                    if (this.avatar.audio) {
                        this.avatar.audio.pause();
                        this.avatar.audio.currentTime = 0;
                    }
                    
                    if (this.avatar.ws) {
                        this.avatar.ws.close();
                    }
                }
                
                this.isProcessing = false;
                this.updateStatus('已停止當前對話，準備接收新問題', 'info');
                
            } catch (error) {
                console.error('停止對話時發生錯誤:', error);
                this.isProcessing = false;
            }
        },
        
        // 切換模式
        switchMode(mode) {
            if (this.isProcessing) {
                this.updateStatus('請等待當前操作完成', 'error');
                return;
            }
            
            this.currentMode = mode;
            console.log(`切換到模式: ${mode}`);
            
            if (mode === 'nexavatar') {
                this.updateStatus('NexAvatar (TTS+動畫) + LLM', 'info');
            } else if (mode === 'mytts') {
                this.updateStatus('NexAvatar (動畫) + TTS + LLM', 'info');
            }
        },
        
        // 語音變更
        onVoiceChange() {
            console.log(`語音已切換為: ${this.selectedVoice}`);
            this.updateStatus(`語音已切換`, 'success');
        },
        
        // 添加訊息
        addMessage(text, type) {
            this.messages.push({
                text: text,
                type: type,
                isLoading: false
            });
            
            this.$nextTick(() => {
                const conversation = document.getElementById('conversation');
                if (conversation) {
                    conversation.scrollTop = conversation.scrollHeight;
                }
            });
        },
        
        // 添加載入訊息
        addLoadingMessage() {
            const message = {
                text: '',
                type: 'bot',
                isLoading: true
            };
            
            this.messages.push(message);
            
            this.$nextTick(() => {
                const conversation = document.getElementById('conversation');
                if (conversation) {
                    conversation.scrollTop = conversation.scrollHeight;
                }
            });
            
            return message;
        },
        
        // 更新載入訊息
        updateLoadingMessage(loadingMessage, text) {
            loadingMessage.text = text;
            loadingMessage.isLoading = false;
            
            this.$nextTick(() => {
                const conversation = document.getElementById('conversation');
                if (conversation) {
                    conversation.scrollTop = conversation.scrollHeight;
                }
            });
        },
        
        // 更新狀態
        updateStatus(message, type = 'info') {
            this.statusMessage = message;
            this.statusType = type;
            console.log(`狀態: ${message}`);
        },
        
        // 發送訊息（主應用中的方法）
        sendMessage() {
            if (this.userInput.trim()) {
                this.handleSendMessage(this.userInput.trim());
                this.userInput = '';
            }
        }
    }
});

// 掛載應用
app.mount('#app');

console.log('Vue 多品牌 AI 虛擬助理應用載入完成');
