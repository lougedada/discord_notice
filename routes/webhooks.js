const express = require('express');
const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const moment = require('moment');

const router = express.Router();

// 数据文件路径
const DATA_DIR = path.join(__dirname, '..', 'data');
const WEBHOOKS_FILE = path.join(DATA_DIR, 'webhooks.json');

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

// 获取所有Webhook
router.get('/', (req, res) => {
  try {
    const webhooks = readWebhooks();
    res.json(webhooks);
  } catch (error) {
    res.status(500).json({ error: '获取Webhook列表失败' });
  }
});

// 添加新的Webhook
router.post('/', async (req, res) => {
  try {
    const { name, webhookUrl, description } = req.body;
    
    if (!name || !webhookUrl) {
      return res.status(400).json({ error: '名称和Webhook URL不能为空' });
    }

    // 验证Webhook URL格式
    const webhookRegex = /^https:\/\/discord\.com\/api\/webhooks\/(\d+)\/([a-zA-Z0-9_-]+)$/;
    if (!webhookRegex.test(webhookUrl)) {
      return res.status(400).json({ error: 'Webhook URL格式不正确' });
    }

    // 创建带代理的axios实例
    const axiosInstance = createAxiosInstance(req);

    // 测试Webhook是否有效
    try {
      const testResponse = await axiosInstance.get(webhookUrl);
      
      if (!testResponse.data.id) {
        return res.status(400).json({ error: 'Webhook无效或已失效' });
      }
    } catch (error) {
      console.error('Webhook验证失败:', error.message);
      if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        return res.status(400).json({ error: '网络连接失败，请检查代理设置' });
      }
      return res.status(400).json({ error: 'Webhook无效或已失效: ' + error.message });
    }

    const webhooks = readWebhooks();
    const newWebhook = {
      id: Date.now().toString(),
      name,
      webhookUrl,
      description: description || '',
      createdAt: moment().format('YYYY-MM-DD HH:mm:ss'),
      isActive: true,
      messageCount: 0
    };

    webhooks.push(newWebhook);
    writeWebhooks(webhooks);

    res.status(201).json(newWebhook);
  } catch (error) {
    console.error('添加Webhook失败:', error);
    res.status(500).json({ error: '添加Webhook失败' });
  }
});

// 更新Webhook
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, webhookUrl, description, isActive } = req.body;
    
    const webhooks = readWebhooks();
    const webhookIndex = webhooks.findIndex(w => w.id === id);
    
    if (webhookIndex === -1) {
      return res.status(404).json({ error: 'Webhook不存在' });
    }

    // 如果更新了URL，需要验证
    if (webhookUrl && webhookUrl !== webhooks[webhookIndex].webhookUrl) {
      const webhookRegex = /^https:\/\/discord\.com\/api\/webhooks\/(\d+)\/([a-zA-Z0-9_-]+)$/;
      if (!webhookRegex.test(webhookUrl)) {
        return res.status(400).json({ error: 'Webhook URL格式不正确' });
      }

      // 创建带代理的axios实例
      const axiosInstance = createAxiosInstance(req);

      try {
        const testResponse = await axiosInstance.get(webhookUrl);
        if (!testResponse.data.id) {
          return res.status(400).json({ error: 'Webhook无效或已失效' });
        }
      } catch (error) {
        console.error('Webhook验证失败:', error.message);
        return res.status(400).json({ error: 'Webhook无效或已失效: ' + error.message });
      }
    }

    // 更新Webhook信息
    if (name !== undefined) webhooks[webhookIndex].name = name;
    if (webhookUrl !== undefined) webhooks[webhookIndex].webhookUrl = webhookUrl;
    if (description !== undefined) webhooks[webhookIndex].description = description;
    if (isActive !== undefined) webhooks[webhookIndex].isActive = isActive;
    
    webhooks[webhookIndex].updatedAt = moment().format('YYYY-MM-DD HH:mm:ss');

    writeWebhooks(webhooks);
    res.json(webhooks[webhookIndex]);
  } catch (error) {
    console.error('更新Webhook失败:', error);
    res.status(500).json({ error: '更新Webhook失败' });
  }
});

// 删除Webhook
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const webhooks = readWebhooks();
    const filteredWebhooks = webhooks.filter(w => w.id !== id);
    
    if (filteredWebhooks.length === webhooks.length) {
      return res.status(404).json({ error: 'Webhook不存在' });
    }

    writeWebhooks(filteredWebhooks);
    res.status(204).send();
  } catch (error) {
    console.error('删除Webhook失败:', error);
    res.status(500).json({ error: '删除Webhook失败' });
  }
});

// 测试Webhook
router.post('/:id/test', async (req, res) => {
  try {
    const { id } = req.params;
    const webhooks = readWebhooks();
    const webhook = webhooks.find(w => w.id === id);
    
    if (!webhook) {
      return res.status(404).json({ error: 'Webhook不存在' });
    }

    if (!webhook.isActive) {
      return res.status(400).json({ error: 'Webhook已被禁用' });
    }

    // 创建带代理的axios实例
    const axiosInstance = createAxiosInstance(req);

    // 发送测试消息
    const testMessage = {
      content: `🔔 测试消息 - ${moment().format('YYYY-MM-DD HH:mm:ss')}`,
      username: 'Webhook测试',
      avatar_url: 'https://cdn.discordapp.com/embed/avatars/0.png'
    };

    const response = await axiosInstance.post(webhook.webhookUrl, testMessage);
    
    res.json({ 
      success: true, 
      message: '测试消息发送成功',
      messageId: response.data?.id 
    });
  } catch (error) {
    console.error('测试Webhook失败:', error);
    if (error.response) {
      res.status(400).json({ 
        error: '测试消息发送失败', 
        details: error.response.data 
      });
    } else {
      res.status(500).json({ error: '测试Webhook失败: ' + error.message });
    }
  }
});

// 获取Webhook详细信息（从Discord API）
router.get('/:id/info', async (req, res) => {
  try {
    const { id } = req.params;
    const webhooks = readWebhooks();
    const webhook = webhooks.find(w => w.id === id);
    
    if (!webhook) {
      return res.status(404).json({ error: 'Webhook不存在' });
    }

    // 创建带代理的axios实例
    const axiosInstance = createAxiosInstance(req);

    // 从Discord API获取Webhook信息
    const response = await axiosInstance.get(webhook.webhookUrl);
    res.json(response.data);
  } catch (error) {
    console.error('获取Webhook信息失败:', error);
    if (error.response && error.response.status === 404) {
      res.status(404).json({ error: 'Webhook在Discord中不存在或已被删除' });
    } else {
      res.status(500).json({ error: '获取Webhook信息失败: ' + error.message });
    }
  }
});

module.exports = router; 