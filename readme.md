# X.com 数据采集服务

一个用于采集和分析 X.com (Twitter) 数据的自动化服务，支持推文爬取、AI 分析和报告生成。

## 功能特性

- 🔍 **智能推文爬取**: 自动爬取指定列表的推文数据
- 🤖 **AI 智能分析**: 使用硅基流动API分析推文内容
- 📊 **自动报告生成**: 生成结构化的科技资讯简报
- 🔐 **安全认证**: 支持 Cookie 认证和环境变量配置
- 💾 **数据存储**: 集成 Supabase 数据库存储
- 🔄 **数据去重**: 智能去重机制避免重复数据
- 🌐 **代理支持**: 支持HTTP代理配置

## 快速开始

### 1. 安装依赖

```bash
npm install
# 或
pnpm install
```

### 2. 环境配置

复制环境变量模板并配置：

```bash
cp .env.example .env
```

#### 必需配置

**Supabase 数据库配置**
```bash
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

**AI 服务配置**
```bash
SILICONFLOW_API_KEY=your_siliconflow_api_key
```

#### 可选配置

**X.com 登录凭据**（用于推文爬取）
```bash
X_USERNAME=your_x_username
X_PASSWORD=your_x_password
X_EMAIL=your_x_email
```

**代理配置**（如需要）
```bash
PROXY_HOST=127.0.0.1
PROXY_PORT=7890
PROXY_USERNAME=optional_username
PROXY_PASSWORD=optional_password
```

### 3. 启动服务

```bash
# 推文爬取服务
node scripts/crawl-tweets.js

# AI 简报生成服务
node scripts/generate-report.js

# 更新登录cookies
node scripts/update-cookies.js
```

## 📁 项目结构

```
├── scripts/                 # 执行脚本
│   ├── crawl-tweets.js     # 推文爬取脚本
│   ├── generate-report.js  # AI简报生成脚本
│   └── update-cookies.js   # Cookie更新脚本
├── src/                    # 核心功能模块
│   ├── lib/               # 工具库
│   ├── services/          # 服务模块
│   └── data/              # 数据处理
├── .env.example           # 环境变量模板
└── package.json           # 项目配置
```

## 🤖 AI 简报功能

### 功能说明
- 自动分析推文内容，生成科技资讯简报
- 支持多种AI模型（硅基流动平台）
- 生成结构化的分析报告
- 支持批量处理和增量更新

### 使用方法
```bash
# 生成AI简报
node scripts/generate-report.js

# 或使用npm脚本
npm run generate-report
```

### 配置要求
- 需要配置 `SILICONFLOW_API_KEY`
- 确保Supabase数据库连接正常
- 推文数据表中需要有待分析的数据

## 🚀 主要脚本

```bash
# 推文爬取
node scripts/crawl-tweets.js    # 爬取推文数据

# AI 简报生成
node scripts/generate-report.js # 生成AI分析简报
npm run generate-report         # 或使用npm脚本

# Cookie 管理
node scripts/update-cookies.js  # 更新登录cookies
npm run login                   # 或使用npm脚本

# 测试和调试
npm run test-ai                 # 测试AI功能
npm run check-config            # 检查配置
npm run debug-data-loss         # 调试数据问题
```

## 🔗 主要服务

- `scripts/crawl-tweets.js` - X.com 推文爬取服务，支持指定列表爬取
- `scripts/generate-report.js` - AI 简报生成服务，分析推文生成科技资讯
- `scripts/update-cookies.js` - Cookie 认证服务，维护登录状态
- `src/lib/` - 核心功能模块库，包含配置、数据库、工具等
- `src/services/` - 业务服务模块，包含推文处理、AI分析等
- `src/data/` - 数据处理模块，负责数据清洗和存储

## ❓ 常见问题

### 环境配置问题

**Q: 如何获取 Supabase 配置？**
A: 在 Supabase 项目设置中找到 API 密钥和项目 URL

**Q: 硅基流动 API 密钥在哪里获取？**
A: 访问硅基流动官网注册账号并获取 API 密钥

**Q: 代理配置是必需的吗？**
A: 不是必需的，仅在网络访问受限时使用

### 运行问题

**Q: 推文爬取失败怎么办？**
A: 检查 X.com 登录凭据是否正确，cookies 是否过期

**Q: AI 简报生成失败？**
A: 确认 SILICONFLOW_API_KEY 配置正确，网络连接正常

**Q: 数据库连接失败？**
A: 检查 Supabase 配置是否正确，网络是否可达

### 数据问题

**Q: 出现重复数据怎么办？**
A: 系统有自动去重机制，如仍有问题请检查数据库约束

**Q: 推文数据丢失？**
A: 检查网络连接和错误日志，确认爬取过程是否正常完成

## 🔧 故障排除

### 配置检查
```bash
# 检查环境配置
npm run check-config

# 测试数据库连接
node -e "require('./src/lib/supabase').testConnection()"
```

### 日志调试
```bash
# 启用调试模式
NODE_ENV=development node scripts/crawl-tweets.js

# 查看详细错误信息
DEBUG=* node scripts/generate-report.js
```

### 数据验证
```bash
# 调试数据丢失问题
npm run debug-data-loss

# 测试AI功能
npm run test-ai
```

## 🔒 安全注意事项

- 不要将 `.env` 文件提交到版本控制系统
- 定期更新 API 密钥和登录凭据
- 使用强密码和双因素认证
- 在生产环境中使用 HTTPS
- 定期备份数据库数据

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License