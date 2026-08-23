# 社交聊天应用

基于 Cloudflare D1 数据库的社交聊天应用，支持聊天、发红包、转账、朋友圈（好友可见）、评论、加好友、钱包功能，以及管理员后台。

## 后端架构

项目有两个后端实现，按需使用：

| 文件 | 用途 | 数据库 | 部署方式 |
|------|------|--------|----------|
| `mock-server.js` | 本地开发 | 内存（JSON 文件） | `npm run mock` |
| `src/worker.js` | 生产环境 | Cloudflare D1（SQLite） | Cloudflare Pages 自动部署 |

两者共享同一套 API 接口，本地开发时通过 Vite 代理将 `/api/*` 转发至 mock-server（端口 3456）。

**注意：** 本地 mock-server 的管理员功能完整；生产 worker.js 也已同步所有 Admin API。

## 客户端

| 客户端 | 技术栈 | 路径 | 说明 |
|--------|--------|------|------|
| 网页版 | React 19 + Vite 8 | `src/` | Cloudflare Pages 自动部署 |
| Android 原生 | Kotlin + Jetpack Compose | `android-native/` | 纯原生，CI 自动构建 APK |
| Android 套壳 | Capacitor + React | `android/` | Web 视图打包为 APK |

## 功能模块

| 模块 | 功能 |
|------|------|
| 登录注册 | 用户注册/登录，JWT 认证，用户名唯一性校验 |
| 联系人 | 搜索用户、添加好友、聊天记录 |
| 聊天 | 实时消息发送/接收 |
| 朋友圈 | 发布动态、点赞、**评论**、删除（仅好友可见，类似微信） |
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
│   │   ├── LoginPage.jsx           # 登录页
│   │   ├── RegisterPage.jsx        # 注册页
│   │   ├── ContactsPage.jsx        # 联系人列表
│   │   ├── ChatPage.jsx            # 聊天界面
│   │   ├── MomentsPage.jsx         # 朋友圈（含评论）
│   │   ├── ProfilePage.jsx         # 我的页面（含钱包余额明细）
│   │   ├── TransactionPage.jsx     # 余额明细页
│   │   ├── AdminLoginPage.jsx      # 管理员登录页
│   │   └── AdminPage.jsx           # 管理员后台主界面
│   ├── App.jsx                 # 主应用（Tab 导航 + 路由）
│   ├── AppContext.jsx          # 全局状态管理
│   ├── api.js                  # API 请求封装
│   └── worker.js               # Cloudflare Worker API
├── android-native/             # Kotlin + Jetpack Compose 原生 Android 应用
│   ├── app/src/main/java/com/chat/app/
│   │   ├── ui/
│   │   │   ├── auth/           # 登录注册界面
│   │   │   ├── home/           # 主页导航
│   │   │   ├── chats/          # 聊天界面
│   │   │   ├── moments/        # 朋友圈界面
│   │   │   ├── contacts/       # 联系人界面
│   │   │   └── profile/        # 个人页面
│   │   ├── data/
│   │   │   ├── api/            # Retrofit API 接口
│   │   │   ├── model/          # 数据模型
│   │   │   ├── repository/     # 数据仓库
│   │   │   └── di/             # 依赖注入容器
│   │   └── util/               # 工具类
│   ├── gradle/                 # Gradle Wrapper
│   └── build.gradle.kts        # 项目构建配置
├── android/                    # Capacitor 套壳 Android 应用
├── mock-server.js              # 本地 Mock 服务器（含 Admin API）
├── data.json                   # 测试数据
├── wrangler.toml               # Cloudflare Wrangler 配置
├── vite.config.js              # Vite 构建配置
└── .github/workflows/
    ├── build-android-native.yml  # Android 原生 CI
    └── build-android.yml         # Capacitor Android CI
```

## 部署

### 网页 + Worker API（Git 自动部署）
推送代码到 `main` 分支，Cloudflare Pages 会自动构建部署网页前端，Worker API 随代码一并更新。

### Android 原生应用（CI 自动构建）
推送代码到 `main` 分支，GitHub Actions 会自动构建 Debug APK 并上传为构建产物：

```bash
# 本地查看构建日志
gh run watch --watch
```

### Capacitor Android 应用（CI 自动构建）
同理，`build-android.yml` 会构建带 WebView 的 APK。

## API 端点

### 认证
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /auth/register | 注册（用户名唯一） |
| POST | /auth/login | 登录 |
| GET | /auth/me | 获取当前用户 |
| PUT | /auth/password | 修改登录密码 |
| PUT | /auth/chat_code | 修改 chat 号 |
| DELETE | /auth/account | 注销账号 |

### 社交
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /contacts | 获取联系人列表 |
| GET | /contacts/search?q=xxx | 搜索用户 |
| POST | /contacts/add | 添加好友 |
| GET | /chats/:chatId/messages | 获取消息 |
| POST | /chats/:chatId/messages | 发送消息 |
| DELETE | /chats/:chatId/clear | 清空聊天记录 |
| GET | /moments | 获取朋友圈（仅好友+自己的动态） |
| POST | /moments | 发布动态 |
| POST | /moments/:id/like | 点赞 |
| GET | /moments/:id/comments | 获取评论 |
| POST | /moments/:id/comments | 发表评论 |
| DELETE | /moments/:id | 删除动态 |

### 钱包
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /wallet/balance | 查询余额 |
| POST | /wallet/set-password | 设置支付密码 |
| POST | /wallet/redpacket/send | 发红包 |
| POST | /wallet/redpacket/:id/claim | 抢红包 |
| GET | /wallet/transactions | 交易记录 |
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
