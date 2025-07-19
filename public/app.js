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
    currentTime: document.getElementById('currentTime'),
    globalToast: new bootstrap.Toast(document.getElementById('globalToast'))
};

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    checkAuth().then(() => {
        initializeApp();
        setupEventListeners();
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
        showToast('登出失败');
    }
}

// 修改密码
async function changePassword() {
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    if (!currentPassword || !newPassword || !confirmPassword) {
        showToast('请填写所有字段');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        showToast('新密码与确认密码不匹配');
        return;
    }
    
    if (newPassword.length < 6) {
        showToast('新密码长度至少6位');
        return;
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
            bootstrap.Modal.getInstance(document.getElementById('changePasswordModal')).hide();
            document.getElementById('changePasswordForm').reset();
            showToast('密码修改成功');
        }
    } catch (error) {
        showToast('修改密码失败: ' + error.message);
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

// 设置事件监听器
function setupEventListeners() {
    // Webhook管理
    document.getElementById('saveWebhookBtn').addEventListener('click', saveWebhook);
    document.getElementById('updateWebhookBtn').addEventListener('click', updateWebhook);
    
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
    document.getElementById('savePasswordBtn').addEventListener('click', changePassword);
}

// 更新时间显示
function updateTime() {
    const now = new Date();
    elements.currentTime.textContent = now.toLocaleString('zh-CN');
}

// 显示提示消息
function showToast(message, type = 'info') {
    const toast = document.getElementById('globalToast');
    const toastBody = toast.querySelector('.toast-body');
    toastBody.textContent = message;
    elements.globalToast.show();
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
        showToast('加载Webhook列表失败: ' + error.message);
    }
}

// 渲染Webhook列表
function renderWebhooksList() {
    const container = elements.webhooksList;
    
    if (webhooks.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <h5>还没有Webhook</h5>
                <p>点击"添加Webhook"按钮来添加第一个Webhook</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = webhooks.map(webhook => `
        <div class="webhook-item">
            <div class="d-flex justify-content-between align-items-center">
                <div class="flex-grow-1">
                    <div class="d-flex align-items-center mb-2">
                        <h6 class="mb-0 me-2">${webhook.name}</h6>
                        ${webhook.isActive ? 
                            '<span class="badge bg-success">活跃</span>' : 
                            '<span class="badge bg-secondary">禁用</span>'
                        }
                    </div>
                    <p class="text-muted mb-1 small">${webhook.description || '无描述'}</p>
                    <small class="text-muted">
                        创建时间: ${webhook.createdAt} · 消息数: ${webhook.messageCount || 0}
                    </small>
                </div>
                <div class="d-flex gap-2">
                    <button class="btn btn-sm btn-outline-primary" onclick="testWebhook('${webhook.id}')" title="测试Webhook">
                        测试
                    </button>
                    <button class="btn btn-sm btn-outline-secondary" onclick="editWebhook('${webhook.id}')" title="编辑Webhook">
                        编辑
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteWebhook('${webhook.id}')" title="删除Webhook">
                        删除
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// 保存新Webhook
async function saveWebhook() {
    const name = document.getElementById('webhookName').value;
    const url = document.getElementById('webhookUrl').value;
    const description = document.getElementById('webhookDescription').value;
    
    if (!name || !url) {
        showToast('请填写必要信息');
        return;
    }
    
    try {
        await apiCall('/api/webhooks', {
            method: 'POST',
            body: JSON.stringify({ name, webhookUrl: url, description })
        });
        
        bootstrap.Modal.getInstance(document.getElementById('addWebhookModal')).hide();
        document.getElementById('addWebhookForm').reset();
        await loadWebhooks();
        await loadStats();
        updateWebhookSelects();
        showToast('Webhook添加成功');
    } catch (error) {
        showToast('添加Webhook失败: ' + error.message);
    }
}

// 编辑Webhook
function editWebhook(id) {
    const webhook = webhooks.find(w => w.id === id);
    if (!webhook) return;
    
    document.getElementById('editWebhookId').value = webhook.id;
    document.getElementById('editWebhookName').value = webhook.name;
    document.getElementById('editWebhookUrl').value = webhook.webhookUrl;
    document.getElementById('editWebhookDescription').value = webhook.description || '';
    document.getElementById('editWebhookActive').checked = webhook.isActive;
    
    new bootstrap.Modal(document.getElementById('editWebhookModal')).show();
}

// 更新Webhook
async function updateWebhook() {
    const id = document.getElementById('editWebhookId').value;
    const name = document.getElementById('editWebhookName').value;
    const url = document.getElementById('editWebhookUrl').value;
    const description = document.getElementById('editWebhookDescription').value;
    const isActive = document.getElementById('editWebhookActive').checked;
    
    try {
        await apiCall(`/api/webhooks/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ name, webhookUrl: url, description, isActive })
        });
        
        bootstrap.Modal.getInstance(document.getElementById('editWebhookModal')).hide();
        await loadWebhooks();
        await loadStats();
        updateWebhookSelects();
        showToast('Webhook更新成功');
    } catch (error) {
        showToast('更新Webhook失败: ' + error.message);
    }
}

// 删除Webhook
async function deleteWebhook(id) {
    if (!confirm('确定要删除这个Webhook吗？')) return;
    
    try {
        await apiCall(`/api/webhooks/${id}`, { method: 'DELETE' });
        await loadWebhooks();
        await loadStats();
        updateWebhookSelects();
        showToast('Webhook删除成功');
    } catch (error) {
        showToast('删除Webhook失败: ' + error.message);
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
        showToast('测试Webhook失败: ' + error.message);
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
        showToast('请选择Webhook');
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
        showToast('发送消息失败: ' + error.message);
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
        showToast('加载消息历史失败: ' + error.message);
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
            <div class="empty-state">
                <h5>暂无消息历史</h5>
                <p>发送消息后会在这里显示历史记录</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = filteredMessages.map(message => {
        const webhook = webhooks.find(w => w.id === message.webhookId);
        const webhookName = webhook ? webhook.name : '未知Webhook';
        const statusClass = message.success ? 'success' : 'failed';
        const messageType = getMessageType(message.messageData);
        const messagePreview = getMessagePreview(message.messageData);
        
        return `
            <div class="message-item ${statusClass}">
                <div class="d-flex justify-content-between align-items-start">
                    <div class="flex-grow-1">
                        <div class="d-flex align-items-center justify-content-between mb-2">
                            <div class="d-flex align-items-center">
                                <h6 class="mb-0 me-2">${webhookName}</h6>
                                <span class="badge ${message.success ? 'bg-success' : 'bg-danger'} me-2">
                                    ${message.success ? '成功' : '失败'}
                                </span>
                                <span class="badge bg-light text-dark">${messageType}</span>
                            </div>
                            <button class="btn btn-sm btn-outline-secondary" onclick="showMessageDetail('${message.id}')" title="查看详情">
                                <i class="bi bi-eye"></i>
                            </button>
                        </div>
                        <div class="message-preview mb-2" onclick="showMessageDetail('${message.id}')" style="cursor: pointer;">
                            ${messagePreview}
                        </div>
                        <small class="text-muted">
                            <i class="bi bi-clock"></i> ${message.timestamp}
                        </small>
                    </div>
                </div>
                ${!message.success ? `
                    <div class="alert alert-danger mt-2 mb-0">
                        <small><i class="bi bi-exclamation-triangle"></i> ${message.error}</small>
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
    
    document.getElementById('messageDetailContent').innerHTML = detailHTML;
    new bootstrap.Modal(document.getElementById('messageDetailModal')).show();
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
        showToast('加载统计数据失败: ' + error.message);
    }
}

// 测试所有Webhook
async function testAllWebhooks() {
    if (!confirm('确定要测试所有活跃的Webhook吗？')) return;
    
    const activeWebhooks = webhooks.filter(w => w.isActive);
    if (activeWebhooks.length === 0) {
        showToast('没有活跃的Webhook可以测试');
        return;
    }
    
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
    
    showToast(`测试完成: ${successCount} 成功, ${failCount} 失败`);
    await loadMessages();
    await loadStats();
}

// 刷新统计
async function refreshStats() {
    await loadStats();
    showToast('统计数据已刷新');
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
    
    showToast('数据导出成功');
}

// 清除历史
async function clearHistory() {
    if (!confirm('确定要清除所有消息历史吗？此操作不可恢复！')) return;
    
    try {
        await apiCall('/api/messages', { method: 'DELETE' });
        await loadMessages();
        await loadStats();
        showToast('消息历史已清除');
    } catch (error) {
        showToast('清除历史失败: ' + error.message);
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
            showToast('代理已禁用');
        } catch (error) {
            showToast('保存配置失败: ' + error.message);
        }
        return;
    }

    // 验证必填字段
    if (!url && (!host || !port)) {
        showToast('请输入代理主机和端口，或提供完整URL');
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

        document.getElementById('proxyStatus').textContent = result.config.status;
        showToast('代理配置已保存');
    } catch (error) {
        document.getElementById('proxyStatus').textContent = '保存失败';
        showToast('保存代理配置失败: ' + error.message);
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
        showToast('请先启用代理');
        return;
    }
    
    try {
        document.getElementById('proxyStatus').textContent = '测试中...';
        
        // 调用专门的测试API
        const result = await apiCall('/api/proxy-test', {
            method: 'POST'
        });
        
        if (result.success) {
            document.getElementById('proxyStatus').textContent = '代理连接正常';
            showToast('代理连接测试成功');
        } else {
            document.getElementById('proxyStatus').textContent = '代理连接失败';
            showToast('代理连接测试失败: ' + result.message);
        }
        
    } catch (error) {
        document.getElementById('proxyStatus').textContent = '连接测试失败';
        showToast('代理测试失败: ' + error.message);
    }
} 