require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs-extra');
const moment = require('moment');
const { HttpsProxyAgent } = require('https-proxy-agent');
const { SocksProxyAgent } = require('socks-proxy-agent');
const bcrypt = require('bcryptjs');
const session = require('express-session');

const app = express();
const PORT = process.env.PORT || 3000;

// 会话配置
app.use(session({
  secret: process.env.SESSION_SECRET || 'discord-webhook-secret-key-2024',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false, // 如果使用HTTPS，设置为true
    maxAge: 24 * 60 * 60 * 1000 // 24小时
  }
}));

// 代理配置文件路径
const PROXY_CONFIG_FILE = path.join(__dirname, 'data', 'proxy-config.json');
const USERS_FILE = path.join(__dirname, 'data', 'users.json');

// 默认代理配置
const DEFAULT_PROXY_CONFIG = {
    enabled: false,
    type: 'http', // http, https, socks4, socks5
    host: '127.0.0.1',
    port: 7890,
    username: '',
    password: '',
    url: '' // 完整的代理URL，优先级最高
};

// 默认管理员账户
const DEFAULT_ADMIN = {
    username: process.env.ADMIN_USERNAME || 'admin',
    password: process.env.ADMIN_PASSWORD || 'admin123', // 默认密码，首次启动后应该修改
    role: 'admin',
    createdAt: moment().format('YYYY-MM-DD HH:mm:ss')
};

// 读取用户配置
function loadUsers() {
    try {
        if (fs.existsSync(USERS_FILE)) {
            return fs.readJsonSync(USERS_FILE);
        }
    } catch (error) {
        console.error('读取用户配置失败:', error);
    }
    return [];
}

// 保存用户配置
function saveUsers(users) {
    try {
        fs.writeJsonSync(USERS_FILE, users, { spaces: 2 });
        return true;
    } catch (error) {
        console.error('保存用户配置失败:', error);
        return false;
    }
}

// 初始化默认管理员账户
function initializeDefaultAdmin() {
    const users = loadUsers();
    if (users.length === 0) {
        const hashedPassword = bcrypt.hashSync(DEFAULT_ADMIN.password, 10);
        const adminUser = {
            ...DEFAULT_ADMIN,
            id: Date.now().toString(),
            password: hashedPassword
        };
        users.push(adminUser);
        saveUsers(users);
        console.log('已创建默认管理员账户:');
        console.log('用户名: admin');
        console.log('密码: admin123');
        console.log('请登录后立即修改密码！');
    }
}

// 认证中间件
function requireAuth(req, res, next) {
    if (req.session && req.session.user) {
        return next();
    } else {
        return res.status(401).json({ error: '请先登录', needLogin: true });
    }
}

// 读取代理配置
function loadProxyConfig() {
    try {
        if (fs.existsSync(PROXY_CONFIG_FILE)) {
            const config = fs.readJsonSync(PROXY_CONFIG_FILE);
            return { ...DEFAULT_PROXY_CONFIG, ...config };
        }
    } catch (error) {
        console.error('读取代理配置失败:', error);
    }
    return DEFAULT_PROXY_CONFIG;
}

// 保存代理配置
function saveProxyConfig(config) {
    try {
        fs.writeJsonSync(PROXY_CONFIG_FILE, config, { spaces: 2 });
        return true;
    } catch (error) {
        console.error('保存代理配置失败:', error);
        return false;
    }
}

// 构建代理URL
function buildProxyUrl(config) {
    if (config.url) {
        return config.url;
    }
    
    let proxyUrl = `${config.type}://`;
    
    // 添加认证信息
    if (config.username && config.password) {
        proxyUrl += `${encodeURIComponent(config.username)}:${encodeURIComponent(config.password)}@`;
    }
    
    proxyUrl += `${config.host}:${config.port}`;
    
    return proxyUrl;
}

// 创建代理Agent
function createProxyAgent(config) {
    if (!config.enabled) {
        return null;
    }
    
    const proxyUrl = buildProxyUrl(config);
    
    try {
        if (config.type === 'socks4' || config.type === 'socks5') {
            return new SocksProxyAgent(proxyUrl);
        } else {
            return new HttpsProxyAgent(proxyUrl);
        }
    } catch (error) {
        console.error('创建代理Agent失败:', error);
        return null;
    }
}

// 加载代理配置
let PROXY_CONFIG = loadProxyConfig();
let proxyAgent = createProxyAgent(PROXY_CONFIG);

console.log('代理配置:', {
    enabled: PROXY_CONFIG.enabled,
    type: PROXY_CONFIG.type,
    host: PROXY_CONFIG.host,
    port: PROXY_CONFIG.port,
    hasAuth: !!(PROXY_CONFIG.username && PROXY_CONFIG.password),
    agent: proxyAgent ? '已启用' : '未启用'
});

// 中间件配置
app.use(cors({
    origin: true,
    credentials: true
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 数据存储文件路径
const DATA_DIR = path.join(__dirname, 'data');
const WEBHOOKS_FILE = path.join(DATA_DIR, 'webhooks.json');
const MESSAGES_FILE = path.join(DATA_DIR, 'messages.json');

// 确保数据目录存在
fs.ensureDirSync(DATA_DIR);

// 初始化数据文件
if (!fs.existsSync(WEBHOOKS_FILE)) {
  fs.writeJsonSync(WEBHOOKS_FILE, []);
}
if (!fs.existsSync(MESSAGES_FILE)) {
  fs.writeJsonSync(MESSAGES_FILE, []);
}

// 初始化默认管理员
initializeDefaultAdmin();

// 工具函数：读取数据
function readWebhooks() {
  try {
    return fs.readJsonSync(WEBHOOKS_FILE);
  } catch (error) {
    console.error('读取Webhook数据失败:', error);
    return [];
  }
}

function readMessages() {
  try {
    return fs.readJsonSync(MESSAGES_FILE);
  } catch (error) {
    console.error('读取消息数据失败:', error);
    return [];
  }
}

// 工具函数：写入数据
function writeWebhooks(webhooks) {
  try {
    fs.writeJsonSync(WEBHOOKS_FILE, webhooks, { spaces: 2 });
  } catch (error) {
    console.error('写入Webhook数据失败:', error);
  }
}

function writeMessages(messages) {
  try {
    fs.writeJsonSync(MESSAGES_FILE, messages, { spaces: 2 });
  } catch (error) {
    console.error('写入消息数据失败:', error);
  }
}

// 登录页面路由
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});



// 基础路由 - 需要认证
app.get('/', (req, res) => {
  // 检查是否已登录
  if (req.session && req.session.user) {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  } else {
    res.redirect('/login');
  }
});

// 静态文件服务配置
// 公共资源（不需要认证）
app.use('/css', express.static(path.join(__dirname, 'public', 'css')));
app.use('/js', express.static(path.join(__dirname, 'public', 'js')));
app.use('/images', express.static(path.join(__dirname, 'public', 'images')));

// 需要认证的静态文件
app.use('/app.js', requireAuth, express.static(path.join(__dirname, 'public', 'app.js')));
app.use('/index.html', requireAuth, express.static(path.join(__dirname, 'public', 'index.html')));

// 登录API
app.post('/api/login', async (req, res) => {
  try {

    const { username, password } = req.body;
    
    if (!username || !password) {

      return res.status(400).json({ error: '用户名和密码不能为空' });
    }
    
    const users = loadUsers();

    const user = users.find(u => u.username === username);
    
    if (!user) {

      return res.status(401).json({ error: '用户名或密码错误' });
    }
    
    const isValidPassword = bcrypt.compareSync(password, user.password);
    if (!isValidPassword) {

      return res.status(401).json({ error: '用户名或密码错误' });
    }
    
    
    
    // 创建会话
    req.session.user = {
      id: user.id,
      username: user.username,
      role: user.role
    };
    
    res.json({
      success: true,
      message: '登录成功',
      user: {
        username: user.username,
        role: user.role
      }
    });
    
  } catch (error) {
    console.error('登录失败:', error);
    res.status(500).json({ error: '登录失败' });
  }
});

// 登出API
app.post('/api/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: '登出失败' });
    }
    res.json({ success: true, message: '登出成功' });
  });
});

// 获取当前用户信息
app.get('/api/user', requireAuth, (req, res) => {
  res.json({
    user: req.session.user
  });
});

// 修改密码
app.post('/api/change-password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: '当前密码和新密码不能为空' });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ error: '新密码长度至少6位' });
    }
    
    const users = loadUsers();
    const userIndex = users.findIndex(u => u.id === req.session.user.id);
    
    if (userIndex === -1) {
      return res.status(404).json({ error: '用户不存在' });
    }
    
    const user = users[userIndex];
    const isValidPassword = bcrypt.compareSync(currentPassword, user.password);
    
    if (!isValidPassword) {
      return res.status(401).json({ error: '当前密码错误' });
    }
    
    // 更新密码
    const hashedNewPassword = bcrypt.hashSync(newPassword, 10);
    users[userIndex].password = hashedNewPassword;
    users[userIndex].updatedAt = moment().format('YYYY-MM-DD HH:mm:ss');
    
    saveUsers(users);
    
    res.json({
      success: true,
      message: '密码修改成功'
    });
    
  } catch (error) {
    console.error('修改密码失败:', error);
    res.status(500).json({ error: '修改密码失败' });
  }
});

// 获取代理配置 - 需要认证
app.get('/api/proxy-config', requireAuth, (req, res) => {
  // 不返回密码等敏感信息
  const safeConfig = {
    enabled: PROXY_CONFIG.enabled,
    type: PROXY_CONFIG.type,
    host: PROXY_CONFIG.host,
    port: PROXY_CONFIG.port,
    username: PROXY_CONFIG.username,
    hasPassword: !!PROXY_CONFIG.password,
    url: PROXY_CONFIG.url,
    status: proxyAgent ? '已启用' : '未启用'
  };
  res.json(safeConfig);
});

// 设置代理配置 - 需要认证
app.post('/api/proxy-config', requireAuth, (req, res) => {
  try {
    const { enabled, type, host, port, username, password, url } = req.body;
    
    // 验证输入
    if (enabled && !url) {
      if (!host || !port) {
        return res.status(400).json({ error: '请提供代理主机和端口' });
      }
      if (!['http', 'https', 'socks4', 'socks5'].includes(type)) {
        return res.status(400).json({ error: '不支持的代理类型' });
      }
    }
    
    // 更新配置
    const newConfig = {
      enabled: enabled !== undefined ? enabled : PROXY_CONFIG.enabled,
      type: type || PROXY_CONFIG.type,
      host: host || PROXY_CONFIG.host,
      port: port || PROXY_CONFIG.port,
      username: username !== undefined ? username : PROXY_CONFIG.username,
      password: password !== undefined ? password : PROXY_CONFIG.password,
      url: url !== undefined ? url : PROXY_CONFIG.url
    };
    
    // 保存配置
    if (!saveProxyConfig(newConfig)) {
      return res.status(500).json({ error: '保存代理配置失败' });
    }
    
    // 更新全局配置
    PROXY_CONFIG = newConfig;
    proxyAgent = createProxyAgent(PROXY_CONFIG);
    
    // 更新app.locals中的代理agent
    app.locals.proxyAgent = proxyAgent;
    

    
    res.json({
      success: true,
      message: '代理配置已更新',
      config: {
        enabled: PROXY_CONFIG.enabled,
        type: PROXY_CONFIG.type,
        host: PROXY_CONFIG.host,
        port: PROXY_CONFIG.port,
        username: PROXY_CONFIG.username,
        hasPassword: !!PROXY_CONFIG.password,
        url: PROXY_CONFIG.url,
        status: proxyAgent ? '已启用' : '未启用'
      }
    });
  } catch (error) {
    console.error('更新代理配置失败:', error);
    res.status(500).json({ error: '更新代理配置失败: ' + error.message });
  }
});

// 测试代理连接 - 需要认证
app.post('/api/proxy-test', requireAuth, async (req, res) => {
  try {
    if (!proxyAgent) {
      return res.status(400).json({ error: '代理未启用' });
    }
    
    const axios = require('axios');
    const testInstance = axios.create({
      timeout: 10000,
      httpsAgent: proxyAgent,
      httpAgent: proxyAgent
    });
    
    // 测试连接Discord API
    const testUrl = 'https://discord.com/api/v10/gateway';
    const response = await testInstance.get(testUrl);
    
    if (response.status === 200) {
      res.json({
        success: true,
        message: '代理连接测试成功',
        data: response.data
      });
    } else {
      res.status(400).json({
        success: false,
        message: '代理连接测试失败',
        status: response.status
      });
    }
  } catch (error) {
    console.error('代理测试失败:', error);
    res.status(500).json({
      success: false,
      message: '代理测试失败: ' + error.message
    });
  }
});

// 导出代理配置供路由使用
app.locals.proxyAgent = proxyAgent;

// 引入路由模块 - 需要认证
const webhookRoutes = require('./routes/webhooks');
const messageRoutes = require('./routes/messages');

app.use('/api/webhooks', requireAuth, webhookRoutes);
app.use('/api/messages', requireAuth, messageRoutes);

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: '服务器内部错误' });
});

// 404处理
app.use((req, res) => {
  res.status(404).json({ error: '页面未找到' });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`Discord Webhook Dashboard 服务器运行在端口 ${PORT}`);
  console.log(`访问地址: http://localhost:${PORT}`);
  console.log(`登录页面: http://localhost:${PORT}/login`);
  console.log(`代理状态: ${proxyAgent ? '已启用' : '未启用'}`);
  if (proxyAgent) {
    console.log(`代理地址: ${PROXY_CONFIG.type}://${PROXY_CONFIG.host}:${PROXY_CONFIG.port}`);
  }
});

module.exports = app; 