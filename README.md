# Discord Webhook 管理面板

一个功能完整的Discord Webhook消息推送系统，提供现代化的Web管理界面和完善的安全认证机制。

## 🌟 功能特性

### 🔐 安全认证
- **用户登录系统**: 基于session的安全认证机制
- **密码加密**: 使用bcrypt加密存储用户密码
- **会话管理**: 24小时会话有效期，自动登录状态检查
- **权限控制**: 所有API接口都需要认证访问
- **默认管理员**: 首次启动自动创建管理员账户

### 🎯 核心功能
- **Webhook管理**: 添加、编辑、删除和测试Discord Webhook
- **多种消息类型**: 支持文本消息、嵌入消息和文件消息
- **实时预览**: 发送前预览消息效果
- **消息历史**: 完整的消息发送历史记录
- **统计分析**: 实时统计数据和成功率分析

### 🚀 高级功能
- **代理支持**: 完整的代理配置功能，支持HTTP/HTTPS/SOCKS4/SOCKS5
- **代理测试**: 一键测试代理连接状态
- **批量测试**: 一键测试所有活跃Webhook
- **文件上传**: 支持拖拽上传文件（最大8MB）
- **数据导出**: 导出Webhook和消息数据
- **响应式设计**: 完美适配桌面和移动设备
- **实时通知**: 自定义Toast提示和状态更新

### 🎨 现代化UI
- **Ant Design风格**: 采用Ant Design设计语言
- **简洁登录页**: 现代化的登录界面设计
- **自定义模态框**: 流畅的交互体验
- **动画效果**: 丰富的CSS动画和过渡效果
- **用户友好**: 直观的操作界面和清晰的状态反馈

## 📦 安装和部署

### 环境要求
- Node.js 14.0 或更高版本
- npm 或 yarn 包管理器

### 快速开始

1. **克隆或下载项目**
   ```bash
   # 如果是git仓库
   git clone <repository-url>
   cd discord-webhook-dashboard
   
   # 或者直接在项目目录中
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **启动服务器**
   ```bash
   # 开发模式（自动重启）
   npm run dev
   
   # 或生产模式
   npm start
   ```

4. **首次登录**
   - 打开浏览器访问: `http://localhost:3000`
   - 系统会自动跳转到登录页面
   - 使用默认管理员账户登录：
     - 用户名: `admin`
     - 密码: `admin123`
   - **重要**: 登录后请立即修改默认密码！

### 生产部署

1. **使用PM2部署**
   ```bash
   # 安装PM2
   npm install -g pm2
   
   # 启动应用
   pm2 start discord_server.js --name "discord-webhook"
   
   # 设置开机自启
   pm2 startup
   pm2 save
   ```

2. **使用Docker部署**
   ```dockerfile
   FROM node:16-alpine
   WORKDIR /app
   COPY package*.json ./
   RUN npm install --production
   COPY . .
   EXPOSE 3000
   CMD ["npm", "start"]
   ```

3. **Nginx反向代理**
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```

## 📖 使用指南

### 🔑 首次使用

1. **启动系统**
   - 运行 `npm start` 启动服务器
   - 系统会自动创建默认管理员账户
   - 控制台会显示登录信息

2. **登录系统**
   - 访问 `http://localhost:3000`
   - 使用默认账户登录（admin/admin123）
   - 立即修改密码确保安全

### 🔧 代理配置

系统支持多种代理类型，适用于网络受限环境：

1. **支持的代理类型**:
   - HTTP代理
   - HTTPS代理
   - SOCKS4代理
   - SOCKS5代理

2. **配置方式**:
   - **方式一**: 分别设置主机、端口、认证信息
   - **方式二**: 使用完整代理URL（优先级更高）

3. **代理测试**:
   - 配置完成后可点击"测试连接"
   - 系统会测试到Discord API的连接

### 📝 Webhook管理

#### 1. 添加Webhook

1. 在Discord服务器中创建Webhook：
   - 进入频道设置 → 整合 → Webhook
   - 点击"新建Webhook"
   - 复制Webhook URL

2. 在管理面板中添加：
   - 点击"添加Webhook"按钮
   - 填写名称和URL
   - 添加描述（可选）
   - 点击"保存"

#### 2. 发送消息

**文本消息**
- 选择Webhook
- 输入消息内容
- 可选：自定义用户名和头像
- 可选：启用TTS（文本转语音）

**嵌入消息**
- 填写标题和描述
- 选择颜色
- 可选：添加作者、图片、页脚

**文件消息**
- 拖拽或点击上传文件
- 添加文件说明
- 支持图片、文档等多种格式

### 📊 管理功能

#### Webhook管理
- **测试**: 发送测试消息验证Webhook
- **编辑**: 修改名称、URL、描述和状态
- **详情**: 查看Discord中的Webhook信息
- **删除**: 永久删除Webhook

#### 消息历史
- 查看所有发送的消息记录
- 按Webhook过滤历史
- 查看消息详情和错误信息
- 清除历史记录

#### 统计分析
- 总Webhook数量
- 总消息数量
- 发送成功率
- 活跃Webhook数量

## 🔌 API接口

### 认证接口

```javascript
// 登录
POST /api/login
{
  "username": "用户名",
  "password": "密码"
}

// 登出
POST /api/logout

// 获取当前用户信息
GET /api/user

// 修改密码
POST /api/change-password
{
  "currentPassword": "当前密码",
  "newPassword": "新密码"
}
```

### 代理配置接口

```javascript
// 获取代理配置
GET /api/proxy-config

// 设置代理配置
POST /api/proxy-config
{
  "enabled": true,
  "type": "http", // http, https, socks4, socks5
  "host": "127.0.0.1",
  "port": 7890,
  "username": "用户名（可选）",
  "password": "密码（可选）",
  "url": "完整URL（可选，优先级最高）"
}

// 测试代理连接
POST /api/proxy-test
```

### Webhook接口

```javascript
// 获取所有Webhook
GET /api/webhooks

// 添加Webhook
POST /api/webhooks
{
  "name": "Webhook名称",
  "webhookUrl": "Discord Webhook URL",
  "description": "描述"
}

// 更新Webhook
PUT /api/webhooks/:id
{
  "name": "新名称",
  "isActive": true
}

// 删除Webhook
DELETE /api/webhooks/:id

// 测试Webhook
POST /api/webhooks/:id/test

// 获取Webhook信息
GET /api/webhooks/:id/info
```

### 消息接口

```javascript
// 发送文本消息
POST /api/messages/send
{
  "webhookId": "webhook_id",
  "content": "消息内容",
  "username": "用户名",
  "avatarUrl": "头像URL",
  "tts": false
}

// 发送嵌入消息
POST /api/messages/send-embed
{
  "webhookId": "webhook_id",
  "embed": {
    "title": "标题",
    "description": "描述",
    "color": 5865242
  }
}

// 发送文件消息
POST /api/messages/send-file
FormData: {
  "webhookId": "webhook_id",
  "file": File,
  "content": "文件说明"
}

// 获取消息历史
GET /api/messages?limit=50&offset=0&webhookId=xxx

// 获取统计数据
GET /api/messages/stats

// 清除消息历史
DELETE /api/messages
```

## 📁 项目结构

```
discord-webhook-dashboard/
├── discord_server.js        # 主服务器文件
├── package.json             # 项目配置和依赖
├── README.md               # 项目说明文档
├── routes/                 # API路由模块
│   ├── webhooks.js         # Webhook管理路由
│   └── messages.js         # 消息处理路由
├── public/                 # 前端静态文件
│   ├── index.html          # 主应用界面
│   ├── login.html          # 登录页面
│   └── app.js             # 前端应用逻辑
├── data/                   # 数据存储目录（自动创建）
│   ├── webhooks.json       # Webhook数据
│   ├── messages.json       # 消息历史数据
│   ├── users.json          # 用户账户数据
│   └── proxy-config.json   # 代理配置数据
└── uploads/                # 文件上传目录（自动创建）
```

## 🛠 技术栈

### 后端技术
- **Node.js**: 服务器运行环境
- **Express.js**: Web应用框架
- **express-session**: 会话管理
- **bcryptjs**: 密码加密
- **Axios**: HTTP客户端
- **Multer**: 文件上传处理
- **Moment.js**: 时间日期处理
- **fs-extra**: 增强的文件系统操作
- **https-proxy-agent**: HTTPS代理支持
- **socks-proxy-agent**: SOCKS代理支持

### 前端技术
- **Ant Design**: 现代化UI组件库
- **原生JavaScript**: 前端应用逻辑
- **CSS3**: 样式和动画效果
- **Fetch API**: HTTP请求处理

## ⚙️ 配置选项

### 环境变量
```bash
# 服务器端口（默认3000）
PORT=3000

# 会话密钥（生产环境请修改）
SESSION_SECRET=your-secret-key-here

# 数据存储目录（默认./data）
DATA_DIR=./data

# 上传文件目录（默认./uploads）
UPLOAD_DIR=./uploads

# 最大文件大小（默认8MB）
MAX_FILE_SIZE=8388608
```

### 自定义配置
可以通过修改`discord_server.js`中的配置来自定义：
- 会话过期时间
- 文件大小限制
- 消息历史保留数量
- 数据存储位置
- CORS设置

## 🔒 安全建议

### 生产环境安全
1. **HTTPS部署**：
   - 使用SSL证书
   - 设置secure cookie
   - 启用HSTS

2. **访问控制**：
   - 修改默认管理员密码
   - 使用强密码策略
   - 考虑添加多用户支持

3. **网络安全**：
   - 配置防火墙规则
   - 使用反向代理
   - 限制API访问频率

### 数据保护
1. **定期备份**：
   - 备份data目录下的所有文件
   - 定期清理上传文件
   - 监控磁盘使用情况

2. **敏感信息**：
   - 代理密码加密存储
   - 定期更换会话密钥
   - 清理日志中的敏感信息

## 🐛 故障排除

### 常见问题

1. **登录相关**
   - 忘记密码：删除`data/users.json`文件重新启动
   - 会话过期：重新登录即可
   - 登录页面样式异常：清除浏览器缓存

2. **代理连接**
   - 代理测试失败：检查代理服务器状态和配置
   - 连接超时：调整代理超时设置
   - 认证失败：验证用户名密码是否正确

3. **Webhook问题**
   - Webhook无效：检查URL格式和Discord中的状态
   - 消息发送失败：查看错误详情和网络连接
   - 文件上传失败：检查文件大小和格式限制

4. **系统问题**
   - 端口占用：修改PORT环境变量
   - 权限错误：检查data和uploads目录权限
   - 内存不足：重启应用或增加系统内存

### 日志查看
```bash
# 查看PM2日志
pm2 logs discord-webhook

# 查看实时日志
pm2 logs discord-webhook --lines 100

# 查看错误日志
pm2 logs discord-webhook --err
```

### 数据恢复
```bash
# 备份数据
cp -r data data_backup

# 恢复数据
cp -r data_backup/* data/

# 重置用户数据（创建新的默认管理员）
rm data/users.json
npm start
```

## 🤝 贡献指南

欢迎提交Issue和Pull Request来改进这个项目！

### 开发环境设置
1. Fork项目到你的GitHub账户
2. 克隆到本地：`git clone <your-fork-url>`
3. 安装依赖：`npm install`
4. 启动开发模式：`npm run dev`
5. 创建功能分支：`git checkout -b feature/your-feature`

### 代码规范
- 使用ES6+语法
- 遵循现有代码风格
- 添加适当的注释
- 测试新功能
- 提交前清理console.log

### 提交流程
1. 确保代码通过测试
2. 提交更改：`git commit -m "feat: 添加新功能"`
3. 推送分支：`git push origin feature/your-feature`
4. 创建Pull Request

## 📄 许可证

MIT License - 详见LICENSE文件

## 📋 更新日志

### v1.2.0 (当前版本)
- ✨ 新增用户认证系统
- ✨ 新增代理配置功能
- ✨ 升级到Ant Design UI风格
- ✨ 新增密码修改功能
- 🐛 修复登录状态检查问题
- 🐛 优化代理连接测试
- 🎨 简化登录页面设计
- 🧹 清理不必要的调试日志

### v1.1.0
- ✨ 完善的消息发送功能
- ✨ 文件上传支持
- ✨ 统计分析功能
- 🐛 修复各种UI和交互问题

### v1.0.0
- 🎉 初始版本发布
- ✨ 完整的Webhook管理功能
- ✨ 多种消息类型支持
- ✨ 现代化Web界面
- ✨ 完善的API接口

---

## 📞 支持与反馈

如有问题或建议，请：
1. 查看故障排除部分
2. 搜索已有的Issues
3. 创建新的Issue详细描述问题
4. 提供错误日志和环境信息

感谢使用Discord Webhook管理面板！🎉 