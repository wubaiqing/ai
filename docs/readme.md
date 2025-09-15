# X.com 数据采集服务

一个用于采集和分析 X.com (Twitter) 数据的自动化服务，支持推文爬取、AI 分析和报告生成。

## ✨ 主要功能

- 🔍 **智能推文爬取**: 使用 Puppeteer 自动爬取指定列表的推文数据
- 📊 **数据存储**: 集成 Supabase 数据库存储推文数据
- 🤖 **AI 简报生成**: 基于硅基流动平台的 DeepSeek 接口生成科技简报
- 🔐 **Cookie 认证**: 支持 X.com Cookie 认证机制
- 🛡️ **模块化架构**: 清晰的代码结构，易于维护和扩展
- 📝 **完整日志**: 详细的操作日志和错误处理
- 🔧 **配置检查**: 内置配置验证和环境检查工具

## 📁 项目结构

```
data-capture/
├── serve/                 # 服务入口
│   ├── x.js              # X.com 推文爬取服务
│   └── ai.js             # AI 简报生成服务
├── lib/                   # 核心功能模块
│   ├── config.js         # 配置管理
│   ├── database.js       # 数据库操作
│   ├── fileService.js    # 文件操作服务
│   ├── reportConfig.js   # 报告配置
│   ├── reportGenerator.js # 报告生成器
│   ├── aiService.js      # AI 服务
│   ├── tweetService.js   # 推特数据采集
│   ├── twitter.js        # Twitter API 封装
│   ├── scheduler.js      # 定时任务
│   └── utils.js          # 工具函数
├── docs/                  # 项目文档
│   ├── readme.md         # 详细说明文档
│   ├── env-configuration.md # 环境配置指南
│   ├── AI_REPORT_README.md # AI 简报功能说明
│   └── DATA_LOSS_ANALYSIS.md # 数据丢失分析
├── reports/               # 生成的报告目录
├── supabase/             # Supabase 配置
├── .env.example          # 环境变量模板
├── loginAndSaveCookies.js # Cookie 认证脚本
├── checkConfig.js        # 配置检查工具
├── testAIReport.js       # AI 报告测试
├── testDeepSeekAPI.js    # DeepSeek API 测试
├── debugDataLoss.js      # 数据丢失调试
├── package.json          # 项目配置
└── readme.md             # 项目说明
```

## 🚀 快速开始

### 1. 安装依赖

```bash
npm install
# 或
pnpm install
```

### 2. 环境配置

复制环境变量模板：

```bash
cp .env.example .env
```

编辑 `.env` 文件，配置必要的环境变量。详细配置说明请参考 [环境变量配置文档](env-configuration.md)。

### 3. 获取 Cookies

运行自动登录脚本获取 X.com 的认证 cookies：

```bash
node loginAndSaveCookies.js
# 或使用 npm 脚本
npm run login
```

### 4. 启动服务

```bash
# 推文爬取服务
node serve/x.js

# AI 简报生成服务
node serve/ai.js
# 或使用 npm 脚本
npm run generate-report
```

### 5. 配置检查

```bash
# 检查环境配置
node checkConfig.js
# 或使用 npm 脚本
npm run check-config
```

## 📚 主要服务说明

### 服务架构

项目采用模块化架构，主要包含以下核心服务：

#### 1. X.com 推文爬取服务 (`serve/x.js`)

**功能**:
- 使用 Puppeteer 自动爬取指定列表的推文数据
- 支持 Cookie 认证机制
- 智能处理 "Show more" 按钮展开完整推文内容
- 自动去重和数据清洗
- 将数据存储到 Supabase 数据库

**使用方法**:
```bash
# 直接运行
node serve/x.js
```

**配置**:
- 默认列表ID: `1950374938378113192`
- 默认滚动次数: 100
- 可通过修改代码中的配置进行调整

#### 2. AI 简报生成服务 (`serve/ai.js`)

**功能**:
- 从数据库获取推文数据
- 使用硅基流动平台的 DeepSeek 模型分析推文内容
- 生成结构化的科技资讯简报
- 支持多种输出格式

**使用方法**:
```bash
# 直接运行
node serve/ai.js

# 使用 npm 脚本
npm run generate-report

# 显示生成内容
node serve/ai.js --show-content
```

#### 3. Cookie 认证服务 (`loginAndSaveCookies.js`)

**功能**:
- 自动登录 X.com 获取认证 cookies
- 保存 cookies 到本地文件
- 支持无头浏览器模式

**使用方法**:
```bash
# 直接运行
node loginAndSaveCookies.js

# 使用 npm 脚本
npm run login
```

## ⚙️ 配置说明

### 环境变量

| 变量名              | 必需 | 说明                   | 示例                              |
| ------------------- | ---- | ---------------------- | --------------------------------- |
| `X_TOKEN`           | ✅   | X.com API Bearer Token | `AAAAAAAAAAAAAAAAAAAAAEvF3QEA...` |
| `X_LIST_ID`         | ✅   | X.com 列表 ID          | `123456789`                       |
| `X_USERNAME`        | ❌   | X.com 用户名或邮箱     | `your_username` 或 `user@email.com` |
| `X_PASSWORD`        | ❌   | X.com 登录密码         | `your_password`                   |
| `SUPABASE_URL`      | ✅   | Supabase 项目 URL      | `https://xxx.supabase.co`         |
| `SUPABASE_ANON_KEY` | ✅   | Supabase 匿名密钥      | `eyJhbGciOiJIUzI1NiIsInR5cCI6...` |
| `PORT`              | ❌   | 服务器端口             | `8095` (Docker) / `3001` (开发)   |
| `NODE_ENV`          | ❌   | 运行环境               | `production`                      |
| `SCHEDULER_ENABLED` | ❌   | 是否启用定时任务       | `true`                            |
| `CRON_EXPRESSION`   | ❌   | Cron 表达式            | `0 * * * *`                       |

### 定时任务配置

定时任务通过 `node-cron` 实现，可通过环境变量配置：

```env
SCHEDULER_ENABLED=true
CRON_EXPRESSION=0 * * * *
```

| 表达式         | 说明              |
| -------------- | ----------------- |
| `0 * * * *`    | 每小时执行一次    |
| `*/30 * * * *` | 每30分钟执行一次  |
| `0 */6 * * *`  | 每6小时执行一次   |
| `0 9 * * *`    | 每天上午9点执行   |
| `0 9 * * 1-5`  | 工作日上午9点执行 |

## 🚀 部署

### Docker 部署（推荐）

1. 配置环境变量：

```bash
cp .env.example .env
# 编辑 .env 文件，填入必要配置
```

2. 使用 Docker Compose 部署：

```bash
docker-compose up -d
```

3. 验证部署：

```bash
curl http://localhost:8095/health
```

详细部署说明请参考 [DOCKER_DEPLOY.md](./DOCKER_DEPLOY.md)

### 本地开发部署

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

## 🛠️ 开发

### 脚本命令

```bash
# 开发模式 (带热重载)
npm run dev

# 生产模式
npm start

# 构建 Docker 镜像
npm run docker:build

# 运行 Docker 容器
npm run docker:run

# 使用 Docker Compose
npm run docker:compose

# 停止 Docker 服务
npm run docker:stop

# 运行测试
npm test
```

### 代码结构

- **lib/config.js**: 统一的配置管理，包含环境变量验证
- **lib/database.js**: Supabase 数据库操作封装
- **lib/twitter.js**: X.com API 集成和数据处理
- **lib/scheduler.js**: 定时任务调度和数据收集逻辑
- **serve/index.js**: 主服务器文件，路由和中间件配置

## 🔧 故障排除

### 常见问题

1. **环境变量配置错误**
   - 检查 `.env` 文件是否存在且配置正确
   - 确认所有必需的环境变量都已设置

2. **Supabase 连接失败**
   - 验证 `SUPABASE_URL` 和 `SUPABASE_ANON_KEY` 是否正确
   - 检查 Supabase 项目是否正常运行

3. **X.com API 访问失败**
   - 确认 `X_TOKEN` 是否有效
   - 检查 `X_LIST_ID` 是否存在且可访问

4. **定时任务不执行**
   - 确认 `SCHEDULER_ENABLED=true`
   - 检查 `CRON_EXPRESSION` 格式是否正确
   - 查看容器日志中的定时任务启动信息
   - 验证容器是否正常运行

### 日志查看

服务运行时会输出详细的日志信息，包括：

- 服务启动信息
- 定时任务执行状态
- API 请求和响应
- 错误信息和堆栈跟踪

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📞 支持

如有问题，请通过以下方式联系：

- 提交 GitHub Issue
- 查看项目文档
- 参考 [DOCKER_DEPLOY.md](./DOCKER_DEPLOY.md) 部署指南
