# 智能记账 - AI Expense Tracker

基于 Cloudflare Pages + D1 的 AI 驱动个人记账系统

## ✨ 功能特性

- 📝 **智能记账** - 支持自然语言输入，AI 自动解析
- 📸 **图片识别** - 上传小票/发票图片自动提取信息
- 📊 **数据分析** - AI 生成财务分析报告和建议
- 🔐 **用户认证** - 基于环境变量的安全认证
- 📈 **可视化图表** - 直观的收支分析图表
- 🌙 **暗色主题** - 现代化的深色界面设计

## 🚀 快速开始

### 前置要求

- Node.js 18+
- Cloudflare 账户
- OpenAI 兼容的 API Key

### 本地开发

1. **安装依赖**
```bash
npm install
```

2. **创建本地 D1 数据库**
```bash
npx wrangler d1 execute payment-records --local --file=./schema.sql
```

3. **启动开发服务器**
```bash
npm run dev
```

4. **访问应用**
打开浏览器访问 http://localhost:8788

默认登录凭据：
- 用户名: `admin`
- 密码: `admin123`

## ☁️ 部署到 Cloudflare

### 1. 登录 Cloudflare
```bash
npx wrangler login
```

### 2. 创建 D1 数据库
```bash
npx wrangler d1 create payment-records
```

创建成功后，将返回的 `database_id` 更新到 `wrangler.toml` 文件中。

### 3. 初始化数据库
```bash
npx wrangler d1 execute payment-records --file=./schema.sql
```

### 4. 配置环境变量

在 Cloudflare Dashboard 中配置以下环境变量：

| 变量名 | 必填 | 说明 |
|--------|------|------|
| `AUTH_USERNAME` | ✅ | 登录用户名 |
| `AUTH_PASSWORD` | ✅ | 登录密码 |
| `SESSION_EXPIRY_HOURS` | ❌ | 会话有效期（小时），默认 24 |
| `AI_API_KEY` | ✅ | OpenAI 兼容 API 密钥 |
| `AI_API_BASE` | ❌ | API 基础 URL，默认 https://api.openai.com/v1 |
| `AI_MODEL` | ❌ | 文本模型，默认 gpt-4o-mini |
| `AI_VISION_MODEL` | ❌ | 视觉模型，默认 gpt-4o |

**配置步骤：**
1. 进入 Cloudflare Dashboard
2. 选择 Workers & Pages
3. 找到你的项目
4. 进入 Settings → Environment variables
5. 添加上述环境变量

### 5. 部署
```bash
npm run deploy
```

或者使用 wrangler 直接部署：
```bash
npx wrangler pages deploy src
```

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

## 🎨 使用的技术

- **前端**: HTML, CSS, JavaScript, Chart.js
- **后端**: Cloudflare Workers/Functions
- **数据库**: Cloudflare D1 (SQLite)
- **AI**: OpenAI 兼容 API (GPT-4, etc.)
- **部署**: Cloudflare Pages

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

## ⚠️ 注意事项

1. 请务必设置强密码保护您的数据
2. AI 功能需要有效的 API Key
3. 本地开发时数据存储在 `.wrangler/state` 目录
4. 生产环境请使用 HTTPS

## 📄 License

MIT License
