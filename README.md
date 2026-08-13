# 社交聊天应用

基于 Cloudflare D1 数据库的社交聊天应用，支持聊天、发红包、朋友圈、加好友、登录注册、钱包功能。

## 技术栈

- **前端**: React 19 + Vite 8
- **UI**: 自定义 CSS（暗色主题）
- **图标**: lucide-react
- **后端**: Cloudflare Worker + D1 数据库
- **本地开发**: Express Mock Server

## 功能模块

| 模块 | 功能 |
|------|------|
| 登录注册 | 用户注册/登录，JWT 认证 |
| 联系人 | 搜索用户、添加好友、聊天记录 |
| 聊天 | 实时消息发送/接收 |
| 朋友圈 | 发布动态、点赞、删除 |
| 钱包 | 余额查询、发红包、抢红包、交易记录 |

## 快速开始（本地开发）

### 1. 启动 Mock 服务器（后端模拟）
```bash
npm run mock
```

### 2. 启动前端开发服务器
```bash
npm run dev
```

访问 http://localhost:5173

### 3. 测试账号
- 注册新用户：在注册页面创建账号（注册赠送 ¥100）
- 添加好友：使用另一个浏览器注册不同账号，互相添加
- 发送红包：在我的页面点击"发红包"

## 项目结构

```
chat/
├── src/
│   ├── pages/           # 页面组件
│   │   ├── LoginPage.jsx       # 登录页
│   │   ├── RegisterPage.jsx    # 注册页
│   │   ├── ContactsPage.jsx    # 联系人列表
│   │   ├── ChatPage.jsx        # 聊天界面
│   │   ├── MomentsPage.jsx     # 朋友圈
│   │   └── ProfilePage.jsx     # 我的页面
│   ├── App.jsx           # 主应用（Tab 导航）
│   ├── AppContext.jsx    # 全局状态管理
│   ├── api.js            # API 请求封装
│   └── worker.js         # Cloudflare Worker API
├── mock-server.js        # 本地 Mock 服务器
├── wrangler.toml         # Cloudflare Wrangler 配置
└── vite.config.js        # Vite 构建配置
```

## 部署到 Cloudflare

### 1. 安装 Wrangler CLI
```bash
npm install -g wrangler
```

### 2. 登录 Cloudflare
```bash
npx wrangler login
```

### 3. 部署 Worker
```bash
npx wrangler deploy
```

### 4. 构建前端并部署到 Pages
```bash
npm run build
npx wrangler pages deploy dist
```

## 打包为 Android 应用

使用 Capacitor 将 Web 应用打包为 Android APK：

```bash
# 安装 Capacitor
npm install @capacitor/core @capacitor/cli @capacitor/android

# 初始化
npx cap init

# 修改 capacitor.config.ts 指向生产 URL
# 构建生产版本
npm run build

# 添加 Android 平台
npx cap add android

# 同步文件
npx cap sync

# 打开 Android Studio
npx cap open android
```

## API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /auth/register | 注册 |
| POST | /auth/login | 登录 |
| GET | /auth/me | 获取当前用户 |
| GET | /contacts | 获取联系人列表 |
| GET | /contacts/search?q=xxx | 搜索用户 |
| POST | /contacts/add | 添加好友 |
| GET | /messages/:chatId | 获取消息 |
| POST | /messages/:chatId/send | 发送消息 |
| GET | /moments | 获取朋友圈 |
| POST | /moments | 发布动态 |
| POST | /moments/:id/like | 点赞 |
| DELETE | /moments/:id | 删除动态 |
| GET | /wallet/balance | 查询余额 |
| POST | /wallet/redpacket/send | 发红包 |
| POST | /wallet/redpacket/:id/claim | 抢红包 |
| GET | /wallet/transactions | 交易记录 |
