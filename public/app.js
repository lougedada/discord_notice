// 全局变量
let webhooks = [];
let messages = [];

// DOM元素
const elements = {
    totalWebhooks: document.getElementById('totalWebhooks'),
    totalMessages: document.getElementById('totalMessages'),
    successRate: document.getElementById('successRate'),
    activeWebhooks: document.getElementById('activeWebhooks'),
    webhooksList: document.getElementById('webhooksList'),
    sendWebhookSelect: document.getElementById('sendWebhookSelect'),
    messageType: document.getElementById('messageType'),
    textMessageForm: document.getElementById('textMessageForm'),
    embedMessageForm: document.getElementById('embedMessageForm'),
    fileMessageForm: document.getElementById('fileMessageForm'),
    messageHistory: document.getElementById('messageHistory'),
    historyWebhookFilter: document.getElementById('historyWebhookFilter'),
    currentTime: document.getElementById('currentTime')
};

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    checkAuth().then(() => {
        initializeApp();
        
        // 等待组件初始化完成
        if (window.antdReady) {
            setupEventListeners();
        } else {
            window.addEventListener('antdReady', function() {
                setupEventListeners();
            });
        }
        
        updateTime();
        setInterval(updateTime, 1000);
    });
});

// 检查登录状态
async function checkAuth() {
    try {
        const response = await fetch('/api/user', {
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            document.getElementById('currentUser').textContent = data.user.username;
            return true;
        } else {
            // 未登录，跳转到登录页面
            window.location.href = '/login';
            return false;
        }
    } catch (error) {
        console.error('检查登录状态失败:', error);
        window.location.href = '/login';
        return false;
    }
}

// 登出
async function logout() {
    try {
        await fetch('/api/logout', {
            method: 'POST',
            credentials: 'include'
        });
        window.location.href = '/login';
    } catch (error) {
        console.error('登出失败:', error);
        showToast('登出失败', 'error');
    }
}

// 修改密码
async function changePassword() {
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    if (!currentPassword || !newPassword || !confirmPassword) {
        showToast('请填写所有字段', 'warning');
        return Promise.reject(); // 阻止模态框关闭
    }
    
    if (newPassword !== confirmPassword) {
        showToast('新密码与确认密码不匹配', 'warning');
        return Promise.reject(); // 阻止模态框关闭
    }
    
    if (newPassword.length < 6) {
        showToast('新密码长度至少6位', 'warning');
        return Promise.reject(); // 阻止模态框关闭
    }
    
    try {
        const response = await apiCall('/api/change-password', {
            method: 'POST',
            body: JSON.stringify({
                currentPassword,
                newPassword
            })
        });
        
        if (response.success) {
            showToast('密码修改成功', 'success');
            return Promise.resolve(); // 允许模态框关闭
        }
    } catch (error) {
        showToast('修改密码失败: ' + error.message, 'error');
        return Promise.reject(); // 阻止模态框关闭
    }
}

// 初始化应用
async function initializeApp() {
    await loadProxyConfig();
    await loadWebhooks();
    await loadMessages();
    await loadStats();
    updateWebhookSelects();
}

// 显示添加Webhook模态框
function showAddWebhookModal() {
    // 检查组件是否已初始化
    if (!window.antdReady || typeof window.Modal === 'undefined' || !window.Modal) {
        showToast('系统正在初始化，请稍后再试', 'warning');
        return;
    }

    // 创建模态框容器
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = `
        <div class="ant-modal-mask" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.45); z-index: 1000;"></div>
        <div class="ant-modal-wrap" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 1000; display: flex; align-items: center; justify-content: center;">
            <div class="ant-modal" style="width: 600px; background: white; border-radius: 8px; box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12); position: relative;">
                <div class="ant-modal-content">
                    <div class="ant-modal-header" style="padding: 16px 24px; border-bottom: 1px solid #f0f0f0;">
                        <div class="ant-modal-title" style="font-size: 16px; font-weight: 600; color: rgba(0, 0, 0, 0.85);">添加Webhook</div>
                        <button class="ant-modal-close" id="closeModalBtn" style="position: absolute; top: 12px; right: 12px; background: none; border: none; font-size: 16px; cursor: pointer; padding: 8px; color: rgba(0, 0, 0, 0.45);">×</button>
                    </div>
                    <div class="ant-modal-body" style="padding: 24px;">
                        <form id="addWebhookForm">
                            <div style="margin-bottom: 16px;">
                                <label style="display: block; margin-bottom: 4px; font-weight: 500; color: rgba(0, 0, 0, 0.85);">名称</label>
                                <input type="text" class="ant-input" id="webhookName" required style="width: 100%; height: 32px; padding: 4px 11px; border: 1px solid #d9d9d9; border-radius: 6px; font-size: 14px;" placeholder="输入Webhook名称">
                            </div>
                            <div style="margin-bottom: 16px;">
                                <label style="display: block; margin-bottom: 4px; font-weight: 500; color: rgba(0, 0, 0, 0.85);">Webhook URL</label>
                                <input type="url" class="ant-input" id="webhookUrl" required style="width: 100%; height: 32px; padding: 4px 11px; border: 1px solid #d9d9d9; border-radius: 6px; font-size: 14px;" placeholder="https://discord.com/api/webhooks/...">
                            </div>
                            <div style="margin-bottom: 16px;">
                                <label style="display: block; margin-bottom: 4px; font-weight: 500; color: rgba(0, 0, 0, 0.85);">描述（可选）</label>
                                <textarea class="ant-input" id="webhookDescription" rows="3" style="width: 100%; padding: 8px 11px; border: 1px solid #d9d9d9; border-radius: 6px; resize: vertical; font-size: 14px;" placeholder="输入描述信息"></textarea>
                            </div>
                        </form>
                    </div>
                    <div class="ant-modal-footer" style="padding: 10px 16px; text-align: right; border-top: 1px solid #f0f0f0;">
                        <button class="ant-btn" id="cancelBtn" style="margin-right: 8px; height: 32px; padding: 4px 15px; border: 1px solid #d9d9d9; border-radius: 6px; background: white; color: rgba(0, 0, 0, 0.85); cursor: pointer;">取消</button>
                        <button class="ant-btn ant-btn-primary" id="saveBtn" style="height: 32px; padding: 4px 15px; border: 1px solid #1890ff; border-radius: 6px; background: #1890ff; color: white; cursor: pointer;">保存</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // 添加到页面
    document.body.appendChild(modalContainer);

    // 绑定事件
    const closeModal = () => {
        document.body.removeChild(modalContainer);
    };

    document.getElementById('closeModalBtn').addEventListener('click', closeModal);
    document.getElementById('cancelBtn').addEventListener('click', closeModal);
    modalContainer.querySelector('.ant-modal-mask').addEventListener('click', closeModal);
    
    document.getElementById('saveBtn').addEventListener('click', async () => {
        const name = document.getElementById('webhookName').value;
        const url = document.getElementById('webhookUrl').value;
        const description = document.getElementById('webhookDescription').value;
        
        if (!name || !url) {
            showToast('请填写必要信息', 'warning');
            return;
        }
        
        // 显示加载状态
        const saveBtn = document.getElementById('saveBtn');
        saveBtn.innerHTML = '保存中...';
        saveBtn.disabled = true;
        
        try {
            await apiCall('/api/webhooks', {
                method: 'POST',
                body: JSON.stringify({ name, webhookUrl: url, description })
            });
            
            closeModal();
            await loadWebhooks();
            await loadStats();
            updateWebhookSelects();
            showToast('Webhook添加成功', 'success');
        } catch (error) {
            showToast('添加Webhook失败: ' + error.message, 'error');
            saveBtn.innerHTML = '保存';
            saveBtn.disabled = false;
        }
    });

    // 聚焦到名称输入框
    setTimeout(() => {
        document.getElementById('webhookName').focus();
    }, 100);
}

// 设置事件监听器
function setupEventListeners() {
    // Webhook管理
    const addWebhookBtn = document.getElementById('addWebhookBtn');
    
    if (addWebhookBtn) {
        addWebhookBtn.addEventListener('click', showAddWebhookModal);
    }
    
    // 消息发送
    document.getElementById('messageType').addEventListener('change', toggleMessageForms);
    document.getElementById('sendMessageBtn').addEventListener('click', sendMessage);
    document.getElementById('previewMessageBtn').addEventListener('click', previewMessage);
    
    // 文件上传
    setupFileUpload();
    
    // 快速操作
    document.getElementById('quickTestBtn').addEventListener('click', testAllWebhooks);
    document.getElementById('refreshStatsBtn').addEventListener('click', refreshStats);
    document.getElementById('exportDataBtn').addEventListener('click', exportData);
    document.getElementById('clearHistoryBtn').addEventListener('click', clearHistory);
    
    // 历史过滤
    document.getElementById('historyWebhookFilter').addEventListener('change', filterMessageHistory);
    
    // 代理设置
    document.getElementById('saveProxyBtn').addEventListener('click', saveProxyConfig);
    document.getElementById('testProxyBtn').addEventListener('click', testProxyConnection);
    document.getElementById('proxyEnabled').addEventListener('change', toggleProxySettings);
    
    // 用户管理
    document.getElementById('logoutBtn').addEventListener('click', logout);
    // 注意：savePasswordBtn 已经被移除，现在通过模态框的onOk处理
}

// 更新时间显示
function updateTime() {
    const now = new Date();
    elements.currentTime.textContent = now.toLocaleString('zh-CN');
}

// 显示提示消息 - 直接实现自定义toast
function showToast(msg, type = 'info') {
    const toast = document.createElement('div');
    const colors = {
        success: { bg: '#f6ffed', border: '#b7eb8f', text: '#52c41a' },
        error: { bg: '#fff2f0', border: '#ffccc7', text: '#ff4d4f' },
        warning: { bg: '#fffbe6', border: '#ffe58f', text: '#faad14' },
        info: { bg: '#e6f7ff', border: '#91d5ff', text: '#1890ff' }
    };
    
    const color = colors[type] || colors.info;
    
    toast.style.cssText = `
        position: fixed;
        top: 24px;
        left: 50%;
        transform: translateX(-50%);
        background: ${color.bg};
        border: 1px solid ${color.border};
        color: ${color.text};
        padding: 12px 16px;
        border-radius: 6px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 10000;
        font-size: 14px;
        max-width: 300px;
        animation: slideInDown 0.3s ease-out;
    `;
    
    toast.textContent = msg;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOutUp 0.3s ease-in';
        setTimeout(() => {
            if (document.body.contains(toast)) {
                document.body.removeChild(toast);
            }
        }, 300);
    }, 3000);
}



// API调用函数
async function apiCall(url, options = {}) {
    try {
        const response = await fetch(url, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            credentials: 'include',
            ...options
        });
        
        if (!response.ok) {
            const error = await response.json();
            
            // 如果是401未授权，跳转到登录页面
            if (response.status === 401 && error.needLogin) {
                window.location.href = '/login';
                return;
            }
            
            throw new Error(error.error || `HTTP ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('API调用失败:', error);
        throw error;
    }
}

// 加载Webhook列表
async function loadWebhooks() {
    try {
        webhooks = await apiCall('/api/webhooks');
        renderWebhooksList();
    } catch (error) {
        showToast('加载Webhook列表失败: ' + error.message, 'error');
    }
}

// 渲染Webhook列表
function renderWebhooksList() {
    const container = elements.webhooksList;
    
    if (webhooks.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="text-align: center; padding: 60px 40px; color: #666; background: white; border-radius: 12px; border: 1px solid #f0f0f0;">
                <div style="font-size: 64px; margin-bottom: 20px; color: #d9d9d9;">📡</div>
                <h4 style="margin-bottom: 12px; color: #666; font-size: 18px; font-weight: 600;">还没有Webhook</h4>
                <p style="margin: 0; color: #999; font-size: 15px; line-height: 1.5;">点击"添加Webhook"按钮来添加第一个Webhook</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = webhooks.map(webhook => {
        // 格式化创建时间
        const createdTime = formatRelativeTime(webhook.createdAt);
        const messageCount = webhook.messageCount || 0;
        
        return `
        <div class="webhook-item" style="border: 1px solid #f0f0f0; border-radius: 12px; padding: 20px; margin-bottom: 16px; background: white; transition: all 0.3s ease; box-shadow: 0 2px 4px rgba(0,0,0,0.02);" onmouseover="this.style.boxShadow='0 4px 12px rgba(0,0,0,0.08)'; this.style.transform='translateY(-1px)';" onmouseout="this.style.boxShadow='0 2px 4px rgba(0,0,0,0.02)'; this.style.transform='translateY(0)';">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div style="flex: 1; min-width: 0;">
                    <div style="display: flex; align-items: center; margin-bottom: 12px; flex-wrap: wrap; gap: 12px;">
                        <h5 style="margin: 0; font-size: 18px; font-weight: 600; color: #1f1f1f; line-height: 1.2;">${webhook.name}</h5>
                        <span style="display: inline-flex; align-items: center; padding: 4px 12px; border-radius: 16px; font-size: 13px; font-weight: 500; ${webhook.isActive ? 'background: #f6ffed; color: #52c41a; border: 1px solid #b7eb8f;' : 'background: #f5f5f5; color: #8c8c8c; border: 1px solid #d9d9d9;'}">
                            <span style="width: 8px; height: 8px; border-radius: 50%; margin-right: 6px; ${webhook.isActive ? 'background: #52c41a;' : 'background: #8c8c8c;'}"></span>
                            ${webhook.isActive ? '活跃' : '禁用'}
                        </span>
                    </div>
                    ${webhook.description ? `
                        <p style="margin: 0 0 12px 0; color: #666; font-size: 15px; line-height: 1.5; word-break: break-all;">${webhook.description}</p>
                    ` : ''}
                    <div style="display: flex; align-items: center; gap: 20px; font-size: 13px; color: #999;">
                        <span style="display: flex; align-items: center;">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 6px;">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                            </svg>
                            创建于 ${createdTime}
                        </span>
                        <span style="display: flex; align-items: center;">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 6px;">
                                <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                            </svg>
                            ${messageCount} 条消息
                        </span>
                    </div>
                </div>
                <div style="display: flex; gap: 10px; margin-left: 20px; flex-shrink: 0;">
                    <button onclick="testWebhook('${webhook.id}')" title="测试Webhook" style="padding: 8px 16px; border: 1px solid #1890ff; background: white; color: #1890ff; border-radius: 8px; font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.2s; min-width: 60px;" onmouseover="this.style.background='#1890ff'; this.style.color='white'; this.style.transform='translateY(-1px)';" onmouseout="this.style.background='white'; this.style.color='#1890ff'; this.style.transform='translateY(0)';">
                        测试
                    </button>
                    <button onclick="editWebhook('${webhook.id}')" title="编辑Webhook" style="padding: 8px 16px; border: 1px solid #d9d9d9; background: white; color: #666; border-radius: 8px; font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.2s; min-width: 60px;" onmouseover="this.style.background='#f5f5f5'; this.style.borderColor='#bfbfbf'; this.style.transform='translateY(-1px)';" onmouseout="this.style.background='white'; this.style.borderColor='#d9d9d9'; this.style.transform='translateY(0)';">
                        编辑
                    </button>
                    <button onclick="deleteWebhook('${webhook.id}')" title="删除Webhook" style="padding: 8px 16px; border: 1px solid #ff4d4f; background: white; color: #ff4d4f; border-radius: 8px; font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.2s; min-width: 60px;" onmouseover="this.style.background='#ff4d4f'; this.style.color='white'; this.style.transform='translateY(-1px)';" onmouseout="this.style.background='white'; this.style.color='#ff4d4f'; this.style.transform='translateY(0)';">
                        删除
                    </button>
                </div>
            </div>
        </div>
        `;
    }).join('');
}



// 编辑Webhook
function editWebhook(id) {
    const webhook = webhooks.find(w => w.id === id);
    if (!webhook) return;
    
    // 检查Ant Design组件是否已初始化
    if (!window.antdReady || typeof window.Modal === 'undefined' || !window.Modal) {
        showToast('系统正在初始化，请稍后再试', 'warning');
        return;
    }

    // 创建模态框容器
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = `
        <div class="ant-modal-mask" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.45); z-index: 1000;"></div>
        <div class="ant-modal-wrap" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 1000; display: flex; align-items: center; justify-content: center;">
            <div class="ant-modal" style="width: 600px; background: white; border-radius: 8px; box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12); position: relative;">
                <div class="ant-modal-content">
                    <div class="ant-modal-header" style="padding: 16px 24px; border-bottom: 1px solid #f0f0f0;">
                        <div class="ant-modal-title" style="font-size: 16px; font-weight: 600; color: rgba(0, 0, 0, 0.85);">编辑Webhook</div>
                        <button class="ant-modal-close" id="closeModalBtn" style="position: absolute; top: 12px; right: 12px; background: none; border: none; font-size: 16px; cursor: pointer; padding: 8px; color: rgba(0, 0, 0, 0.45);">×</button>
                    </div>
                    <div class="ant-modal-body" style="padding: 24px;">
                        <form id="editWebhookForm">
                            <input type="hidden" id="editWebhookId" value="${webhook.id}">
                            <div style="margin-bottom: 16px;">
                                <label style="display: block; margin-bottom: 4px; font-weight: 500; color: rgba(0, 0, 0, 0.85);">名称</label>
                                <input type="text" class="ant-input" id="editWebhookName" value="${webhook.name}" required style="width: 100%; height: 32px; padding: 4px 11px; border: 1px solid #d9d9d9; border-radius: 6px; font-size: 14px;">
                            </div>
                            <div style="margin-bottom: 16px;">
                                <label style="display: block; margin-bottom: 4px; font-weight: 500; color: rgba(0, 0, 0, 0.85);">Webhook URL</label>
                                <input type="url" class="ant-input" id="editWebhookUrl" value="${webhook.webhookUrl}" required style="width: 100%; height: 32px; padding: 4px 11px; border: 1px solid #d9d9d9; border-radius: 6px; font-size: 14px;">
                            </div>
                            <div style="margin-bottom: 16px;">
                                <label style="display: block; margin-bottom: 4px; font-weight: 500; color: rgba(0, 0, 0, 0.85);">描述</label>
                                <textarea class="ant-input" id="editWebhookDescription" rows="3" style="width: 100%; padding: 8px 11px; border: 1px solid #d9d9d9; border-radius: 6px; resize: vertical; font-size: 14px;">${webhook.description || ''}</textarea>
                            </div>
                            <div style="margin-bottom: 16px;">
                                <label style="display: flex; align-items: center; cursor: pointer; color: rgba(0, 0, 0, 0.85);">
                                    <input type="checkbox" id="editWebhookActive" ${webhook.isActive ? 'checked' : ''} style="margin-right: 8px;">
                                    启用此Webhook
                                </label>
                            </div>
                        </form>
                    </div>
                    <div class="ant-modal-footer" style="padding: 10px 16px; text-align: right; border-top: 1px solid #f0f0f0;">
                        <button class="ant-btn" id="cancelBtn" style="margin-right: 8px; height: 32px; padding: 4px 15px; border: 1px solid #d9d9d9; border-radius: 6px; background: white; color: rgba(0, 0, 0, 0.85); cursor: pointer;">取消</button>
                        <button class="ant-btn ant-btn-primary" id="updateBtn" style="height: 32px; padding: 4px 15px; border: 1px solid #1890ff; border-radius: 6px; background: #1890ff; color: white; cursor: pointer;">更新</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // 添加到页面
    document.body.appendChild(modalContainer);

    // 绑定事件
    const closeModal = () => {
        document.body.removeChild(modalContainer);
    };

    document.getElementById('closeModalBtn').addEventListener('click', closeModal);
    document.getElementById('cancelBtn').addEventListener('click', closeModal);
    modalContainer.querySelector('.ant-modal-mask').addEventListener('click', closeModal);
    
    document.getElementById('updateBtn').addEventListener('click', async () => {
        const id = document.getElementById('editWebhookId').value;
        const name = document.getElementById('editWebhookName').value;
        const url = document.getElementById('editWebhookUrl').value;
        const description = document.getElementById('editWebhookDescription').value;
        const isActive = document.getElementById('editWebhookActive').checked;
        
        if (!name || !url) {
            showToast('请填写必要信息', 'warning');
            return;
        }
        
        // 显示加载状态
        const updateBtn = document.getElementById('updateBtn');
        updateBtn.innerHTML = '更新中...';
        updateBtn.disabled = true;
        
        try {
            await apiCall(`/api/webhooks/${id}`, {
                method: 'PUT',
                body: JSON.stringify({ name, webhookUrl: url, description, isActive })
            });
            
            closeModal();
            await loadWebhooks();
            await loadStats();
            updateWebhookSelects();
            showToast('Webhook更新成功', 'success');
        } catch (error) {
            showToast('更新Webhook失败: ' + error.message, 'error');
            updateBtn.innerHTML = '更新';
            updateBtn.disabled = false;
        }
    });

    // 聚焦到名称输入框
    setTimeout(() => {
        document.getElementById('editWebhookName').focus();
    }, 100);
}



// 删除Webhook
function deleteWebhook(id) {
    // 检查Ant Design组件是否已初始化
    if (!window.antdReady || typeof window.Modal === 'undefined' || !window.Modal) {
        const result = confirm('确定要删除这个Webhook吗？此操作不可恢复！');
        if (result) {
            performDeleteWebhook(id);
        }
        return;
    }

    // 创建确认对话框
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = `
        <div class="ant-modal-mask" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.45); z-index: 1000;"></div>
        <div class="ant-modal-wrap" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 1000; display: flex; align-items: center; justify-content: center;">
            <div class="ant-modal" style="width: 416px; background: white; border-radius: 8px; box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12); position: relative;">
                <div class="ant-modal-content">
                    <div class="ant-modal-body" style="padding: 32px 32px 24px;">
                        <div style="display: flex; align-items: flex-start;">
                            <div style="color: #faad14; font-size: 22px; margin-right: 16px; line-height: 1;">⚠️</div>
                            <div style="flex: 1;">
                                <div style="font-size: 16px; font-weight: 600; color: rgba(0, 0, 0, 0.85); margin-bottom: 8px;">确认删除</div>
                                <div style="color: rgba(0, 0, 0, 0.65);">确定要删除这个Webhook吗？此操作不可恢复！</div>
                            </div>
                        </div>
                    </div>
                    <div class="ant-modal-footer" style="padding: 10px 16px; text-align: right; border-top: 1px solid #f0f0f0;">
                        <button class="ant-btn" id="cancelBtn" style="margin-right: 8px; height: 32px; padding: 4px 15px; border: 1px solid #d9d9d9; border-radius: 6px; background: white; color: rgba(0, 0, 0, 0.85); cursor: pointer;">取消</button>
                        <button class="ant-btn ant-btn-danger" id="deleteBtn" style="height: 32px; padding: 4px 15px; border: 1px solid #ff4d4f; border-radius: 6px; background: #ff4d4f; color: white; cursor: pointer;">删除</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // 添加到页面
    document.body.appendChild(modalContainer);

    // 绑定事件
    const closeModal = () => {
        document.body.removeChild(modalContainer);
    };

    document.getElementById('cancelBtn').addEventListener('click', closeModal);
    modalContainer.querySelector('.ant-modal-mask').addEventListener('click', closeModal);
    
    document.getElementById('deleteBtn').addEventListener('click', async () => {
        closeModal();
        await performDeleteWebhook(id);
    });
}

// 执行删除Webhook操作
async function performDeleteWebhook(id) {
    try {
        await apiCall(`/api/webhooks/${id}`, { method: 'DELETE' });
        await loadWebhooks();
        await loadStats();
        updateWebhookSelects();
        showToast('Webhook删除成功', 'success');
    } catch (error) {
        showToast('删除Webhook失败: ' + error.message, 'error');
    }
}

// 测试Webhook
async function testWebhook(id) {
    try {
        const result = await apiCall(`/api/webhooks/${id}/test`, { method: 'POST' });
        showToast(result.message);
        await loadMessages();
        await loadStats();
    } catch (error) {
        showToast('测试Webhook失败: ' + error.message, 'error');
    }
}

// 更新Webhook选择器
function updateWebhookSelects() {
    const selects = [elements.sendWebhookSelect, elements.historyWebhookFilter];
    
    selects.forEach(select => {
        const currentValue = select.value;
        const isHistoryFilter = select === elements.historyWebhookFilter;
        
        select.innerHTML = isHistoryFilter ? 
            '<option value="">所有Webhook</option>' : 
            '<option value="">请选择Webhook</option>';
        
        webhooks.forEach(webhook => {
            const option = document.createElement('option');
            option.value = webhook.id;
            option.textContent = webhook.name;
            if (!webhook.isActive && !isHistoryFilter) {
                option.disabled = true;
                option.textContent += ' (禁用)';
            }
            select.appendChild(option);
        });
        
        select.value = currentValue;
    });
}

// 切换消息表单
function toggleMessageForms() {
    const type = elements.messageType.value;
    
    elements.textMessageForm.style.display = type === 'text' ? 'block' : 'none';
    elements.embedMessageForm.style.display = type === 'embed' ? 'block' : 'none';
    elements.fileMessageForm.style.display = type === 'file' ? 'block' : 'none';
}

// 设置文件上传
function setupFileUpload() {
    const uploadArea = document.getElementById('fileUploadArea');
    const fileInput = document.getElementById('fileUpload');
    const fileInfo = document.getElementById('fileInfo');
    const fileName = document.getElementById('fileName');
    const removeFile = document.getElementById('removeFile');
    
    uploadArea.addEventListener('click', () => fileInput.click());
    
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });
    
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            fileInput.files = files;
            showFileInfo(files[0]);
        }
    });
    
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            showFileInfo(e.target.files[0]);
        }
    });
    
    removeFile.addEventListener('click', () => {
        fileInput.value = '';
        fileInfo.style.display = 'none';
    });
    
    function showFileInfo(file) {
        fileName.textContent = `${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`;
        fileInfo.style.display = 'block';
    }
}

// 发送消息
async function sendMessage() {
    const webhookId = elements.sendWebhookSelect.value;
    const messageType = elements.messageType.value;
    
    if (!webhookId) {
        showToast('请选择Webhook', 'warning');
        return;
    }
    
    try {
        let result;
        
        if (messageType === 'text') {
            result = await sendTextMessage(webhookId);
        } else if (messageType === 'embed') {
            result = await sendEmbedMessage(webhookId);
        } else if (messageType === 'file') {
            result = await sendFileMessage(webhookId);
        }
        
        showToast(result.message);
        await loadMessages();
        await loadStats();
        clearMessageForm();
    } catch (error) {
        showToast('发送消息失败: ' + error.message, 'error');
    }
}

// 发送文本消息
async function sendTextMessage(webhookId) {
    const content = document.getElementById('messageContent').value;
    const username = document.getElementById('messageUsername').value;
    const avatarUrl = document.getElementById('messageAvatar').value;
    
    if (!content) {
        throw new Error('消息内容不能为空');
    }
    
    return await apiCall('/api/messages/send', {
        method: 'POST',
        body: JSON.stringify({ webhookId, content, username, avatarUrl })
    });
}

// 发送嵌入消息
async function sendEmbedMessage(webhookId) {
    const title = document.getElementById('embedTitle').value;
    const description = document.getElementById('embedDescription').value;
    const color = document.getElementById('embedColor').value;
    const author = document.getElementById('embedAuthor').value;
    
    if (!title && !description) {
        throw new Error('标题或描述不能为空');
    }
    
    const embed = {
        title: title || undefined,
        description: description || undefined,
        color: parseInt(color.replace('#', ''), 16),
        author: author ? { name: author } : undefined,
        timestamp: new Date().toISOString()
    };
    
    return await apiCall('/api/messages/send-embed', {
        method: 'POST',
        body: JSON.stringify({ webhookId, embed })
    });
}

// 发送文件消息
async function sendFileMessage(webhookId) {
    const fileInput = document.getElementById('fileUpload');
    const content = document.getElementById('fileContent').value;
    
    if (!fileInput.files.length) {
        throw new Error('请选择文件');
    }
    
    const formData = new FormData();
    formData.append('webhookId', webhookId);
    formData.append('file', fileInput.files[0]);
    if (content) formData.append('content', content);
    
    const response = await fetch('/api/messages/send-file', {
        method: 'POST',
        body: formData
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `HTTP ${response.status}`);
    }
    
    return await response.json();
}

// Markdown解析函数
function parseMarkdown(text) {
    if (!text) return '';
    
    // 转义HTML特殊字符
    text = text.replace(/&/g, '&amp;')
               .replace(/</g, '&lt;')
               .replace(/>/g, '&gt;')
               .replace(/"/g, '&quot;')
               .replace(/'/g, '&#39;');
    
    // 解析Markdown格式
    text = text
        // 代码块 ```
        .replace(/```([\s\S]*?)```/g, '<pre class="bg-dark text-light p-2 rounded"><code>$1</code></pre>')
        // 行内代码 `
        .replace(/`([^`]+)`/g, '<code class="bg-light px-1 rounded">$1</code>')
        // 粗体 **text**
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        // 斜体 *text*
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        // 删除线 ~~text~~
        .replace(/~~(.*?)~~/g, '<del>$1</del>')
        // 下划线 __text__
        .replace(/__(.*?)__/g, '<u>$1</u>')
        // 链接 [text](url)
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" class="text-decoration-none">$1</a>')
        // 图片 ![alt](url)
        .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="img-fluid rounded mt-2" style="max-width: 300px;">')
        // 标题 # ## ###
        .replace(/^### (.*$)/gm, '<h5 class="mt-2 mb-1">$1</h5>')
        .replace(/^## (.*$)/gm, '<h4 class="mt-2 mb-1">$1</h4>')
        .replace(/^# (.*$)/gm, '<h3 class="mt-2 mb-1">$1</h3>')
        // 引用 > text
        .replace(/^> (.*$)/gm, '<blockquote class="border-start border-3 ps-3 text-muted fst-italic">$1</blockquote>')
        // 列表项 - text 或 * text
        .replace(/^[-*] (.*$)/gm, '<li>$1</li>')
        // 数字列表 1. text
        .replace(/^\d+\. (.*$)/gm, '<li>$1</li>')
        // 水平线 ---
        .replace(/^---$/gm, '<hr class="my-2">')
        // 换行处理：双换行变成段落，单换行变成<br>
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>');
    
    // 包装列表项
    text = text.replace(/(<li>.*?<\/li>)/gs, (match) => {
        return '<ul class="mb-2">' + match + '</ul>';
    });
    
    // 如果有段落分隔，包装在<p>标签中
    if (text.includes('</p><p>')) {
        text = '<p>' + text + '</p>';
    }
    
    return text;
}

// 预览消息
function previewMessage() {
    const messageType = elements.messageType.value;
    const preview = document.getElementById('messagePreview');
    const content = document.getElementById('previewContent');
    
    let previewHTML = '';
    
    if (messageType === 'text') {
        const messageContent = document.getElementById('messageContent').value;
        const username = document.getElementById('messageUsername').value;
        const avatarUrl = document.getElementById('messageAvatar').value;
        
        // 解析Markdown格式
        const parsedContent = parseMarkdown(messageContent);
        
        previewHTML = `
            <div class="d-flex align-items-start">
                <img src="${avatarUrl || 'https://cdn.discordapp.com/embed/avatars/0.png'}" 
                     class="rounded-circle me-3" width="40" height="40">
                <div class="flex-grow-1">
                    <h6 class="mb-1">${username || 'Webhook'}</h6>
                    <div class="mb-0 discord-message-content">${parsedContent}</div>
                </div>
            </div>
        `;
    } else if (messageType === 'embed') {
        const title = document.getElementById('embedTitle').value;
        const description = document.getElementById('embedDescription').value;
        const color = document.getElementById('embedColor').value;
        const author = document.getElementById('embedAuthor').value;
        
        // 解析Markdown格式
        const parsedTitle = parseMarkdown(title);
        const parsedDescription = parseMarkdown(description);
        const parsedAuthor = parseMarkdown(author);
        
        previewHTML = `
            <div class="border-start" style="border-color: ${color} !important; border-width: 4px !important; padding-left: 1rem;">
                ${author ? `<div class="fw-bold mb-2 text-muted">${parsedAuthor}</div>` : ''}
                ${title ? `<h6 class="mb-2">${parsedTitle}</h6>` : ''}
                ${description ? `<div class="mb-0 discord-message-content">${parsedDescription}</div>` : ''}
            </div>
        `;
    } else if (messageType === 'file') {
        const fileInput = document.getElementById('fileUpload');
        const fileContent = document.getElementById('fileContent').value;
        
        // 解析Markdown格式
        const parsedContent = parseMarkdown(fileContent);
        
        previewHTML = `
            <div>
                ${fileContent ? `<div class="mb-2 discord-message-content">${parsedContent}</div>` : ''}
                ${fileInput.files.length ? 
                    `<div class="alert alert-info mb-0">
                        <i class="bi bi-file-earmark"></i> ${fileInput.files[0].name}
                        <small class="text-muted d-block">大小: ${(fileInput.files[0].size / 1024).toFixed(1)} KB</small>
                    </div>` : 
                    '<div class="alert alert-warning mb-0">请选择文件</div>'
                }
            </div>
        `;
    }
    
    content.innerHTML = previewHTML;
    preview.style.display = 'block';
}

// 清空消息表单
function clearMessageForm() {
    document.getElementById('messageContent').value = '';
    document.getElementById('messageUsername').value = '';
    document.getElementById('messageAvatar').value = '';
    
    document.getElementById('embedTitle').value = '';
    document.getElementById('embedDescription').value = '';
    document.getElementById('embedColor').value = '#0d6efd';
    document.getElementById('embedAuthor').value = '';
    
    document.getElementById('fileUpload').value = '';
    document.getElementById('fileContent').value = '';
    document.getElementById('fileInfo').style.display = 'none';
    
    document.getElementById('messagePreview').style.display = 'none';
}

// 加载消息历史
async function loadMessages() {
    try {
        const response = await apiCall('/api/messages?limit=100');
        messages = response.messages;
        renderMessageHistory();
    } catch (error) {
        showToast('加载消息历史失败: ' + error.message, 'error');
    }
}

// 渲染消息历史
function renderMessageHistory() {
    const container = elements.messageHistory;
    const filter = elements.historyWebhookFilter.value;
    
    let filteredMessages = messages;
    if (filter) {
        filteredMessages = messages.filter(m => m.webhookId === filter);
    }
    
    if (filteredMessages.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="text-align: center; padding: 40px; color: #666;">
                <div style="font-size: 48px; margin-bottom: 16px; color: #d9d9d9;">💬</div>
                <h5 style="margin-bottom: 8px; color: #666;">暂无消息历史</h5>
                <p style="margin: 0; color: #999;">发送消息后会在这里显示历史记录</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = filteredMessages.map(message => {
        const webhook = webhooks.find(w => w.id === message.webhookId);
        const webhookName = webhook ? webhook.name : '未知Webhook';
        const messageType = getMessageType(message.messageData);
        const messagePreview = getMessagePreview(message.messageData);
        const messageTime = formatRelativeTime(message.timestamp);
        
        // 获取消息类型图标
        const getTypeIcon = (type) => {
            switch (type) {
                case '文本消息':
                    return '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4v3c0 .6.4 1 1 1 .2 0 .3 0 .5-.1L14 18h6c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>';
                case '嵌入消息':
                    return '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>';
                case '文件消息':
                    return '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z"/></svg>';
                default:
                    return '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>';
            }
        };
        
        return `
        <div class="message-item" style="border: 1px solid #f0f0f0; border-radius: 12px; padding: 20px; margin-bottom: 16px; background: white; transition: all 0.3s ease; box-shadow: 0 2px 4px rgba(0,0,0,0.02); width: 100%; ${message.success ? 'border-left: 4px solid #52c41a;' : 'border-left: 4px solid #ff4d4f;'}" onmouseover="this.style.boxShadow='0 4px 12px rgba(0,0,0,0.08)'; this.style.transform='translateY(-1px)';" onmouseout="this.style.boxShadow='0 2px 4px rgba(0,0,0,0.02)'; this.style.transform='translateY(0)';"
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div style="flex: 1; min-width: 0;">
                    <div style="display: flex; align-items: center; margin-bottom: 12px; flex-wrap: wrap; gap: 12px;">
                        <h5 style="margin: 0; font-size: 18px; font-weight: 600; color: #1f1f1f; line-height: 1.2;">${webhookName}</h5>
                        <span style="display: inline-flex; align-items: center; padding: 4px 12px; border-radius: 16px; font-size: 13px; font-weight: 500; ${message.success ? 'background: #f6ffed; color: #52c41a; border: 1px solid #b7eb8f;' : 'background: #fff2f0; color: #ff4d4f; border: 1px solid #ffccc7;'}">
                            <span style="width: 8px; height: 8px; border-radius: 50%; margin-right: 6px; ${message.success ? 'background: #52c41a;' : 'background: #ff4d4f;'}"></span>
                            ${message.success ? '发送成功' : '发送失败'}
                        </span>
                        <span style="display: inline-flex; align-items: center; padding: 4px 12px; border-radius: 16px; font-size: 13px; font-weight: 500; background: #f0f0f0; color: #666; gap: 6px;">
                            ${getTypeIcon(messageType)}
                            ${messageType}
                        </span>
                    </div>
                    <div class="message-preview" onclick="showMessageDetail('${message.id}')" style="margin-bottom: 12px; padding: 12px; background: #fafafa; border-radius: 8px; cursor: pointer; font-size: 15px; line-height: 1.5; color: #333; border: 1px solid #f0f0f0; transition: all 0.2s;" onmouseover="this.style.backgroundColor='#f5f5f5'; this.style.transform='translateY(-1px)';" onmouseout="this.style.backgroundColor='#fafafa'; this.style.transform='translateY(0)';">
                        ${messagePreview}
                    </div>
                    <div style="display: flex; align-items: center; gap: 20px; font-size: 13px; color: #999;">
                        <span style="display: flex; align-items: center;">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 6px;">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                            </svg>
                            ${messageTime}
                        </span>
                    </div>
                </div>
                <div style="margin-left: 20px; flex-shrink: 0;">
                    <button onclick="showMessageDetail('${message.id}')" title="查看详情" style="padding: 8px 16px; border: 1px solid #d9d9d9; background: white; color: #666; border-radius: 8px; font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.2s; min-width: 80px;" onmouseover="this.style.background='#f5f5f5'; this.style.borderColor='#bfbfbf'; this.style.transform='translateY(-1px)';" onmouseout="this.style.background='white'; this.style.borderColor='#d9d9d9'; this.style.transform='translateY(0)';">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 6px;">
                            <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                        </svg>
                        详情
                    </button>
                </div>
            </div>
            ${!message.success ? `
                <div style="margin-top: 16px; padding: 12px 16px; background: #fff2f0; border: 1px solid #ffccc7; border-radius: 8px;">
                    <div style="display: flex; align-items: center; font-size: 13px; color: #ff4d4f;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 8px; flex-shrink: 0;">
                            <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
                        </svg>
                        <span style="word-break: break-all; line-height: 1.4;">${message.error}</span>
                    </div>
                </div>
            ` : ''}
        </div>
        `;
    }).join('');
}

// 获取消息类型
function getMessageType(messageData) {
    if (messageData.embeds && messageData.embeds.length > 0) {
        return '嵌入消息';
    } else if (messageData.filename) {
        return '文件消息';
    } else if (messageData.content) {
        return '文本消息';
    } else {
        return '未知类型';
    }
}

// 获取消息预览
function getMessagePreview(messageData) {
    if (messageData.content) {
        // 解析Markdown格式并截取预览
        const plainText = messageData.content.replace(/[*_`~#>\[\]!-]/g, '').trim();
        return plainText.substring(0, 120) + (plainText.length > 120 ? '...' : '');
    } else if (messageData.embeds && messageData.embeds.length > 0) {
        const embed = messageData.embeds[0];
        const title = embed.title || '';
        const description = embed.description || '';
        const preview = title || description || '无内容';
        return preview.substring(0, 120) + (preview.length > 120 ? '...' : '');
    } else if (messageData.filename) {
        return `📎 ${messageData.filename}`;
    } else {
        return '无内容预览';
    }
}

// 显示消息详情
function showMessageDetail(messageId) {
    const message = messages.find(m => m.id === messageId);
    if (!message) return;
    
    const webhook = webhooks.find(w => w.id === message.webhookId);
    const webhookName = webhook ? webhook.name : '未知Webhook';
    
    let detailHTML = `
        <div class="mb-3">
            <h6>基本信息</h6>
            <table class="table table-sm">
                <tr><td><strong>Webhook:</strong></td><td>${webhookName}</td></tr>
                <tr><td><strong>类型:</strong></td><td>${getMessageType(message.messageData)}</td></tr>
                <tr><td><strong>状态:</strong></td><td>
                    <span class="badge ${message.success ? 'bg-success' : 'bg-danger'}">
                        ${message.success ? '发送成功' : '发送失败'}
                    </span>
                </td></tr>
                <tr><td><strong>时间:</strong></td><td>${message.timestamp}</td></tr>
            </table>
        </div>
    `;
    
    if (message.messageData.content) {
        detailHTML += `
            <div class="mb-3">
                <h6>消息内容</h6>
                <div class="bg-light p-3 rounded">
                    <pre class="mb-0" style="white-space: pre-wrap;">${message.messageData.content}</pre>
                </div>
            </div>
        `;
    }
    
    if (message.messageData.embeds && message.messageData.embeds.length > 0) {
        const embed = message.messageData.embeds[0];
        detailHTML += `
            <div class="mb-3">
                <h6>嵌入内容</h6>
                <div class="bg-light p-3 rounded">
                    ${embed.title ? `<div><strong>标题:</strong> ${embed.title}</div>` : ''}
                    ${embed.description ? `<div><strong>描述:</strong> ${embed.description}</div>` : ''}
                    ${embed.color ? `<div><strong>颜色:</strong> #${embed.color.toString(16).padStart(6, '0')}</div>` : ''}
                </div>
            </div>
        `;
    }
    
    if (message.messageData.filename) {
        detailHTML += `
            <div class="mb-3">
                <h6>文件信息</h6>
                <div class="bg-light p-3 rounded">
                    <div><strong>文件名:</strong> ${message.messageData.filename}</div>
                </div>
            </div>
        `;
    }
    
    if (!message.success && message.error) {
        detailHTML += `
            <div class="mb-3">
                <h6>错误信息</h6>
                <div class="alert alert-danger">
                    ${message.error}
                </div>
            </div>
        `;
    }
    
    // 检查Ant Design组件是否已初始化
    if (!window.antdReady || typeof window.Modal === 'undefined' || !window.Modal) {
        alert('消息详情:\n\n' + detailHTML.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' '));
        return;
    }

    // 创建信息模态框
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = `
        <div class="ant-modal-mask" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.45); z-index: 1000;"></div>
        <div class="ant-modal-wrap" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 1000; display: flex; align-items: center; justify-content: center;">
            <div class="ant-modal" style="width: 800px; background: white; border-radius: 8px; box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12); position: relative; max-height: 80vh; overflow-y: auto;">
                <div class="ant-modal-content">
                    <div class="ant-modal-header" style="padding: 16px 24px; border-bottom: 1px solid #f0f0f0;">
                        <div class="ant-modal-title" style="font-size: 16px; font-weight: 600; color: rgba(0, 0, 0, 0.85);">消息详情</div>
                        <button class="ant-modal-close" id="closeModalBtn" style="position: absolute; top: 12px; right: 12px; background: none; border: none; font-size: 16px; cursor: pointer; padding: 8px; color: rgba(0, 0, 0, 0.45);">×</button>
                    </div>
                    <div class="ant-modal-body" style="padding: 24px; max-height: 60vh; overflow-y: auto;">
                        ${detailHTML}
                    </div>
                    <div class="ant-modal-footer" style="padding: 10px 16px; text-align: right; border-top: 1px solid #f0f0f0;">
                        <button class="ant-btn ant-btn-primary" id="closeBtn" style="height: 32px; padding: 4px 15px; border: 1px solid #1890ff; border-radius: 6px; background: #1890ff; color: white; cursor: pointer;">关闭</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // 添加到页面
    document.body.appendChild(modalContainer);

    // 绑定事件
    const closeModal = () => {
        document.body.removeChild(modalContainer);
    };

    document.getElementById('closeModalBtn').addEventListener('click', closeModal);
    document.getElementById('closeBtn').addEventListener('click', closeModal);
    modalContainer.querySelector('.ant-modal-mask').addEventListener('click', closeModal);
}

// 过滤消息历史
function filterMessageHistory() {
    renderMessageHistory();
}

// 加载统计数据
async function loadStats() {
    try {
        const stats = await apiCall('/api/messages/stats');
        
        elements.totalWebhooks.textContent = webhooks.length;
        elements.totalMessages.textContent = stats.totalMessages;
        elements.successRate.textContent = stats.successRate + '%';
        elements.activeWebhooks.textContent = webhooks.filter(w => w.isActive).length;
    } catch (error) {
        showToast('加载统计数据失败: ' + error.message, 'error');
    }
}

// 测试所有Webhook
function testAllWebhooks() {
    const activeWebhooks = webhooks.filter(w => w.isActive);
    if (activeWebhooks.length === 0) {
        showToast('没有活跃的Webhook可以测试', 'warning');
        return;
    }
    
    // 检查Ant Design组件是否已初始化
    if (!window.antdReady || typeof window.Modal === 'undefined' || !window.Modal) {
        const result = confirm(`确定要测试所有 ${activeWebhooks.length} 个活跃的Webhook吗？`);
        if (result) {
            performBatchTest(activeWebhooks);
        }
        return;
    }

    // 创建确认对话框
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = `
        <div class="ant-modal-mask" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.45); z-index: 1000;"></div>
        <div class="ant-modal-wrap" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 1000; display: flex; align-items: center; justify-content: center;">
            <div class="ant-modal" style="width: 416px; background: white; border-radius: 8px; box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12); position: relative;">
                <div class="ant-modal-content">
                    <div class="ant-modal-body" style="padding: 32px 32px 24px;">
                        <div style="display: flex; align-items: flex-start;">
                            <div style="color: #1890ff; font-size: 22px; margin-right: 16px; line-height: 1;">🧪</div>
                            <div style="flex: 1;">
                                <div style="font-size: 16px; font-weight: 600; color: rgba(0, 0, 0, 0.85); margin-bottom: 8px;">批量测试</div>
                                <div style="color: rgba(0, 0, 0, 0.65);">确定要测试所有 ${activeWebhooks.length} 个活跃的Webhook吗？</div>
                            </div>
                        </div>
                    </div>
                    <div class="ant-modal-footer" style="padding: 10px 16px; text-align: right; border-top: 1px solid #f0f0f0;">
                        <button class="ant-btn" id="cancelBtn" style="margin-right: 8px; height: 32px; padding: 4px 15px; border: 1px solid #d9d9d9; border-radius: 6px; background: white; color: rgba(0, 0, 0, 0.85); cursor: pointer;">取消</button>
                        <button class="ant-btn ant-btn-primary" id="testBtn" style="height: 32px; padding: 4px 15px; border: 1px solid #1890ff; border-radius: 6px; background: #1890ff; color: white; cursor: pointer;">开始测试</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // 添加到页面
    document.body.appendChild(modalContainer);

    // 绑定事件
    const closeModal = () => {
        document.body.removeChild(modalContainer);
    };

    document.getElementById('cancelBtn').addEventListener('click', closeModal);
    modalContainer.querySelector('.ant-modal-mask').addEventListener('click', closeModal);
    
    document.getElementById('testBtn').addEventListener('click', async () => {
        closeModal();
        await performBatchTest(activeWebhooks);
    });
}

// 执行批量测试
async function performBatchTest(activeWebhooks) {
    let successCount = 0;
    let failCount = 0;
    
    for (const webhook of activeWebhooks) {
        try {
            await apiCall(`/api/webhooks/${webhook.id}/test`, { method: 'POST' });
            successCount++;
        } catch (error) {
            failCount++;
        }
    }
    
    showToast(`测试完成: ${successCount} 成功, ${failCount} 失败`, 'info');
    await loadMessages();
    await loadStats();
}

// 刷新统计
async function refreshStats() {
    await loadStats();
    showToast('统计数据已刷新', 'success');
}

// 导出数据
function exportData() {
    const data = {
        webhooks: webhooks,
        messages: messages,
        exportTime: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `discord-webhook-data-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    showToast('数据导出成功', 'success');
}

// 清除历史
function clearHistory() {
    // 检查Ant Design组件是否已初始化
    if (!window.antdReady || typeof window.Modal === 'undefined' || !window.Modal) {
        const result = confirm('确定要清除所有消息历史吗？此操作不可恢复！');
        if (result) {
            performClearHistory();
        }
        return;
    }

    // 创建确认对话框
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = `
        <div class="ant-modal-mask" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.45); z-index: 1000;"></div>
        <div class="ant-modal-wrap" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 1000; display: flex; align-items: center; justify-content: center;">
            <div class="ant-modal" style="width: 416px; background: white; border-radius: 8px; box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12); position: relative;">
                <div class="ant-modal-content">
                    <div class="ant-modal-body" style="padding: 32px 32px 24px;">
                        <div style="display: flex; align-items: flex-start;">
                            <div style="color: #ff4d4f; font-size: 22px; margin-right: 16px; line-height: 1;">🗑️</div>
                            <div style="flex: 1;">
                                <div style="font-size: 16px; font-weight: 600; color: rgba(0, 0, 0, 0.85); margin-bottom: 8px;">确认清除</div>
                                <div style="color: rgba(0, 0, 0, 0.65);">确定要清除所有消息历史吗？此操作不可恢复！</div>
                            </div>
                        </div>
                    </div>
                    <div class="ant-modal-footer" style="padding: 10px 16px; text-align: right; border-top: 1px solid #f0f0f0;">
                        <button class="ant-btn" id="cancelBtn" style="margin-right: 8px; height: 32px; padding: 4px 15px; border: 1px solid #d9d9d9; border-radius: 6px; background: white; color: rgba(0, 0, 0, 0.85); cursor: pointer;">取消</button>
                        <button class="ant-btn ant-btn-danger" id="clearBtn" style="height: 32px; padding: 4px 15px; border: 1px solid #ff4d4f; border-radius: 6px; background: #ff4d4f; color: white; cursor: pointer;">清除</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // 添加到页面
    document.body.appendChild(modalContainer);

    // 绑定事件
    const closeModal = () => {
        document.body.removeChild(modalContainer);
    };

    document.getElementById('cancelBtn').addEventListener('click', closeModal);
    modalContainer.querySelector('.ant-modal-mask').addEventListener('click', closeModal);
    
    document.getElementById('clearBtn').addEventListener('click', async () => {
        closeModal();
        await performClearHistory();
    });
}

// 执行清除历史操作
async function performClearHistory() {
    try {
        await apiCall('/api/messages', { method: 'DELETE' });
        await loadMessages();
        await loadStats();
        showToast('消息历史已清除', 'success');
    } catch (error) {
        showToast('清除历史失败: ' + error.message, 'error');
    }
}

// 加载代理配置
async function loadProxyConfig() {
    try {
        const config = await apiCall('/api/proxy-config');
        document.getElementById('proxyEnabled').checked = config.enabled;
        document.getElementById('proxyType').value = config.type || 'http';
        document.getElementById('proxyHost').value = config.host || '';
        document.getElementById('proxyPort').value = config.port || '';
        document.getElementById('proxyUsername').value = config.username || '';
        document.getElementById('proxyPassword').value = config.hasPassword ? '••••••••' : '';
        document.getElementById('proxyUrl').value = config.url || '';
        document.getElementById('proxyStatus').textContent = config.status;
        
        // 根据启用状态设置界面
        toggleProxySettings();
    } catch (error) {
        console.error('加载代理配置失败:', error);
        document.getElementById('proxyStatus').textContent = '配置加载失败';
    }
}

// 保存代理配置
async function saveProxyConfig() {
    const enabled = document.getElementById('proxyEnabled').checked;
    const type = document.getElementById('proxyType').value;
    const host = document.getElementById('proxyHost').value;
    const port = document.getElementById('proxyPort').value;
    const username = document.getElementById('proxyUsername').value;
    const password = document.getElementById('proxyPassword').value;
    const url = document.getElementById('proxyUrl').value;

    if (!enabled) {
        try {
            await apiCall('/api/proxy-config', {
                method: 'POST',
                body: JSON.stringify({ enabled: false })
            });
            document.getElementById('proxyStatus').textContent = '代理已禁用';
            showToast('代理已禁用', 'success');
        } catch (error) {
            showToast('保存配置失败: ' + error.message, 'error');
        }
        return;
    }

    // 验证必填字段
    if (!url && (!host || !port)) {
        showToast('请输入代理主机和端口，或提供完整URL', 'warning');
        return;
    }

    try {
        document.getElementById('proxyStatus').textContent = '保存中...';
        
        const config = {
            enabled,
            type,
            host,
            port: parseInt(port),
            username,
            password: password === '••••••••' ? undefined : password, // 如果是占位符，不更新密码
            url
        };

        const result = await apiCall('/api/proxy-config', {
            method: 'POST',
            body: JSON.stringify(config)
        });


        
        if (result && result.success) {
            const status = result.config && result.config.status ? result.config.status : '已保存';
            document.getElementById('proxyStatus').textContent = status;
            showToast(result.message || '代理配置已保存', 'success');
        } else {
            document.getElementById('proxyStatus').textContent = '保存失败';
            showToast('保存代理配置失败: ' + (result && result.message ? result.message : '未知错误'), 'error');
        }
    } catch (error) {
        document.getElementById('proxyStatus').textContent = '保存失败';
        showToast('保存代理配置失败: ' + error.message, 'error');
    }
}

// 切换代理设置显示
function toggleProxySettings() {
    const enabled = document.getElementById('proxyEnabled').checked;
    const proxySettings = document.getElementById('proxySettings');

    if (!enabled) {
        proxySettings.style.display = 'none';
        document.getElementById('proxyStatus').textContent = '代理已禁用';
    } else {
        proxySettings.style.display = 'block';
        document.getElementById('proxyStatus').textContent = '请配置代理设置';
    }
}

// 测试代理连接
async function testProxyConnection() {
    const enabled = document.getElementById('proxyEnabled').checked;
    
    if (!enabled) {
        showToast('请先启用代理', 'warning');
        return;
    }
    
    try {
        document.getElementById('proxyStatus').textContent = '测试中...';
        
        // 调用专门的测试API
        const result = await apiCall('/api/proxy-test', {
            method: 'POST'
        });
        
        if (result && result.success) {
            document.getElementById('proxyStatus').textContent = '代理连接正常';
            showToast(result.message || '代理连接测试成功', 'success');
        } else {
            document.getElementById('proxyStatus').textContent = '代理连接失败';
            showToast('代理连接测试失败: ' + (result && result.message ? result.message : '未知错误'), 'error');
        }
        
    } catch (error) {
        document.getElementById('proxyStatus').textContent = '连接测试失败';
        showToast('代理测试失败: ' + error.message, 'error');
    }
}

// 格式化相对时间
function formatRelativeTime(dateString) {
    if (!dateString) return '未知时间';
    
    try {
        // 如果有dayjs，使用dayjs格式化
        if (typeof dayjs !== 'undefined') {
            const date = dayjs(dateString);
            const now = dayjs();
            const diffInMinutes = now.diff(date, 'minute');
            const diffInHours = now.diff(date, 'hour');
            const diffInDays = now.diff(date, 'day');
            
            if (diffInMinutes < 1) {
                return '刚刚';
            } else if (diffInMinutes < 60) {
                return `${diffInMinutes} 分钟前`;
            } else if (diffInHours < 24) {
                return `${diffInHours} 小时前`;
            } else if (diffInDays < 7) {
                return `${diffInDays} 天前`;
            } else {
                return date.format('YYYY-MM-DD');
            }
        } else {
            // 降级到原生JavaScript
            const date = new Date(dateString);
            const now = new Date();
            const diffInMs = now - date;
            const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
            const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
            const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
            
            if (diffInMinutes < 1) {
                return '刚刚';
            } else if (diffInMinutes < 60) {
                return `${diffInMinutes} 分钟前`;
            } else if (diffInHours < 24) {
                return `${diffInHours} 小时前`;
            } else if (diffInDays < 7) {
                return `${diffInDays} 天前`;
            } else {
                return date.toISOString().split('T')[0];
            }
        }
    } catch (error) {
        return dateString;
    }
} 