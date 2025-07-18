# Discord Webhook 管理面板

一个功能完整的Discord Webhook消息推送系统，提供现代化的Web管理界面。

## 功能特性

### 🎯 核心功能
- **Webhook管理**: 添加、编辑、删除和测试Discord Webhook
- **多种消息类型**: 支持文本消息、嵌入消息和文件消息
- **实时预览**: 发送前预览消息效果
- **消息历史**: 完整的消息发送历史记录
- **统计分析**: 实时统计数据和成功率分析

### 🚀 高级功能
- **批量测试**: 一键测试所有活跃Webhook
- **文件上传**: 支持拖拽上传文件（最大8MB）
- **数据导出**: 导出Webhook和消息数据
- **响应式设计**: 完美适配桌面和移动设备
- **实时通知**: Toast提示和状态更新

### 🎨 界面特色
- **现代化UI**: 基于Bootstrap 5的美观界面
- **Discord主题**: 采用Discord官方配色方案
- **流畅动画**: 丰富的CSS动画效果
- **直观操作**: 简洁明了的用户交互

## 安装和部署

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

4. **访问应用**
   打开浏览器访问: `http://localhost:3000`

### 生产部署

1. **使用PM2部署**
   ```bash
   # 安装PM2
   npm install -g pm2
   
   # 启动应用
   pm2 start server.js --name "discord-webhook"
   
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
       }
   }
   ```

## 使用指南

### 1. 添加Webhook

1. 在Discord服务器中创建Webhook：
   - 进入频道设置 → 整合 → Webhook
   - 点击"新建Webhook"
   - 复制Webhook URL

2. 在管理面板中添加：
   - 点击"添加Webhook"按钮
   - 填写名称和URL
   - 添加描述（可选）
   - 点击"保存"

### 2. 发送消息

#### 文本消息
- 选择Webhook
- 输入消息内容
- 可选：自定义用户名和头像
- 可选：启用TTS（文本转语音）

#### 嵌入消息
- 填写标题和描述
- 选择颜色
- 可选：添加作者、图片、页脚

#### 文件消息
- 拖拽或点击上传文件
- 添加文件说明
- 支持图片、文档等多种格式

### 3. 管理功能

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

## API接口

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

## 项目结构

```
discord-webhook-dashboard/
├── server.js              # 主服务器文件
├── package.json           # 项目配置
├── README.md             # 说明文档
├── routes/               # API路由
│   ├── webhooks.js       # Webhook管理
│   └── messages.js       # 消息处理
├── public/               # 前端文件
│   ├── index.html        # 主页面
│   └── app.js           # 前端逻辑
├── data/                 # 数据存储（自动创建）
│   ├── webhooks.json     # Webhook数据
│   └── messages.json     # 消息历史
└── uploads/              # 文件上传目录（自动创建）
```

## 技术栈

### 后端
- **Node.js**: 服务器运行环境
- **Express.js**: Web框架
- **Axios**: HTTP客户端
- **Multer**: 文件上传处理
- **Moment.js**: 时间处理
- **fs-extra**: 文件系统操作

### 前端
- **Bootstrap 5**: UI框架
- **Bootstrap Icons**: 图标库
- **Prism.js**: 代码高亮
- **原生JavaScript**: 前端逻辑

## 配置选项

### 环境变量
```bash
# 服务器端口（默认3000）
PORT=3000

# 数据存储目录（默认./data）
DATA_DIR=./data

# 上传文件目录（默认./uploads）
UPLOAD_DIR=./uploads

# 最大文件大小（默认8MB）
MAX_FILE_SIZE=8388608
```

### 自定义配置
可以通过修改`server.js`中的配置来自定义：
- 文件大小限制
- 消息历史保留数量
- 数据存储位置
- CORS设置

## 安全建议

1. **生产环境**：
   - 使用HTTPS
   - 设置防火墙规则
   - 定期备份数据

2. **访问控制**：
   - 考虑添加身份验证
   - 限制API访问频率
   - 使用反向代理

3. **数据保护**：
   - 定期清理上传文件
   - 备份重要数据
   - 监控磁盘使用

## 故障排除

### 常见问题

1. **Webhook无效**
   - 检查URL格式是否正确
   - 确认Webhook在Discord中仍然存在
   - 验证频道权限

2. **文件上传失败**
   - 检查文件大小是否超限
   - 确认uploads目录权限
   - 验证文件类型

3. **消息发送失败**
   - 查看错误详情
   - 检查网络连接
   - 验证消息内容格式

### 日志查看
```bash
# 查看PM2日志
pm2 logs discord-webhook

# 查看实时日志
pm2 logs discord-webhook --lines 100
```

## 贡献指南

欢迎提交Issue和Pull Request来改进这个项目！

### 开发环境设置
1. Fork项目
2. 创建功能分支
3. 提交更改
4. 创建Pull Request

### 代码规范
- 使用ES6+语法
- 遵循现有代码风格
- 添加适当的注释
- 测试新功能

## 许可证

MIT License - 详见LICENSE文件

## 更新日志

### v1.0.0
- 初始版本发布
- 完整的Webhook管理功能
- 多种消息类型支持
- 现代化Web界面
- 完善的API接口

---

如有问题或建议，请提交Issue或联系开发者。 