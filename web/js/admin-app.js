/**
 * 序號管理系統 - 管理員介面 Vue.js 應用
 */

const { createApp } = Vue;

createApp({
    data() {
        return {
            // 認證狀態
            isLoggedIn: false,
            adminCode: '',
            loginError: '',
            isLoggingIn: false,
            
            // 主介面狀態
            activeTab: 'codes',
            
            // 序號管理
            codes: [],
            isLoadingCodes: false,
            codeSearch: '',
            
            // 使用記錄
            logs: [],
            isLoadingLogs: false,
            selectedLogCode: '',
            
            // 模態框狀態
            showCreateModal: false,
            showGenerateModal: false,
            showDetailsModal: false,
            
            // 創建序號
            newCode: {
                code: '',
                type: 'one_time',
                description: '',
                generateMode: 'custom'  // 'custom' 或 'random'
            },
            isCreating: false,
            createError: '',
            
            // 生成序號（保留舊的，但不再使用）
            generateCode: {
                type: 'one_time',
                description: ''
            },
            isGenerating: false,
            generateError: '',
            
            // 詳情顯示
            selectedItem: null,
            detailsType: 'code', // 'code' 或 'log'
            
            // 訊息提示
            successMessage: '',
            
            // API 基礎 URL
            API_BASE_URL: window.location.origin
        };
    },
    
    computed: {
        // 統計數據
        stats() {
            const total = this.codes.length;
            const available = this.codes.filter(code => 
                code.type === 'permanent' || !code.is_used
            ).length;
            const used = this.codes.filter(code => 
                code.type === 'one_time' && code.is_used
            ).length;
            const permanent = this.codes.filter(code => 
                code.type === 'permanent'
            ).length;
            
            return { total, available, used, permanent };
        },
        
        // 過濾後的序號列表
        filteredCodes() {
            // 過濾掉管理員序號
            let filteredCodes = this.codes.filter(code => 
                !this.isProtectedCode(code.code)
            );
            
            if (!this.codeSearch) return filteredCodes;
            
            const search = this.codeSearch.toLowerCase();
            return filteredCodes.filter(code => 
                code.code.toLowerCase().includes(search) ||
                (code.description && code.description.toLowerCase().includes(search))
            );
        },
        
        // 非管理員序號統計
        nonAdminStats() {
            const nonAdminCodes = this.codes.filter(code => 
                !this.isProtectedCode(code.code)
            );
            
            const total = nonAdminCodes.length;
            const available = nonAdminCodes.filter(code => 
                code.type === 'permanent' || !code.is_used
            ).length;
            const used = nonAdminCodes.filter(code => 
                code.type === 'one_time' && code.is_used
            ).length;
            const permanent = nonAdminCodes.filter(code => 
                code.type === 'permanent'
            ).length;
            
            return { total, available, used, permanent };
        }
    },
    
    mounted() {
        // 檢查是否已登入（從 localStorage 恢復狀態）
        const savedAdminCode = localStorage.getItem('adminCode');
        if (savedAdminCode) {
            this.adminCode = savedAdminCode;
            this.validateAndLogin();
        }
    },
    
    methods: {
        // 登入相關
        async login() {
            if (!this.adminCode.trim()) {
                this.loginError = '請輸入管理員序號';
                return;
            }
            
            this.isLoggingIn = true;
            this.loginError = '';
            
            try {
                // 驗證管理員序號（通過獲取序號列表來驗證）
                const response = await fetch(`${this.API_BASE_URL}/api/admin/codes?admin_code=${this.adminCode}`);
                
                if (response.ok) {
                    const data = await response.json();
                    if (data.success) {
                        this.isLoggedIn = true;
                        localStorage.setItem('adminCode', this.adminCode);
                        this.codes = data.codes;
                        this.showSuccess('登入成功！');
                    } else {
                        this.loginError = '無效的管理員序號';
                    }
                } else {
                    this.loginError = '登入失敗，請檢查序號';
                }
            } catch (error) {
                console.error('登入錯誤:', error);
                this.loginError = '登入失敗，請檢查網路連接';
            } finally {
                this.isLoggingIn = false;
            }
        },
        
        async validateAndLogin() {
            try {
                const response = await fetch(`${this.API_BASE_URL}/api/admin/codes?admin_code=${this.adminCode}`);
                if (response.ok) {
                    const data = await response.json();
                    if (data.success) {
                        this.isLoggedIn = true;
                        this.codes = data.codes;
                    }
                }
            } catch (error) {
                console.error('自動登入失敗:', error);
                localStorage.removeItem('adminCode');
            }
        },
        
        logout() {
            this.isLoggedIn = false;
            this.adminCode = '';
            localStorage.removeItem('adminCode');
            this.codes = [];
            this.logs = [];
        },
        
        // 序號管理
        async loadCodes() {
            this.isLoadingCodes = true;
            try {
                const response = await fetch(`${this.API_BASE_URL}/api/admin/codes?admin_code=${this.adminCode}`);
                if (response.ok) {
                    const data = await response.json();
                    if (data.success) {
                        this.codes = data.codes;
                    }
                }
            } catch (error) {
                console.error('載入序號失敗:', error);
            } finally {
                this.isLoadingCodes = false;
            }
        },
        
        // 統一的創建序號方法
        async createCode() {
            // 檢查序號數量限制
            if (this.nonAdminStats.total >= 10) {
                this.createError = '序號數量已達上限（10筆），請先刪除一些序號';
                return;
            }
            
            // 有輸入就自定義，沒輸入就隨機生成
            if (this.newCode.code && this.newCode.code.trim()) {
                // 自定義序號
                await this.createCustomCode();
            } else {
                // 隨機生成
                await this.createRandomCode();
            }
        },
        
        async createCustomCode() {
            this.isCreating = true;
            this.createError = '';
            
            try {
                const response = await fetch(`${this.API_BASE_URL}/api/admin/create-custom-code`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        custom_code: this.newCode.code,
                        code_type: this.newCode.type,
                        description: this.newCode.description,
                        admin_code: this.adminCode
                    })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    this.showCreateModal = false;
                    this.resetNewCodeForm();
                    this.showSuccess('序號創建成功！');
                    await this.loadCodes();
                } else {
                    this.createError = data.message;
                }
            } catch (error) {
                console.error('創建序號失敗:', error);
                this.createError = '創建失敗，請檢查網路連接';
            } finally {
                this.isCreating = false;
            }
        },
        
        async createRandomCode() {
            this.isCreating = true;
            this.createError = '';
            
            try {
                const response = await fetch(`${this.API_BASE_URL}/api/admin/generate-code`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        code_type: this.newCode.type,
                        description: this.newCode.description,
                        admin_code: this.adminCode
                    })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    this.showCreateModal = false;
                    this.resetNewCodeForm();
                    this.showSuccess(`序號生成成功：${data.code}`);
                    await this.loadCodes();
                } else {
                    this.createError = data.message;
                }
            } catch (error) {
                console.error('生成序號失敗:', error);
                this.createError = '生成失敗，請檢查網路連接';
            } finally {
                this.isCreating = false;
            }
        },
        
        async generateRandomCode() {
            this.isGenerating = true;
            this.generateError = '';
            
            try {
                const response = await fetch(`${this.API_BASE_URL}/api/admin/generate-code`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        code_type: this.generateCode.type,
                        description: this.generateCode.description,
                        admin_code: this.adminCode
                    })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    this.showGenerateModal = false;
                    this.generateCode = { type: 'one_time', description: '' };
                    this.showSuccess(`序號生成成功：${data.code}`);
                    await this.loadCodes();
                } else {
                    this.generateError = data.message;
                }
            } catch (error) {
                console.error('生成序號失敗:', error);
                this.generateError = '生成失敗，請檢查網路連接';
            } finally {
                this.isGenerating = false;
            }
        },
        
        async resetCode(code) {
            if (!confirm(`確定要重置序號 ${code} 嗎？`)) return;
            
            try {
                const response = await fetch(`${this.API_BASE_URL}/api/admin/reset-code`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        code_to_reset: code,
                        admin_code: this.adminCode
                    })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    this.showSuccess('序號重置成功！');
                    await this.loadCodes();
                } else {
                    alert(`重置失敗：${data.message}`);
                }
            } catch (error) {
                console.error('重置序號失敗:', error);
                alert('重置失敗，請檢查網路連接');
            }
        },
        
        async deleteCode(code) {
            if (!confirm(`確定要刪除序號 ${code} 嗎？此操作無法撤銷！`)) return;
            
            try {
                const response = await fetch(`${this.API_BASE_URL}/api/admin/delete-code`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        code_to_delete: code,
                        admin_code: this.adminCode
                    })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    this.showSuccess('序號刪除成功！');
                    await this.loadCodes();
                } else {
                    alert(`刪除失敗：${data.message}`);
                }
            } catch (error) {
                console.error('刪除序號失敗:', error);
                alert('刪除失敗，請檢查網路連接');
            }
        },
        
        // 使用記錄
        async loadLogs() {
            this.isLoadingLogs = true;
            try {
                let url = `${this.API_BASE_URL}/api/admin/logs?admin_code=${this.adminCode}`;
                if (this.selectedLogCode) {
                    url += `&access_code=${this.selectedLogCode}`;
                }
                
                const response = await fetch(url);
                if (response.ok) {
                    const data = await response.json();
                    if (data.success) {
                        this.logs = data.logs;
                    }
                }
            } catch (error) {
                console.error('載入記錄失敗:', error);
            } finally {
                this.isLoadingLogs = false;
            }
        },
        
        // 導出對話記錄
        exportLogs() {
            if (this.logs.length === 0) {
                alert('沒有記錄可以導出');
                return;
            }
            
            try {
                // 準備 CSV 數據
                const headers = ['時間', '序號', '品牌', 'IP地址', '用戶代理', '用戶訊息', 'AI回應'];
                const csvContent = [
                    headers.join(','),
                    ...this.logs.map(log => [
                        `"${this.formatDate(log.timestamp)}"`,
                        `"${log.access_code}"`,
                        `"${log.brand}"`,
                        `"${log.ip_address}"`,
                        `"${log.user_agent || ''}"`,
                        `"${(log.user_message || '').replace(/"/g, '""')}"`,
                        `"${(log.bot_response || '').replace(/"/g, '""')}"`
                    ].join(','))
                ].join('\n');
                
                // 創建並下載文件
                const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement('a');
                const url = URL.createObjectURL(blob);
                link.setAttribute('href', url);
                
                // 生成文件名
                const now = new Date();
                const dateStr = now.toISOString().slice(0, 10);
                const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '-');
                const filename = `對話記錄_${dateStr}_${timeStr}.csv`;
                
                link.setAttribute('download', filename);
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                this.showSuccess('對話記錄導出成功！');
            } catch (error) {
                console.error('導出失敗:', error);
                alert('導出失敗，請稍後再試');
            }
        },
        
        // 詳情顯示
        viewCodeDetails(code) {
            this.selectedItem = code;
            this.detailsType = 'code';
            this.showDetailsModal = true;
        },
        
        viewLogDetails(log) {
            this.selectedItem = log;
            this.detailsType = 'log';
            this.showDetailsModal = true;
        },
        
        // 輔助函數
        getStatusClass(code) {
            if (code.type === 'permanent') return 'status-permanent';
            return code.is_used ? 'status-used' : 'status-available';
        },
        
        getStatusText(code) {
            if (code.type === 'permanent') return '永久有效';
            return code.is_used ? '已使用' : '可用';
        },
        
        isProtectedCode(code) {
            // 保護管理員序號不被刪除 - 從環境變數獲取
            return code === 'ai360' || code === 'ADMIN2024TEST';
        },
        
        formatDate(dateString) {
            if (!dateString) return '-';
            try {
                const date = new Date(dateString);
                return date.toLocaleString('zh-TW', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            } catch (error) {
                return dateString;
            }
        },
        
        truncateText(text, maxLength) {
            if (!text) return '-';
            if (text.length <= maxLength) return text;
            return text.substring(0, maxLength) + '...';
        },
        
        showSuccess(message) {
            this.successMessage = message;
            setTimeout(() => {
                this.successMessage = '';
            }, 3000);
        },
        
        // 複製到剪貼簿
        async copyToClipboard(text) {
            try {
                // 使用現代 Clipboard API
                if (navigator.clipboard && window.isSecureContext) {
                    await navigator.clipboard.writeText(text);
                    this.showSuccess(`序號 ${text} 已複製到剪貼簿！`);
                } else {
                    // 降級方案：使用傳統方法
                    const textArea = document.createElement('textarea');
                    textArea.value = text;
                    textArea.style.position = 'fixed';
                    textArea.style.left = '-999999px';
                    textArea.style.top = '-999999px';
                    document.body.appendChild(textArea);
                    textArea.focus();
                    textArea.select();
                    
                    try {
                        document.execCommand('copy');
                        this.showSuccess(`序號 ${text} 已複製到剪貼簿！`);
                    } catch (err) {
                        console.error('複製失敗:', err);
                        // 顯示序號讓用戶手動複製
                        alert(`請手動複製序號：${text}`);
                    } finally {
                        document.body.removeChild(textArea);
                    }
                }
            } catch (err) {
                console.error('複製到剪貼簿失敗:', err);
                // 顯示序號讓用戶手動複製
                alert(`請手動複製序號：${text}`);
            }
        },
        
        // 重置表單
        resetNewCodeForm() {
            this.newCode = {
                code: '',
                type: 'one_time',
                description: '',
                generateMode: 'custom'
            };
        },
        
        // 生成模式變更處理
        onGenerateModeChange() {
            if (this.newCode.generateMode === 'random') {
                this.newCode.code = '';
            }
            this.createError = '';
        }
    },
    
    watch: {
        // 當切換到使用記錄分頁時自動載入
        activeTab(newTab) {
            if (newTab === 'logs' && this.logs.length === 0) {
                this.loadLogs();
            }
        }
    }
}).mount('#app');
