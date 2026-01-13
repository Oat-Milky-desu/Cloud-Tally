# 智能记账 - AI Expense Tracker

基于 Cloudflare Pages + D1 的 AI 驱动个人记账系统

[![Deploy to Cloudflare Pages](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/Oat-Milky-desu/payment-record)


## ✨ 功能特性

- 📝 **智能记账** - 支持自然语言输入，AI 自动解析
- 📸 **图片识别** - 上传小票/发票图片自动提取信息
- 📊 **数据分析** - AI 生成财务分析报告和建议
- 🔐 **用户认证** - 基于环境变量的安全认证
- 📈 **可视化图表** - 直观的收支分析图表
- 🌓 **主题切换** - 支持日间/夜间模式

## 🚀 一键部署

### 方式一：使用部署按钮（推荐）

1. **Fork 本仓库** 到你的 GitHub 账户
2. **点击上方的蓝色按钮** "Deploy to Cloudflare Pages"
3. **登录 Cloudflare 账户** 并授权 GitHub
4. **填写环境变量**：
   - `AUTH_USERNAME` - 登录用户名
   - `AUTH_PASSWORD` - 登录密码（请使用强密码！）
   - `AI_API_KEY` - OpenAI 兼容的 API 密钥
5. **等待部署完成**，系统会自动创建 D1 数据库并初始化
6. **访问你的应用** 🎉

### 方式二：手动部署

### 步骤 1: 登录 Cloudflare

```bash
npx wrangler login
```

### 步骤 2: 创建 D1 数据库

```bash
npx wrangler d1 create payment-records
```

命令成功后会返回类似以下的信息：
```
✅ Successfully created DB 'payment-records' in region APAC
Created your new D1 database.

[[d1_databases]]
binding = "DB"
database_name = "payment-records"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"  <-- 复制这个 ID
```

### 步骤 3: 更新配置文件

编辑 `wrangler.toml`，将 `database_id` 替换为上一步获得的实际 ID：

```toml
[[d1_databases]]
binding = "DB"
database_name = "payment-records"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"  # <-- 替换为你的实际 ID
```

### 步骤 4: 初始化数据库

```bash
npx wrangler d1 execute payment-records --remote --file=./schema.sql
```

### 步骤 5: 配置环境变量

在 [Cloudflare Dashboard](https://dash.cloudflare.com) 中配置环境变量：

1. 进入 **Workers & Pages**
2. 选择你的项目（部署后会出现）
3. 进入 **Settings** → **Environment variables**
4. 添加以下变量：

| 变量名 | 必填 | 说明 | 示例 |
|--------|------|------|------|
| `AUTH_USERNAME` | ✅ | 登录用户名 | `admin` |
| `AUTH_PASSWORD` | ✅ | 登录密码 | `YourSecurePassword123!` |
| `AI_API_KEY` | ✅ | OpenAI 兼容 API 密钥 | `sk-xxxxxxxx` |
| `SESSION_EXPIRY_HOURS` | ❌ | 会话有效期（小时），默认 24 | `48` |
| `AI_API_BASE` | ❌ | API 基础 URL | `https://api.openai.com/v1` |
| `AI_MODEL` | ❌ | 文本模型，默认 gpt-4o-mini | `gpt-4o` |
| `AI_VISION_MODEL` | ❌ | 视觉模型，默认 gpt-4o | `gpt-4o` |

> ⚠️ **重要**: 请使用强密码！生产环境切勿使用默认密码。

### 步骤 6: 部署

```bash
npx wrangler pages deploy src
```

部署完成后，访问返回的 URL 即可使用。

---

## 🛠️ 本地开发

### 前置要求

- Node.js 18+
- npm 或 pnpm

### 开发步骤

1. **安装依赖**
```bash
npm install
```

2. **设置本地数据库 ID**

编辑 `wrangler.toml`，临时设置 `database_id = "local"` 用于本地开发。

3. **初始化本地数据库**
```bash
npx wrangler d1 execute payment-records --local --file=./schema.sql
```

4. **启动开发服务器**
```bash
npm run dev
```

5. **访问应用**

打开浏览器访问 http://localhost:8788

默认登录凭据：
- 用户名: `admin`
- 密码: `admin123`

> 💡 本地开发完成后，记得将 `database_id` 改回生产环境的实际 ID。

---

## 📁 项目结构

```
payment-record/
├── functions/                    # Cloudflare Functions API
│   ├── _middleware.js           # 全局认证中间件
│   └── api/
│       ├── auth/                # 认证相关 API
│       │   ├── login.js
│       │   ├── logout.js
│       │   └── verify.js
│       ├── records/             # 账目 CRUD
│       │   ├── index.js
│       │   └── [id].js
│       ├── categories/          # 类别管理
│       │   └── index.js
│       ├── ai/                  # AI 功能
│       │   ├── parse.js
│       │   ├── ocr.js
│       │   └── analyze.js
│       └── stats/               # 统计数据
│           └── index.js
├── src/                         # 前端静态文件
│   ├── index.html              # 主页面
│   ├── login.html              # 登录页面
│   ├── css/
│   │   └── style.css
│   └── js/
│       ├── app.js              # 主应用逻辑
│       ├── api.js              # API 封装
│       ├── auth.js             # 认证模块
│       ├── ai.js               # AI 功能
│       └── charts.js           # 图表配置
├── schema.sql                   # 数据库模式
├── wrangler.toml               # Wrangler 配置
├── package.json
└── README.md
```

---

## 🔧 API 文档

### 认证

- `POST /api/auth/login` - 用户登录
- `POST /api/auth/logout` - 用户登出
- `GET /api/auth/verify` - 验证会话

### 账目

- `GET /api/records` - 获取账目列表
- `POST /api/records` - 创建账目
- `GET /api/records/:id` - 获取单个账目
- `PUT /api/records/:id` - 更新账目
- `DELETE /api/records/:id` - 删除账目

### 类别

- `GET /api/categories` - 获取类别列表
- `POST /api/categories` - 创建类别

### 统计

- `GET /api/stats` - 获取统计数据

### AI

- `POST /api/ai/parse` - 自然语言解析
- `POST /api/ai/ocr` - 图片识别
- `POST /api/ai/analyze` - 生成分析报告

---

## 📝 使用示例

### 自然语言记账

```
"今天午餐花了35元"
→ 自动解析为：支出 ¥35.00 餐饮 今天

"收到工资8000元"
→ 自动解析为：收入 ¥8000.00 工资 今天

"昨天打车去机场花了120"
→ 自动解析为：支出 ¥120.00 交通 昨天
```

### 图片识别

支持上传以下类型的图片：
- 购物小票
- 餐饮发票
- 交通发票
- 各类账单

---

## ⚠️ 注意事项

1. **安全**: 生产环境请务必使用强密码
2. **AI Key**: AI 功能需要有效的 OpenAI 兼容 API Key
3. **D1 绑定**: 部署前必须正确配置 `database_id`
4. **HTTPS**: Cloudflare Pages 默认启用 HTTPS

---

## 📄 License

MIT License
