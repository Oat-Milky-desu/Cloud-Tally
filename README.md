# 智能记账 - AI Expense Tracker

基于 Cloudflare Pages + D1 的 AI 驱动个人记账系统

## ✨ 功能特性

- 📝 **智能记账** - 支持自然语言输入，AI 自动解析
- 📸 **图片识别** - 上传小票/发票图片自动提取信息
- 📊 **数据分析** - AI 生成财务分析报告和建议
- 🔐 **用户认证** - 基于环境变量的安全认证
- 📈 **可视化图表** - 直观的收支分析图表
- 🌓 **主题切换** - 支持日间/夜间模式

---

## 🚀 部署指南（Cloudflare Dashboard）

### 第一步：将代码推送到 GitHub

确保你的代码已经推送到 GitHub 仓库。

### 第二步：创建 Cloudflare Pages 项目

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 点击左侧菜单 **Workers & Pages**
3. 点击 **Create** 按钮
4. 选择 **Pages** 标签
5. 点击 **Connect to Git**
6. 授权 Cloudflare 访问你的 GitHub
7. 选择你的仓库（如 `Cloud-Tally`）
8. 配置构建设置：

| 设置项 | 值 |
|--------|-----|
| **Production branch** | `main` |
| **Framework preset** | `None` |
| **Build command** | **🈳 必须留空！千万不要填 `npm run deploy`** |
| **Build output directory** | `src` |

> ⚠️ **常见错误**：如果你在 "Build command" 中填入任何内容，都会导致 `Authentication error [code: 10000]`。请务必保持为空！

9. 点击 **Save and Deploy**
10. 等待首次部署完成（此时应用还无法正常工作，因为还没配置数据库和环境变量）

### 第三步：创建 D1 数据库

1. 在 Cloudflare Dashboard 左侧菜单，点击 **Workers & Pages** → **D1 SQL Database**
2. 点击 **Create** 按钮
3. 输入数据库名称（如 `payment-records`）
4. 选择位置（推荐选择离你较近的区域）
5. 点击 **Create**
6. 数据库创建完成后，点击进入该数据库
7. 点击 **Console** 标签
8. 将以下 SQL 复制粘贴到控制台中执行：

```sql
-- 账目记录表
CREATE TABLE IF NOT EXISTS records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
    amount REAL NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    date TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- 类别表
CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
    icon TEXT,
    color TEXT
);

-- 会话表
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_records_date ON records(date);
CREATE INDEX IF NOT EXISTS idx_records_type ON records(type);
CREATE INDEX IF NOT EXISTS idx_records_category ON records(category);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- 默认支出类别
INSERT OR IGNORE INTO categories (name, type, icon, color) VALUES
('餐饮', 'expense', '🍜', '#ef4444'),
('交通', 'expense', '🚗', '#f97316'),
('购物', 'expense', '🛒', '#eab308'),
('娱乐', 'expense', '🎮', '#22c55e'),
('医疗', 'expense', '🏥', '#06b6d4'),
('教育', 'expense', '📚', '#3b82f6'),
('居住', 'expense', '🏠', '#8b5cf6'),
('通讯', 'expense', '📱', '#ec4899'),
('其他支出', 'expense', '📦', '#6b7280');

-- 默认收入类别
INSERT OR IGNORE INTO categories (name, type, icon, color) VALUES
('工资', 'income', '💰', '#22c55e'),
('奖金', 'income', '🎁', '#10b981'),
('投资', 'income', '📈', '#14b8a6'),
('兼职', 'income', '💼', '#06b6d4'),
('其他收入', 'income', '💵', '#6b7280');
```

9. 点击 **Execute** 执行 SQL

### 第四步：绑定数据库到项目

1. 返回 **Workers & Pages**
2. 点击你的 Pages 项目（如 `cloud-tally`）
3. 点击 **Settings** 标签
4. 在左侧菜单选择 **Functions**（或 **Bindings**）
5. 找到 **D1 database bindings** 部分
6. 点击 **Add binding**
7. 填写：
   - **Variable name**: `DB`（必须是大写的 DB）
   - **D1 database**: 选择你刚创建的数据库
8. 点击 **Save**

### 第五步：配置环境变量

1. 仍在项目 **Settings** 页面
2. 在左侧菜单选择 **Environment variables**
3. 点击 **Add variable** 添加以下变量：

| 变量名 | 必填 | 说明 | 示例值 |
|--------|------|------|--------|
| `AUTH_USERNAME` | ✅ | 登录用户名 | `admin` |
| `AUTH_PASSWORD` | ✅ | 登录密码 | `MySecure@Pass123` |
| `AI_API_KEY` | ✅ | OpenAI API 密钥 | `sk-xxxxxxxx` |
| `SESSION_EXPIRY_HOURS` | ❌ | 会话有效期（小时） | `24` |
| `AI_API_BASE` | ❌ | API 基础 URL | `https://api.openai.com/v1` |
| `AI_MODEL` | ❌ | 文本模型 | `gpt-4o-mini` |
| `AI_VISION_MODEL` | ❌ | 视觉模型 | `gpt-4o` |

> ⚠️ **安全提示**：请使用强密码！生产环境切勿使用简单密码。

4. 点击 **Save**

### 第六步：重新部署

配置完环境变量和数据库绑定后，需要重新部署才能生效：

1. 点击项目的 **Deployments** 标签
2. 找到最新的部署记录
3. 点击右侧的 **⋮** 菜单
4. 选择 **Retry deployment**
5. 等待部署完成

### 第七步：访问你的应用 🎉

部署完成后，访问你的 Pages URL（如 `https://cloud-tally.pages.dev`）即可开始使用！

---

## 🛠️ 本地开发

### 前置要求

- Node.js 18+
- npm

### 开发步骤

1. **安装依赖**
```bash
npm install
```

2. **修改配置用于本地开发**

编辑 `wrangler.toml`，将 `database_id` 设置为 `"local"`：
```toml
database_id = "local"
```

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

---

## 📁 项目结构

```
├── functions/           # Cloudflare Functions (后端 API)
│   ├── _middleware.js   # 认证中间件
│   └── api/
│       ├── auth/        # 认证 API
│       ├── records/     # 账目 CRUD
│       ├── categories/  # 类别管理
│       ├── ai/          # AI 功能
│       └── stats/       # 统计数据
├── src/                 # 前端静态文件
│   ├── index.html       # 主页面
│   ├── login.html       # 登录页面
│   ├── css/             # 样式文件
│   └── js/              # JavaScript 模块
├── schema.sql           # 数据库初始化脚本
├── wrangler.toml        # Wrangler 配置
└── package.json
```

---

## 📝 使用示例

### 自然语言记账

```
"今天午餐花了35元"  →  支出 ¥35.00 餐饮
"收到工资8000元"    →  收入 ¥8000.00 工资
"打车去机场120"     →  支出 ¥120.00 交通
```

### 图片识别

支持上传购物小票、餐饮发票、交通发票等图片，AI 自动提取金额和类别。

---

## ❓ 常见问题

### Q: 登录时提示"登录失败，请稍后重试"

**可能原因**：
1. D1 数据库未正确绑定（变量名必须是 `DB`）
2. 数据库表未创建（需执行 SQL 初始化）
3. 环境变量未配置

**解决方法**：检查第三、四、五步是否正确完成，然后重新部署。

### Q: AI 功能不可用

**可能原因**：`AI_API_KEY` 环境变量未设置或无效。

**解决方法**：确保在环境变量中正确设置了有效的 OpenAI API Key。

### Q: 如何修改数据库名称？

如果你使用了不同的数据库名称，只需确保在绑定时 **Variable name** 设置为 `DB` 即可，代码中使用的是绑定名称而非数据库名称。

---

## 📄 License

MIT License
