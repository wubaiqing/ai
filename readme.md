# X.com (Twitter) 数据采集服务

一个基于 Node.js 的 X.com (Twitter) 数据采集和存储服务，支持定时采集指定列表的推特数据并存储到 Supabase 数据库。

## ✨ 功能特性

- 🔄 **自动定时采集**: 基于 node-cron 的本地定时任务
- 📊 **数据存储**: 集成 Supabase 数据库存储
- 🚀 **RESTful API**: 提供完整的数据查询和管理接口
- 🛡️ **模块化架构**: 清晰的代码结构，易于维护和扩展
- 🐳 **Docker 容器化**: 支持 Docker 容器部署，易于在 NAS 等环境中运行
- 📝 **完整日志**: 详细的操作日志和错误处理

## 📁 项目结构

```
tweets/
├── lib/                    # 核心库文件
│   ├── config.js          # 配置管理
│   ├── database.js        # 数据库操作
│   ├── twitter.js         # Twitter API 集成
│   └── scheduler.js       # 定时任务调度
├── serve/                 # 服务器文件
│   ├── index.js          # 主服务器文件
│   └── x.js              # 原始 Twitter 模块 (已重构)
├── .env.example          # 环境变量模板
├── Dockerfile            # Docker 镜像配置
├── docker-compose.yml    # Docker Compose 配置
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
X_LIST_ID=your_x_list_id

# Supabase 配置
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key

# 服务器配置
PORT=3001
NODE_ENV=development

# 注意：定时任务现在通过 Vercel Cron 配置，无需本地调度器
```

### 3. 启动服务

```bash
# 开发模式
npm run dev

# 生产模式
npm start
```

服务将在 `http://localhost:3001` 启动。

### 4. Docker 部署（推荐）

使用 Docker Compose 快速部署：

```bash
# 构建并启动容器
docker-compose up -d

# 查看容器状态
docker-compose ps

# 查看日志
docker-compose logs -f
```

服务将在 `http://localhost:8095` 启动。

详细的 Docker 部署说明请参考 [DOCKER_DEPLOY.md](./DOCKER_DEPLOY.md)

## 📚 API 文档

### 基础信息

- **Base URL**: `http://localhost:8095` (Docker) 或 `http://localhost:3001` (本地开发)
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
  "deployment": "docker-container",
  "scheduler": "node-cron"
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

| 变量名              | 必需 | 说明                   | 示例                              |
| ------------------- | ---- | ---------------------- | --------------------------------- |
| `X_TOKEN`           | ✅   | X.com API Bearer Token | `AAAAAAAAAAAAAAAAAAAAAEvF3QEA...` |
| `X_LIST_ID`         | ✅   | X.com 列表 ID          | `123456789`                       |
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
