# X.com (Twitter) 数据采集服务

一个基于 Node.js 的 X.com (Twitter) 数据采集和存储服务，支持定时采集指定列表的推特数据并存储到 Supabase 数据库。

## ✨ 功能特性

- 🔄 **自动定时采集**: 支持 Cron 表达式配置的定时任务
- 📊 **数据存储**: 集成 Supabase 数据库存储
- 🚀 **RESTful API**: 提供完整的数据查询和管理接口
- 🛡️ **模块化架构**: 清晰的代码结构，易于维护和扩展
- ☁️ **云部署支持**: 支持 Vercel 无服务器部署
- 📝 **完整日志**: 详细的操作日志和错误处理

## 📁 项目结构

```
data-capture/
├── lib/                    # 核心库文件
│   ├── config.js          # 配置管理
│   ├── database.js        # 数据库操作
│   ├── twitter.js         # Twitter API 集成
│   └── scheduler.js       # 定时任务调度
├── serve/                 # 服务器文件
│   ├── index.js          # 主服务器文件
│   └── x.js              # 原始 Twitter 模块 (已重构)
├── .env.example          # 环境变量模板
├── vercel.json           # Vercel 部署配置
├── package.json          # 项目依赖
└── README.md             # 项目文档
```

## 🚀 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 环境配置

复制环境变量模板并配置：

```bash
cp .env.example .env
```

编辑 `.env` 文件，填入必要的配置信息：

```env
# X.com API 配置
X_TOKEN=your_x_api_bearer_token
PUBLIC_X_LIST_ID=your_x_list_id

# Supabase 配置
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key

# 服务器配置
PORT=3001
NODE_ENV=development

# 调度器配置
CRON_EXPRESSION=0 * * * *  # 每小时执行一次
SCHEDULER_ENABLED=true
```

### 3. 启动服务

```bash
# 开发模式
npm run dev

# 生产模式
npm start
```

服务将在 `http://localhost:3001` 启动。

## 📚 API 文档

### 基础信息

- **Base URL**: `http://localhost:3001`
- **Content-Type**: `application/json`

### 端点列表

#### 1. 健康检查

```http
GET /health
```

**响应示例**:
```json
{
  "status": "ok",
  "timestamp": "2024-01-20T10:30:00.000Z",
  "config": {
    "scheduler_enabled": true,
    "cron_expression": "0 * * * *"
  }
}
```

#### 2. 获取推特数据

```http
GET /tweets?limit=100
```

**查询参数**:
- `limit` (可选): 返回数据条数，默认 100

**响应示例**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "url": "https://twitter.com/user/status/123",
      "title": "推特标题",
      "content": "推特内容",
      "published_date": "2024-01-20T10:00:00.000Z",
      "created_at": "2024-01-20T10:30:00.000Z"
    }
  ],
  "count": 1,
  "timestamp": "2024-01-20T10:30:00.000Z"
}
```

#### 3. 手动触发数据收集

```http
POST /collect
```

**响应示例**:
```json
{
  "success": true,
  "message": "数据收集完成",
  "result": {
    "success": true,
    "count": 5,
    "timestamp": "2024-01-20T10:30:00.000Z"
  },
  "timestamp": "2024-01-20T10:30:00.000Z"
}
```

#### 4. 根路径

```http
GET /
```

自动重定向到 `/health`

## ⚙️ 配置说明

### 环境变量

| 变量名 | 必需 | 说明 | 示例 |
|--------|------|------|------|
| `X_TOKEN` | ✅ | X.com API Bearer Token | `AAAAAAAAAAAAAAAAAAAAAEvF3QEA...` |
| `PUBLIC_X_LIST_ID` | ✅ | X.com 列表 ID | `123456789` |
| `SUPABASE_URL` | ✅ | Supabase 项目 URL | `https://xxx.supabase.co` |
| `SUPABASE_ANON_KEY` | ✅ | Supabase 匿名密钥 | `eyJhbGciOiJIUzI1NiIsInR5cCI6...` |
| `PORT` | ❌ | 服务器端口 | `3001` |
| `NODE_ENV` | ❌ | 运行环境 | `development` |
| `CRON_EXPRESSION` | ❌ | 定时任务表达式 | `0 * * * *` |
| `SCHEDULER_ENABLED` | ❌ | 是否启用调度器 | `true` |

### Cron 表达式示例

| 表达式 | 说明 |
|--------|------|
| `0 * * * *` | 每小时执行一次 |
| `*/30 * * * *` | 每30分钟执行一次 |
| `0 */6 * * *` | 每6小时执行一次 |
| `0 9 * * *` | 每天上午9点执行 |
| `0 9 * * 1-5` | 工作日上午9点执行 |

## 🚀 部署

### Vercel 部署

1. 安装 Vercel CLI:
```bash
npm i -g vercel
```

2. 部署到 Vercel:
```bash
npm run deploy
```

3. 在 Vercel 控制台配置环境变量

详细部署说明请参考 [VERCEL_DEPLOY.md](./VERCEL_DEPLOY.md)

## 🛠️ 开发

### 脚本命令

```bash
# 开发模式 (带热重载)
npm run dev

# 生产模式
npm start

# 构建项目
npm run build

# Vercel 构建
npm run vercel-build

# 部署到 Vercel
npm run deploy

# 部署到 Vercel 开发环境
npm run deploy-dev

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
   - 检查 `PUBLIC_X_LIST_ID` 是否存在且可访问

4. **定时任务不执行**
   - 检查 `SCHEDULER_ENABLED` 是否为 `true`
   - 验证 `CRON_EXPRESSION` 格式是否正确

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
- 参考 [VERCEL_DEPLOY.md](./VERCEL_DEPLOY.md) 部署指南