/**
 * AI Virtual Assistant Application
 * 
 * Features:
 * 1. NexAvatar (TTS + Animation) + LLM
 * 2. NexAvatar (Animation) + Custom TTS + LLM
 * 
 * @author Your Name
 * @version 1.0.0
 */

// Global variables
let currentMode = 'mytts';
let avatar = null;
let isAvatarReady = false;
let isProcessing = false;
let selectedVoice = 'zh-TW-HsiaoChenNeural';
let hasUserInteracted = false;
let pendingWelcomeMessage = false;

// API configuration
const API_BASE_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:8000'
    : window.location.origin;

// DOM elements
let startButton = null;
let startupCover = null;
let mainApp = null;
let modeButtons = {};
let userInput = null;
let sendBtn = null;
let conversation = null;
let avatarContainer = null;
let chatContainer = null;
let status = null;
let voiceSelect = null;

// Initialize DOM elements
function initDOMElements() {
    console.log('Initializing DOM elements...');
    
    startButton = document.getElementById('start-button');
    startupCover = document.getElementById('startup-cover');
    mainApp = document.getElementById('main-app');
    
    modeButtons = {
        nexavatar: document.getElementById('mode-nexavatar'),
        mytts: document.getElementById('mode-mytts')
    };
    
    userInput = document.getElementById('user-input');
    sendBtn = document.getElementById('send-btn');
    conversation = document.getElementById('conversation');
    avatarContainer = document.getElementById('avatar-container');
    chatContainer = document.querySelector('.chat-container');
    status = document.getElementById('status');
    voiceSelect = document.getElementById('voice-select');
    
    console.log('DOM elements initialized');
}

// Application initialization
document.addEventListener('DOMContentLoaded', function() {
    console.log('AI Virtual Assistant Application started');
    
    initDOMElements();
    tryEnableAudioContext();
    initEventListeners();
    initNexAvatar();
    updateStatus('System initializing...', 'info');
    initStartupCountdown();
});

// 嘗試繞過瀏覽器音訊限制
function tryEnableAudioContext() {
    try {
        // 創建一個靜音的音訊上下文
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // 創建一個極短的靜音音訊
        const buffer = audioContext.createBuffer(1, 1, 22050);
        const source = audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContext.destination);
        
        // 播放靜音音訊來啟用音訊上下文
        source.start(0);
        
        console.log('音訊上下文已啟用');
        hasUserInteracted = true; // 標記為已互動
        
        // 如果成功，嘗試恢復音訊上下文
        if (audioContext.state === 'suspended') {
            audioContext.resume().then(() => {
                console.log('音訊上下文已恢復');
            });
        }
        
    } catch (error) {
        console.log('無法自動啟用音訊上下文:', error);
        // 如果失敗，保持原有邏輯
    }
}

// 初始化事件監聽器
function initEventListeners() {
    console.log('初始化事件監聽器...');
    console.log('startButton:', startButton);
    console.log('startupCover:', startupCover);
    
    // 確保元素存在
    if (!startButton) {
        console.error('找不到 start-button 元素！');
        return;
    }
    
    if (!startupCover) {
        console.error('找不到 startup-cover 元素！');
        return;
    }
    
    // 啟動按鈕事件監聽器 - 完全模仿 Toyota 的邏輯
    startButton.addEventListener('click', async function(event) {
        console.log('用戶點擊啟動按鈕！');
        console.log('事件對象:', event);
        console.log('按鈕元素:', event.target);
        console.log('按鈕是否禁用:', startButton.disabled);
        console.log('按鈕 class:', startButton.className);
        
        // 檢查按鈕是否被禁用
        if (startButton.classList.contains('ok-button-disabled')) {
            console.log('按鈕仍然被禁用，忽略點擊');
            return;
        }
        
        // 防止預設行為
        event.preventDefault();
        event.stopPropagation();
        
        // 標記用戶已互動
        hasUserInteracted = true;
        
        console.log('準備隱藏覆蓋層...');
        console.log('覆蓋層當前顯示狀態:', startupCover.style.display);
        console.log('覆蓋層元素:', startupCover);
        
        // 檢查是否有多個覆蓋層元素
        const allCovers = document.querySelectorAll('#startup-cover, .cover-screen');
        console.log('找到的所有覆蓋層元素數量:', allCovers.length);
        allCovers.forEach((cover, index) => {
            console.log(`覆蓋層 ${index}:`, cover);
        });
        
        // 移除所有覆蓋層元素
        allCovers.forEach((cover, index) => {
            try {
                console.log(`正在移除覆蓋層 ${index}...`);
                cover.remove();
                console.log(`覆蓋層 ${index} 已移除！`);
            } catch (error) {
                console.log(`移除覆蓋層 ${index} 失敗:`, error);
                
                // 備用方法：多種方式隱藏覆蓋層
                cover.style.setProperty('display', 'none', 'important');
                cover.style.setProperty('visibility', 'hidden', 'important');
                cover.style.setProperty('opacity', '0', 'important');
                cover.style.setProperty('z-index', '-999999', 'important');
                cover.style.setProperty('position', 'absolute', 'important');
                cover.style.setProperty('left', '-9999px', 'important');
                cover.style.setProperty('top', '-9999px', 'important');
                cover.style.setProperty('pointer-events', 'none', 'important');
                
                console.log(`覆蓋層 ${index} 隱藏完成！`);
            }
        });
        
        // 再次檢查是否還有覆蓋層
        const remainingCovers = document.querySelectorAll('#startup-cover, .cover-screen');
        console.log('處理後剩餘的覆蓋層數量:', remainingCovers.length);
        
        // 立即顯示並播放歡迎語音（因為現在有真正的用戶互動）
        setTimeout(async () => {
            // 先顯示歡迎文字
            showWelcomeMessage();
            
            // 然後嘗試播放歡迎語音
            if (isAvatarReady) {
                await playWelcomeMessage();
            } else {
                // 如果 avatar 還沒準備好，設置待播放標記
                pendingWelcomeMessage = true;
            }
        }, 300);
    });
    
    // 添加備用的點擊處理（以防萬一）
    document.addEventListener('click', function(event) {
        if (event.target && event.target.id === 'start-button') {
            console.log('備用點擊處理器觸發！');
            if (!startButton.classList.contains('ok-button-disabled')) {
                console.log('透過備用處理器隱藏覆蓋層');
                if (startupCover) {
                    startupCover.style.display = 'none';
                    hasUserInteracted = true;
                }
            }
        }
    });
    
    console.log('啟動按鈕事件監聽器已設置');

    // 模式切換按鈕
    Object.keys(modeButtons).forEach(mode => {
        modeButtons[mode].addEventListener('click', () => {
            switchMode(mode);
        });
    });
    
    // 發送按鈕 - 支援中斷功能
    sendBtn.addEventListener('click', () => {
        console.log('發送按鈕被點擊');
        console.log('當前處理狀態:', isProcessing);
        console.log('按鈕禁用狀態:', sendBtn.disabled);
        
        handleFirstUserInteraction();
        
        // 如果正在處理中，直接中斷並開始新對話
        if (isProcessing) {
            console.log('檢測到正在進行的語音，強制中斷');
            forceStopCurrentSpeech();
            
            // 短暫延遲後檢查輸入框內容
            setTimeout(() => {
                const message = userInput.value.trim();
                if (message) {
                    console.log('有新訊息，開始處理:', message);
                    handleSendMessage();
                } else {
                    console.log('無新訊息，僅中斷當前語音');
                }
            }, 200);
        } else {
            // 正常發送訊息
            handleSendMessage();
        }
    });
    
    // 輸入框 Enter 鍵
    userInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleFirstUserInteraction();
            handleSendMessage();
        }
    });
    
    // 語音選擇下拉選單
    voiceSelect.addEventListener('change', function(e) {
        handleFirstUserInteraction();
        selectedVoice = e.target.value;
        console.log(`語音已切換為: ${selectedVoice}`);
        updateStatus(`語音已切換為: ${e.target.options[e.target.selectedIndex].text}`, 'success');
    });
    
    // 快速問題卡片點擊事件
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('question-card')) {
            e.preventDefault();
            e.stopPropagation();
            
            console.log('快速問題卡片被點擊');
            handleFirstUserInteraction();
            
            const question = e.target.getAttribute('data-question');
            console.log('取得問題:', question);
            
            if (question) {
                userInput.value = question;
                console.log('設定輸入框內容:', userInput.value);
                
                // 立即調用發送訊息
                setTimeout(() => {
                    console.log('開始處理卡片問題');
                    handleSendMessage();
                }, 100); // 短暫延遲確保 DOM 更新
            }
        }
    });
    
    // 全域點擊事件 - 確保任何點擊都能啟用音訊
    document.addEventListener('click', function(e) {
        handleFirstUserInteraction();
    }, { once: false });
    
    // 全域鍵盤事件 - 確保任何按鍵都能啟用音訊
    document.addEventListener('keydown', function(e) {
        handleFirstUserInteraction();
    }, { once: false });
    
    console.log('事件監聽器初始化完成');
}

// 初始化 NexAvatar
function initNexAvatar() {
    console.log('開始初始化 NexAvatar');
    
    try {
        // 檢查 NexAvatar 是否可用
        if (typeof NexAvatar === 'undefined') {
            console.error('NexAvatar 類別未找到');
            updateStatus('NexAvatar 載入失敗', 'error');
            return;
        }
        
        // 創建 NexAvatar 實例
        avatar = new NexAvatar();
        window.avatar = avatar; // 全域可用
        
        console.log('NexAvatar 實例已創建');
        
        // 設定事件監聽器
        avatar.on('intialSucccess', () => {
            console.log('NexAvatar 初始化成功');
            isAvatarReady = true;
            updateStatus('虛擬助理已準備就緒！', 'success');
            
            // 啟動 NexAvatar
            avatar.start({
                wipeGreen: true,
                debug: false,
            }).then(() => {
                // NexAvatar 啟動成功，檢查是否有待播放的歡迎訊息
                if (pendingWelcomeMessage && hasUserInteracted) {
                    setTimeout(async () => {
                        await playWelcomeMessage();
                        pendingWelcomeMessage = false;
                    }, 300);
                }
            }).catch(err => {
                console.error('NexAvatar 啟動失敗:', err);
                updateStatus('虛擬助理啟動失敗', 'error');
            });
        });
        
        avatar.on('speakStart', (data) => {
            console.log('開始說話');
            updateStatus('虛擬助理正在說話...', 'info');
        });
        
        avatar.on('speakEnd', (data) => {
            console.log('說話結束');
            updateStatus('準備接收下一個問題', 'success');
            // 延遲重置，確保狀態正確
            setTimeout(() => {
                resetProcessingState();
            }, 100);
        });
        
        avatar.on('speakError', (data) => {
            console.error('說話錯誤:', data);
            updateStatus('語音播放錯誤', 'error');
            // 立即重置狀態
            resetProcessingState();
        });
        
        // 添加更多事件監聽來確保狀態正確重置
        avatar.on('wsClose', (data) => {
            console.log('WebSocket 連接關閉');
            // 延遲重置，確保連接完全關閉
            setTimeout(() => {
                resetProcessingState();
            }, 200);
        });
        
        avatar.on('error', (data) => {
            console.error('NexAvatar 錯誤:', data);
            updateStatus('虛擬助理發生錯誤', 'error');
            // 立即重置狀態
            resetProcessingState();
        });
        
        // 初始化 NexAvatar
        avatar.init({
            containerLable: '#avatar-container'
        }).then(data => {
            if (data && data.err === "Signature verification failed") {
                console.error('簽名驗證失敗:', data.err);
                updateStatus('NexAvatar 驗證失敗', 'error');
            } else {
                console.log('NexAvatar init 完成');
            }
        }).catch(error => {
            console.error('NexAvatar init 錯誤:', error);
            updateStatus('NexAvatar 初始化錯誤', 'error');
        });
        
    } catch (error) {
        console.error('NexAvatar 初始化失敗:', error);
        updateStatus('NexAvatar 初始化失敗', 'error');
    }
}

// 切換模式
function switchMode(mode) {
    if (isProcessing) {
        updateStatus('請等待當前操作完成', 'error');
        return;
    }
    
    currentMode = mode;
    console.log(`切換到模式: ${mode}`);
    
    // 更新按鈕狀態
    Object.keys(modeButtons).forEach(m => {
        modeButtons[m].classList.remove('active');
    });
    modeButtons[mode].classList.add('active');
    
    // 根據模式調整界面 - 兩種模式都顯示虛擬人物
    avatarContainer.classList.remove('hidden');
    chatContainer.classList.remove('full-width');
    
    if (mode === 'nexavatar') {
        updateStatus('NexAvatar (TTS+動畫) + LLM', 'info');
    } else if (mode === 'mytts') {
        updateStatus('NexAvatar (動畫) + TTS + LLM', 'info');
    }
}

// 強制停止當前對話
function forceStopCurrentSpeech() {
    console.log('強制停止當前語音和動畫');
    
    try {
        // 停止 NexAvatar 的所有功能
        if (avatar) {
            // 嘗試多種停止方法
            avatar.stop();
            
            // 如果有音訊元素，直接停止
            if (avatar.audio) {
                avatar.audio.pause();
                avatar.audio.currentTime = 0;
                console.log('直接停止音訊播放');
            }
            
            // 如果有 WebSocket，關閉它
            if (avatar.ws) {
                avatar.ws.close();
                console.log('關閉 WebSocket 連接');
            }
            
            console.log('NexAvatar 已完全停止');
        }
        
        // 額外停止所有可能的音訊元素
        const audioElements = document.querySelectorAll('audio, video');
        audioElements.forEach(audio => {
            audio.pause();
            audio.currentTime = 0;
        });
        
        // 重置所有狀態
        isProcessing = false;
        sendBtn.disabled = false;
        
        updateStatus('已停止當前對話，準備接收新問題', 'info');
        
    } catch (error) {
        console.error('停止對話時發生錯誤:', error);
        // 即使出錯也要重置狀態
        isProcessing = false;
        sendBtn.disabled = false;
    }
}

// 處理發送訊息
async function handleSendMessage() {
    const message = userInput.value.trim();
    if (!message) return;
    
    // 如果正在處理中，先停止當前對話
    if (isProcessing) {
        console.log('檢測到正在進行的對話，先停止...');
        forceStopCurrentSpeech();
        
        // 短暫延遲確保停止完成
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    isProcessing = true;
    // 不要完全禁用按鈕，而是視覺上顯示正在處理
    sendBtn.style.opacity = '0.7';
    sendBtn.textContent = '發送';
    userInput.value = '';
    
    // 添加用戶訊息到對話
    addMessage(message, 'user');
    
    // 立即顯示載入動畫
    const loadingMessage = addLoadingMessage();
    
    try {
        updateStatus('正在處理您的問題...', 'info');
        
        // 獲取 LLM 回應
        const response = await getLLMResponse(message);
        
        if (!response || !response.response) {
            throw new Error('API 回應格式錯誤或無回應內容');
        }
        
        // 先準備語音，等語音開始時再顯示文字
        await handleVoiceResponseWithSync(loadingMessage, response.response);
        
    } catch (error) {
        console.error('處理訊息錯誤:', error);
        updateLoadingMessage(loadingMessage, '抱歉，處理您的問題時發生錯誤。');
        updateStatus('處理錯誤', 'error');
        isProcessing = false;
        sendBtn.disabled = false;
    }
}

// 獲取 LLM 回應
async function getLLMResponse(message) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: message,
                model: 'gemma-3-27b-it'
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        console.log('LLM 回應成功');
        return data;
        
    } catch (error) {
        console.error('LLM API 錯誤:', error);
        return {
            response: '無法連接到 AI 服務，請確認 API 服務已啟動',
            original_length: 0,
            truncated: false
        };
    }
}

// 處理語音回應
async function handleVoiceResponse(text) {
    try {
        if (currentMode === 'nexavatar') {
            // 模式1: 他的語音 (NexAvatar)
            await handleNexAvatarSpeak(text);
            
        } else if (currentMode === 'mytts') {
            // 模式2: 我的語音 (Edge TTS)
            await handleMyTTSSpeak(text);
        }
        
    } catch (error) {
        console.error('語音處理錯誤:', error);
        updateStatus('語音處理錯誤', 'error');
        isProcessing = false;
        sendBtn.disabled = false;
    }
}

// 處理語音回應並同步顯示文字
async function handleVoiceResponseWithSync(loadingMessage, text) {
    return new Promise((resolve, reject) => {
        let hasTextShown = false;
        let isCompleted = false;
        let eventListenersAdded = false;
        
        // 清理事件監聽器的函數
        const cleanupEventListeners = () => {
            // NexAvatar 沒有 off 方法，直接重置標記
            eventListenersAdded = false;
            console.log('重置事件監聽器狀態（NexAvatar 沒有 off 方法）');
        };
        
        // 設定語音開始事件監聽器
        const onSpeakStart = () => {
            if (!hasTextShown && !isCompleted) {
                hasTextShown = true;
                console.log('語音開始，同步顯示文字');
                updateLoadingMessage(loadingMessage, text);
            }
        };
        
        // 設定語音結束事件監聽器
        const onSpeakEnd = () => {
            if (!isCompleted) {
                isCompleted = true;
                // 不調用 cleanupEventListeners，直接重置狀態
                eventListenersAdded = false;
                resolve();
            }
        };
        
        // 設定語音錯誤事件監聽器
        const onSpeakError = (error) => {
            console.error('語音播放錯誤:', error);
            if (!hasTextShown && !isCompleted) {
                hasTextShown = true;
                updateLoadingMessage(loadingMessage, text);
            }
            if (!isCompleted) {
                isCompleted = true;
                // 不調用 cleanupEventListeners，直接重置狀態
                eventListenersAdded = false;
                resolve(); // 即使出錯也要 resolve，避免卡住
            }
        };
        
        // 添加事件監聽器
        if (avatar) {
            avatar.on('speakStart', onSpeakStart);
            avatar.on('speakEnd', onSpeakEnd);
            avatar.on('speakError', onSpeakError);
            eventListenersAdded = true;
        }
        
        // 設定超時保護，如果 5 秒內沒有語音開始，就直接顯示文字
        const timeoutId = setTimeout(() => {
            if (!hasTextShown && !isCompleted) {
                hasTextShown = true;
                console.log('語音超時，直接顯示文字');
                updateLoadingMessage(loadingMessage, text);
            }
            if (!isCompleted) {
                isCompleted = true;
                // 不調用 cleanupEventListeners，直接重置狀態
                eventListenersAdded = false;
                resolve();
            }
        }, 5000);
        
        // 開始語音處理
        handleVoiceResponse(text).then(() => {
            clearTimeout(timeoutId);
            // 如果語音處理完成但還沒顯示文字，就顯示文字
            if (!hasTextShown && !isCompleted) {
                hasTextShown = true;
                updateLoadingMessage(loadingMessage, text);
            }
        }).catch((error) => {
            clearTimeout(timeoutId);
            console.error('語音處理失敗:', error);
            if (!hasTextShown && !isCompleted) {
                hasTextShown = true;
                updateLoadingMessage(loadingMessage, text);
            }
            if (!isCompleted) {
                isCompleted = true;
                // 不調用 cleanupEventListeners，直接重置狀態
                eventListenersAdded = false;
                reject(error);
            }
        });
    });
}


// NexAvatar 說話
async function handleNexAvatarSpeak(text) {
    if (!isAvatarReady || !avatar) {
        updateStatus('虛擬助理未準備就緒', 'error');
        resetProcessingState();
        return;
    }
    
    try {
        console.log('使用 NexAvatar 說話:', text);
        
        // 設定超時保護機制
        const timeoutId = setTimeout(() => {
            if (isProcessing) {
                console.log('NexAvatar 語音處理超時，重置狀態');
                updateStatus('語音處理超時，請重試', 'error');
                resetProcessingState();
            }
        }, 30000); // 30秒超時
        
        // 根據 Toyota 官方邏輯選擇 rangeId
        const rangeId = selectRangeId(text);
        
        // 使用官方格式的參數
        await avatar.speak({
            text: text,
            avatar: "toyota",
            rangeIds: [rangeId]
        });
        
        // 清除超時計時器
        clearTimeout(timeoutId);
        console.log('NexAvatar 說話指令已發送');
        
    } catch (error) {
        console.error('NexAvatar 說話失敗:', error);
        updateStatus('NexAvatar 語音失敗', 'error');
        resetProcessingState();
    }
}

// 我的 TTS 說話（真正的並行優化版本）
async function handleMyTTSSpeak(text) {
    if (!isAvatarReady || !avatar) {
        updateStatus('虛擬助理未準備就緒', 'error');
        resetProcessingState();
        return;
    }
    
    try {
        console.log('使用我的 TTS 說話（真正並行處理）:', text);
        
        // 根據 Toyota 官方邏輯選擇 rangeId
        const rangeId = selectRangeId(text);
        
        // 設定超時保護機制
        const timeoutId = setTimeout(() => {
            if (isProcessing) {
                console.log('我的 TTS 語音處理超時，重置狀態');
                updateStatus('語音處理超時，請重試', 'error');
                resetProcessingState();
            }
        }, 30000); // 30秒超時
        
        // 並行處理：同時進行 TTS 生成和 NexAvatar 準備
        console.log('開始真正並行處理：TTS + NexAvatar 同時進行');
        
        // 先快速生成 TTS
        const ttsResponse = await fetch(`${API_BASE_URL}/api/tts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text: text,
                voice: selectedVoice
            })
        });
        
        if (!ttsResponse.ok) {
            throw new Error(`TTS API 錯誤: ${ttsResponse.status}`);
        }
        
        const ttsData = await ttsResponse.json();
        
        if (!ttsData.success) {
            throw new Error('TTS 生成失敗');
        }
        
        console.log('TTS 生成完成，現在直接使用 customAudio 調用 NexAvatar');
        
        // 直接使用我們的 TTS 音訊調用 NexAvatar
        await avatar.speak({
            text: text,
            avatar: "toyota",
            rangeIds: [rangeId],
            customAudio: ttsData.audio_data  // 直接使用我們的 TTS
        });
        
        // 清除超時計時器
        clearTimeout(timeoutId);
        console.log('我的 TTS + NexAvatar 動畫完成（真正並行處理）');
        
    } catch (error) {
        console.error('我的 TTS 失敗:', error);
        updateStatus('我的語音生成失敗', 'error');
        resetProcessingState();
    }
}



// 添加訊息到對話
function addMessage(text, type) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}-message`;
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    
    const p = document.createElement('p');
    p.textContent = text;
    contentDiv.appendChild(p);
    messageDiv.appendChild(contentDiv);
    
    conversation.appendChild(messageDiv);
    conversation.scrollTop = conversation.scrollHeight;
}

// 添加載入動畫訊息
function addLoadingMessage() {
    const loadingMessage = document.createElement('div');
    loadingMessage.id = 'loading-message';
    loadingMessage.className = 'message bot-message';
    
    loadingMessage.innerHTML = `
        <div class="message-content">
            <p><span class="blinking">...</span></p>
        </div>
    `;
    
    conversation.appendChild(loadingMessage);
    conversation.scrollTop = conversation.scrollHeight;
    
    return loadingMessage;
}

// 更新載入訊息為實際內容
function updateLoadingMessage(loadingMessage, text) {
    const contentDiv = loadingMessage.querySelector('.message-content');
    if (contentDiv) {
        const p = contentDiv.querySelector('p');
        if (p) {
            p.innerHTML = text; // 使用 innerHTML 支援 HTML 內容
        }
    }
    
    // 移除 loading-message ID
    loadingMessage.removeAttribute('id');
    
    conversation.scrollTop = conversation.scrollHeight;
}

// 根據 Toyota 官方邏輯選擇 rangeId
function selectRangeId(text) {
    // Toyota 官方邏輯：
    // 1. 預設從 [0, 18, 19] 隨機選擇
    // 2. 如果有圖片相關內容，使用 rangeId = 20
    // 3. 特殊情況也可以使用 rangeId = 20
    
    const numbers = [0, 18, 19];
    const randomIndex = Math.floor(Math.random() * numbers.length);
    let rangeId = numbers[randomIndex];
    
    // 檢查是否包含圖片相關關鍵字（可以根據需要擴展）
    const imageKeywords = ['圖片', '照片', '顏色', '外觀', '設計', '造型'];
    const hasImageContent = imageKeywords.some(keyword => text.includes(keyword));
    
    if (hasImageContent) {
        rangeId = 20;
    }
    
    console.log(`選擇 rangeId: ${rangeId} (文字: ${text.substring(0, 20)}...)`);
    return rangeId;
}

// 重置處理狀態
function resetProcessingState() {
    console.log('重置處理狀態');
    isProcessing = false;
    if (sendBtn) {
        sendBtn.disabled = false;
        sendBtn.style.opacity = '1';
        sendBtn.style.pointerEvents = 'auto';
        sendBtn.textContent = '發送'; // 重置按鈕文字
        console.log('發送按鈕已重新啟用');
    }
}

// 強制重置所有狀態 - 全域可用
window.forceReset = function() {
    console.log('強制重置所有狀態');
    isProcessing = false;
    if (sendBtn) {
        sendBtn.disabled = false;
        sendBtn.style.opacity = '1';
        sendBtn.style.pointerEvents = 'auto';
    }
    updateStatus('已強制重置，可以繼續對話', 'success');
    return '狀態已重置';
};

// 更新狀態顯示
function updateStatus(message, type = 'info') {
    status.textContent = message;
    status.className = `status ${type}`;
    console.log(`狀態: ${message}`);
}

// 隱藏快速問題卡片
function hideQuickQuestions() {
    const quickQuestions = document.querySelector('.quick-questions');
    if (quickQuestions) {
        quickQuestions.style.display = 'none';
    }
}

// 顯示歡迎訊息
function showWelcomeMessage() {
    const welcomeText = "您好！我是達輝虛擬助理，請選擇對話模式並開始聊天！";
    
    console.log('顯示歡迎訊息:', welcomeText);
    
    // 添加歡迎文字
    addMessage(welcomeText, 'bot');
    
    // 如果音訊已經啟用，直接播放語音
    if (hasUserInteracted) {
        console.log('音訊已啟用，直接播放歡迎語音');
        setTimeout(() => {
            playWelcomeMessage();
        }, 500);
    } else {
        // 如果音訊未啟用，顯示啟用按鈕
        console.log('音訊未啟用，顯示啟用按鈕');
        pendingWelcomeMessage = true;
        addEnableAudioButton();
        updateStatus('點擊「啟用語音」按鈕開始語音互動', 'info');
    }
}

// 添加啟用語音按鈕
function addEnableAudioButton() {
    const buttonDiv = document.createElement('div');
    buttonDiv.className = 'message bot-message';
    buttonDiv.id = 'enable-audio-message';
    
    buttonDiv.innerHTML = `
        <div class="message-content">
            <button id="enable-audio-btn" class="enable-audio-btn">
                🔊 啟用語音功能
            </button>
            <p style="font-size: 12px; color: #666; margin-top: 8px;">
                點擊此按鈕允許瀏覽器播放音訊
            </p>
        </div>
    `;
    
    conversation.appendChild(buttonDiv);
    conversation.scrollTop = conversation.scrollHeight;
    
    // 添加按鈕點擊事件
    const enableBtn = document.getElementById('enable-audio-btn');
    enableBtn.addEventListener('click', function() {
        handleFirstUserInteraction();
        
        // 移除啟用按鈕
        const buttonMessage = document.getElementById('enable-audio-message');
        if (buttonMessage) {
            buttonMessage.remove();
        }
        
        // 更新狀態
        updateStatus('語音功能已啟用！', 'success');
        
        // 立即播放歡迎語音
        if (pendingWelcomeMessage) {
            pendingWelcomeMessage = false;
            setTimeout(() => {
                playWelcomeMessage();
            }, 300);
        }
    });
}

// 播放歡迎訊息（有語音）
async function playWelcomeMessage() {
    const welcomeText = "您好！我是達輝虛擬助理，請選擇對話模式並開始聊天！";
    
    console.log('播放歡迎訊息:', welcomeText);
    
    try {
        // 直接調用語音播放
        await handleVoiceResponse(welcomeText);
        
        console.log('歡迎訊息播放完成');
        
    } catch (error) {
        console.error('播放歡迎訊息失敗:', error);
        updateStatus('歡迎訊息播放失敗', 'error');
    }
}

// 處理用戶第一次互動
function handleFirstUserInteraction() {
    if (!hasUserInteracted) {
        hasUserInteracted = true;
        console.log('用戶首次互動，啟用語音功能');
        
        // 如果有待播放的歡迎訊息，現在播放
        if (pendingWelcomeMessage) {
            pendingWelcomeMessage = false;
            setTimeout(() => {
                playWelcomeMessage();
            }, 500); // 短暫延遲讓用戶看到互動效果
        }
    }
}

// 工具函數：安全的 JSON 解析
function safeJsonParse(str, defaultValue = null) {
    try {
        return JSON.parse(str);
    } catch (error) {
        console.error('JSON 解析錯誤:', error);
        return defaultValue;
    }
}

// 導出到全域（用於調試）
window.app = {
    currentMode,
    avatar,
    isAvatarReady,
    switchMode,
    handleSendMessage,
    updateStatus,
    // 手動隱藏覆蓋層的函數（測試用）
    hideCover: function() {
        console.log('手動隱藏覆蓋層測試');
        const cover = document.getElementById('startup-cover');
        if (cover) {
            cover.style.display = 'none';
            cover.style.visibility = 'hidden';
            cover.style.opacity = '0';
            cover.style.zIndex = '-1';
            console.log('覆蓋層應該已隱藏');
            return true;
        } else {
            console.log('找不到覆蓋層元素');
            return false;
        }
    },
    // 顯示覆蓋層的函數（測試用）
    showCover: function() {
        console.log('手動顯示覆蓋層測試');
        const cover = document.getElementById('startup-cover');
        if (cover) {
            cover.style.display = 'flex';
            cover.style.visibility = 'visible';
            cover.style.opacity = '1';
            cover.style.zIndex = '999999';
            console.log('覆蓋層應該已顯示');
            return true;
        } else {
            console.log('找不到覆蓋層元素');
            return false;
        }
    }
};

// Toyota 風格 3 秒倒數計時初始化
function initStartupCountdown() {
    let countdown = 3;
    const startButton = document.getElementById('start-button');
    
    // 清理任何現有的計時器
    if (window.okButtonInterval) {
        clearInterval(window.okButtonInterval);
    }
    
    console.log('啟動 Toyota 風格 3 秒倒數計時');
    
    // 開始倒數計時
    window.okButtonInterval = setInterval(() => {
        startButton.textContent = `開始使用 (${countdown})`;
        
        if (countdown === 0) {
            clearInterval(window.okButtonInterval);
            startButton.textContent = "開始使用";
            startButton.classList.remove('ok-button-disabled');
            console.log('倒數計時完成，按鈕已啟用');
        }
        
        if (countdown > 0) {
            countdown--;
        }
    }, 1000);
}

console.log('AI 虛擬助理應用載入完成');
