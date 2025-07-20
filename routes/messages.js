const express = require('express');
const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const moment = require('moment');
const multer = require('multer');

const router = express.Router();

// 文件上传配置
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 8 * 1024 * 1024 // 8MB限制
  }
});

// 数据文件路径
const DATA_DIR = path.join(__dirname, '..', 'data');
const WEBHOOKS_FILE = path.join(DATA_DIR, 'webhooks.json');
const MESSAGES_FILE = path.join(DATA_DIR, 'messages.json');

// 工具函数
function readWebhooks() {
  try {
    return fs.readJsonSync(WEBHOOKS_FILE);
  } catch (error) {
    return [];
  }
}

function writeWebhooks(webhooks) {
  try {
    fs.writeJsonSync(WEBHOOKS_FILE, webhooks, { spaces: 2 });
  } catch (error) {
    console.error('写入Webhook数据失败:', error);
  }
}

function readMessages() {
  try {
    return fs.readJsonSync(MESSAGES_FILE);
  } catch (error) {
    return [];
  }
}

function writeMessages(messages) {
  try {
    fs.writeJsonSync(MESSAGES_FILE, messages, { spaces: 2 });
  } catch (error) {
    console.error('写入消息数据失败:', error);
  }
}

// 记录消息到历史
// 创建axios实例，支持代理
function createAxiosInstance(req) {
  const config = {
    timeout: 10000,
    headers: {
      'User-Agent': 'Discord-Webhook-Manager/1.0'
    }
  };

  // 如果有代理配置，添加到axios配置中
  if (req.app.locals.proxyAgent) {
    config.httpsAgent = req.app.locals.proxyAgent;
    config.httpAgent = req.app.locals.proxyAgent;
  }

  return axios.create(config);
}

function logMessage(webhookId, messageData, success, error = null) {
  const messages = readMessages();
  const logEntry = {
    id: Date.now().toString(),
    webhookId,
    messageData,
    success,
    error,
    timestamp: moment().format('YYYY-MM-DD HH:mm:ss')
  };
  
  messages.unshift(logEntry); // 添加到开头
  
  // 只保留最近1000条记录
  if (messages.length > 1000) {
    messages.splice(1000);
  }
  
  writeMessages(messages);
  
  // 更新Webhook的消息计数
  if (success) {
    const webhooks = readWebhooks();
    const webhookIndex = webhooks.findIndex(w => w.id === webhookId);
    if (webhookIndex !== -1) {
      webhooks[webhookIndex].messageCount = (webhooks[webhookIndex].messageCount || 0) + 1;
      writeWebhooks(webhooks);
    }
  }
}

// 获取消息历史
router.get('/', (req, res) => {
  try {
    const { webhookId, limit = 50, offset = 0 } = req.query;
    let messages = readMessages();
    
    // 按Webhook ID过滤
    if (webhookId) {
      messages = messages.filter(m => m.webhookId === webhookId);
    }
    
    // 分页
    const total = messages.length;
    const paginatedMessages = messages.slice(parseInt(offset), parseInt(offset) + parseInt(limit));
    
    res.json({
      messages: paginatedMessages,
      total,
      offset: parseInt(offset),
      limit: parseInt(limit)
    });
  } catch (error) {
    console.error('获取消息历史失败:', error);
    res.status(500).json({ error: '获取消息历史失败' });
  }
});

// 发送文本消息
router.post('/send', async (req, res) => {
  try {
    const { webhookId, content, username, avatarUrl, tts = false } = req.body;
    
    if (!webhookId || !content) {
      return res.status(400).json({ error: 'Webhook ID和消息内容不能为空' });
    }

    // 获取Webhook信息
    const webhooks = readWebhooks();
    const webhook = webhooks.find(w => w.id === webhookId);
    
    if (!webhook) {
      return res.status(404).json({ error: 'Webhook不存在' });
    }

    if (!webhook.isActive) {
      return res.status(400).json({ error: 'Webhook已被禁用' });
    }

    // 构建消息数据
    const messageData = {
      content: content.substring(0, 2000), // Discord限制2000字符
      tts
    };

    if (username) {
      messageData.username = username.substring(0, 80); // Discord限制80字符
    }

    if (avatarUrl) {
      messageData.avatar_url = avatarUrl;
    }

    // 创建带代理的axios实例并发送消息
    const axiosInstance = createAxiosInstance(req);
    const response = await axiosInstance.post(webhook.webhookUrl, messageData);
    
    // 记录成功的消息
    logMessage(webhookId, messageData, true);
    
    res.json({
      success: true,
      message: '消息发送成功',
      messageId: response.data?.id,
      sentAt: moment().format('YYYY-MM-DD HH:mm:ss')
    });

  } catch (error) {
    console.error('发送消息失败:', error);
    
    // 记录失败的消息
    logMessage(req.body.webhookId, req.body, false, error.message);
    
    if (error.response) {
      res.status(400).json({
        error: '消息发送失败',
        details: error.response.data
      });
    } else {
      res.status(500).json({ error: '消息发送失败' });
    }
  }
});

// 发送嵌入消息
router.post('/send-embed', async (req, res) => {
  try {
    const { webhookId, embed, content, username, avatarUrl } = req.body;
    
    if (!webhookId || !embed) {
      return res.status(400).json({ error: 'Webhook ID和嵌入内容不能为空' });
    }

    // 获取Webhook信息
    const webhooks = readWebhooks();
    const webhook = webhooks.find(w => w.id === webhookId);
    
    if (!webhook) {
      return res.status(404).json({ error: 'Webhook不存在' });
    }

    if (!webhook.isActive) {
      return res.status(400).json({ error: 'Webhook已被禁用' });
    }

    // 构建消息数据
    const messageData = {
      embeds: [embed]
    };

    if (content) {
      messageData.content = content.substring(0, 2000);
    }

    if (username) {
      messageData.username = username.substring(0, 80);
    }

    if (avatarUrl) {
      messageData.avatar_url = avatarUrl;
    }

    // 创建带代理的axios实例并发送消息
    const axiosInstance = createAxiosInstance(req);
    const response = await axiosInstance.post(webhook.webhookUrl, messageData);
    
    // 记录成功的消息
    logMessage(webhookId, messageData, true);
    
    res.json({
      success: true,
      message: '嵌入消息发送成功',
      messageId: response.data?.id,
      sentAt: moment().format('YYYY-MM-DD HH:mm:ss')
    });

  } catch (error) {
    console.error('发送嵌入消息失败:', error);
    
    // 记录失败的消息
    logMessage(req.body.webhookId, req.body, false, error.message);
    
    if (error.response) {
      res.status(400).json({
        error: '嵌入消息发送失败',
        details: error.response.data
      });
    } else {
      res.status(500).json({ error: '嵌入消息发送失败' });
    }
  }
});

// 发送文件消息
router.post('/send-file', upload.single('file'), async (req, res) => {
  try {
    const { webhookId, content, username, avatarUrl } = req.body;
    const file = req.file;
    
    if (!webhookId || !file) {
      return res.status(400).json({ error: 'Webhook ID和文件不能为空' });
    }

    // 获取Webhook信息
    const webhooks = readWebhooks();
    const webhook = webhooks.find(w => w.id === webhookId);
    
    if (!webhook) {
      return res.status(404).json({ error: 'Webhook不存在' });
    }

    if (!webhook.isActive) {
      return res.status(400).json({ error: 'Webhook已被禁用' });
    }

    // 构建FormData
    const FormData = require('form-data');
    const form = new FormData();
    
    // 添加文件
    form.append('file', fs.createReadStream(file.path), {
      filename: file.originalname,
      contentType: file.mimetype
    });

    // 添加其他数据
    const payload = {};
    if (content) payload.content = content.substring(0, 2000);
    if (username) payload.username = username.substring(0, 80);
    if (avatarUrl) payload.avatar_url = avatarUrl;
    
    if (Object.keys(payload).length > 0) {
      form.append('payload_json', JSON.stringify(payload));
    }

    // 创建带代理的axios实例并发送消息
    const axiosInstance = createAxiosInstance(req);
    const response = await axiosInstance.post(webhook.webhookUrl, form, {
      headers: form.getHeaders()
    });
    
    // 清理临时文件
    fs.removeSync(file.path);
    
    // 记录成功的消息
    logMessage(webhookId, { ...payload, filename: file.originalname }, true);
    
    res.json({
      success: true,
      message: '文件消息发送成功',
      messageId: response.data?.id,
      sentAt: moment().format('YYYY-MM-DD HH:mm:ss')
    });

  } catch (error) {
    console.error('发送文件消息失败:', error);
    
    // 清理临时文件
    if (req.file) {
      fs.removeSync(req.file.path);
    }
    
    // 记录失败的消息
    logMessage(req.body.webhookId, req.body, false, error.message);
    
    if (error.response) {
      res.status(400).json({
        error: '文件消息发送失败',
        details: error.response.data
      });
    } else {
      res.status(500).json({ error: '文件消息发送失败' });
    }
  }
});

// 清除消息历史
router.delete('/', (req, res) => {
  try {
    const { webhookId } = req.query;
    
    if (webhookId) {
      // 清除特定Webhook的消息历史
      const messages = readMessages();
      const filteredMessages = messages.filter(m => m.webhookId !== webhookId);
      writeMessages(filteredMessages);
    } else {
      // 清除所有消息历史
      writeMessages([]);
    }
    
    res.json({ success: true, message: '消息历史已清除' });
  } catch (error) {
    console.error('清除消息历史失败:', error);
    res.status(500).json({ error: '清除消息历史失败' });
  }
});

// 获取消息统计
router.get('/stats', (req, res) => {
  try {
    const messages = readMessages();
    const webhooks = readWebhooks();
    
    // 计算统计数据
    const totalMessages = messages.length;
    const successfulMessages = messages.filter(m => m.success).length;
    const failedMessages = messages.filter(m => !m.success).length;
    
    // 按Webhook统计
    const webhookStats = webhooks.map(webhook => {
      const webhookMessages = messages.filter(m => m.webhookId === webhook.id);
      return {
        webhookId: webhook.id,
        webhookName: webhook.name,
        totalMessages: webhookMessages.length,
        successfulMessages: webhookMessages.filter(m => m.success).length,
        failedMessages: webhookMessages.filter(m => !m.success).length
      };
    });
    
    // 按日期统计（最近7天）
    const dateStats = [];
    for (let i = 6; i >= 0; i--) {
      const date = moment().subtract(i, 'days').format('YYYY-MM-DD');
      const dayMessages = messages.filter(m => m.timestamp.startsWith(date));
      dateStats.push({
        date,
        totalMessages: dayMessages.length,
        successfulMessages: dayMessages.filter(m => m.success).length,
        failedMessages: dayMessages.filter(m => !m.success).length
      });
    }
    
    res.json({
      totalMessages,
      successfulMessages,
      failedMessages,
      successRate: totalMessages > 0 ? ((successfulMessages / totalMessages) * 100).toFixed(2) : 0,
      webhookStats,
      dateStats
    });
  } catch (error) {
    console.error('获取消息统计失败:', error);
    res.status(500).json({ error: '获取消息统计失败' });
  }
});

module.exports = router; 