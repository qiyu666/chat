# 社交聊天应用

基于 Cloudflare D1 数据库的社交聊天应用，支持聊天、发红包、转账、朋友圈、加好友、钱包功能，以及管理员后台。

## 后端架构

项目有两个后端实现，按需使用：

| 文件 | 用途 | 数据库 | 部署方式 |
|------|------|--------|----------|
| `mock-server.js` | 本地开发 | 内存（JSON 文件） | `npm run mock` |
| `src/worker.js` | 生产环境 | Cloudflare D1（SQLite） | `npx wrangler deploy` |

两者共享同一套 API 接口，本地开发时通过 Vite 代理将 `/api/*` 转发至 mock-server（端口 3456）。

**注意：** 本地 mock-server 的管理员功能完整；生产 worker.js 也已同步所有 Admin API。


- **前端**: React 19 + Vite 8
- **UI**: 自定义 CSS（暗色主题）
- **图标**: lucide-react
- **后端**: Cloudflare Worker + D1 数据库
- **本地开发**: Express Mock Server

## 功能模块

| 模块 | 功能 |
|------|------|
| 登录注册 | 用户注册/登录，JWT 认证，用户名唯一性校验 |
| 联系人 | 搜索用户、添加好友、聊天记录 |
| 聊天 | 实时消息发送/接收 |
| 朋友圈 | 发布动态、点赞、删除 |
| 钱包 | 余额查询、发红包、抢红包、转账、余额明细 |
| 管理后台 | 用户管理、交易监控、聊天管理（仅管理员 qiyu 可访问） |

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
- 管理员后台：用账号 `qiyu` / 密码 `1234` 登录，点击"我"页面右上角「后台」按钮进入管理后台
- 添加好友：使用另一个浏览器注册不同账号，互相添加
- 发送红包/转账：在我的页面操作

## 项目结构

```
chat/
├── src/
│   ├── pages/              # 页面组件
│   │   ├── LoginPage.jsx       # 登录页
│   │   ├── RegisterPage.jsx    # 注册页
│   │   ├── ContactsPage.jsx    # 联系人列表
│   │   ├── ChatPage.jsx        # 聊天界面
│   │   ├── MomentsPage.jsx     # 朋友圈
│   │   ├── ProfilePage.jsx     # 我的页面（含钱包余额明细）
│   │   ├── TransactionPage.jsx # 余额明细页
│   │   ├── AdminLoginPage.jsx  # 管理员登录页
│   │   └── AdminPage.jsx       # 管理员后台主界面
│   ├── App.jsx             # 主应用（Tab 导航 + 路由）
│   ├── AppContext.jsx      # 全局状态管理
│   ├── api.js              # API 请求封装
│   └── worker.js           # Cloudflare Worker API
├── mock-server.js          # 本地 Mock 服务器（含 Admin API）
├── data.json               # 测试数据
├── wrangler.toml           # Cloudflare Wrangler 配置
└── vite.config.js          # Vite 构建配置
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

### 3. 创建 D1 数据库（若尚未创建）
```bash
# 创建数据库
npx wrangler d1 create chat

# 建表（worker 首次运行会自动建表，也可手动执行）
npx wrangler d1 execute chat --remote --file=scripts/schema.sql
```

> **D1 数据库说明：** 生产环境的数据库位于 Cloudflare 平台，与本地 mock-server 完全隔离。
> `wrangler.toml` 中配置的 `database_id` 指向远程 D1 实例，数据通过 Worker 自动读写。
> 本地开发时 `.wrangler/state/` 目录保存的是本地模拟的 D1 副本，两者数据不同步。

### 4. 设置环境变量
```bash
npx wrangler secret put JWT_SECRET
# 输入一个强随机密钥（至少 32 位）
```

### 5. 部署
```bash
# 部署 Worker API
npx wrangler deploy

# 构建并部署前端（可选，如需独立托管）
npm run build
npx wrangler pages deploy dist
```

### 6. 验证
部署后可访问 `https://chat-api.<your-workers-subdomain>.workers.dev/api/health`

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

### 认证
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /auth/register | 注册（用户名唯一） |
| POST | /auth/login | 登录 |
| GET | /auth/me | 获取当前用户 |

### 社交
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /contacts | 获取联系人列表 |
| GET | /contacts/search?q=xxx | 搜索用户 |
| POST | /contacts/add | 添加好友 |
| GET | /chats/:chatId/messages | 获取消息 |
| POST | /chats/:chatId/messages | 发送消息 |
| GET | /moments | 获取朋友圈 |
| POST | /moments | 发布动态 |
| POST | /moments/:id/like | 点赞 |

### 钱包
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /wallet/balance | 查询余额 |
| POST | /wallet/redpacket/send | 发红包 |
| POST | /wallet/redpacket/:id/claim | 抢红包 |
| GET | /wallet/transactions | 交易记录 |
| POST | /wallet/set-password | 设置支付密码 |
| POST | /wallet/transfer | 转账 |

### 管理员（仅 qiyu）
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /admin/login | 管理员登录 |
| GET | /admin/stats | 概览统计 |
| GET | /admin/users | 用户列表 |
| DELETE | /admin/users/:id | 删除用户 |
| PUT | /admin/users/:id/balance | 修改用户余额 |
| GET | /admin/transactions | 全部交易记录 |
| GET | /admin/chats | 聊天会话列表 |
| DELETE | /admin/messages/:chatId | 清空聊天记录 |
