# X.com (Twitter) 数据采集服务 - Vercel 部署指南

本项目是一个基于 Node.js 的数据采集服务，专门用于从 X.com (Twitter) 获取推文数据。该服务设计为在 Vercel 的无服务器环境中运行，提供高效、可扩展的数据采集解决方案。

## 项目概述

### 主要功能

- **数据采集**: 从指定的 X.com 列表获取推文数据
- **数据存储**: 将采集的数据存储到 Supabase 数据库
- **定时任务**: 支持定时自动采集数据
- **API 接口**: 提供 RESTful API 用于数据查询和管理
- **模块化架构**: 清晰的代码结构，易于维护和扩展

### 技术栈

- **运行时**: Node.js
- **框架**: Express.js
- **数据库**: Supabase (PostgreSQL)
- **部署平台**: Vercel
- **数据源**: X.com (Twitter) RSS Feed
- **定时任务**: node-cron

## 部署前准备

### 1. 获取 X.com API Token

在部署之前，您需要获取 X.com 的 API 访问令牌：

1. 访问 [X Developer Portal](https://developer.x.com/)
2. 创建或登录您的开发者账户
3. 创建一个新的应用程序
4. 获取 Bearer Token
5. 记录您要监控的列表 ID

### 2. 设置 Supabase 项目

1. 访问 [Supabase](https://supabase.com/)
2. 创建新项目
3. 获取项目 URL 和 anon key
4. 创建必要的数据表（参考项目中的 SQL 脚本）

## 项目结构

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
├── vercel.json           # Vercel 配置文件
├── package.json          # 项目依赖
└── README.md             # 项目文档
```

## 部署步骤

### 方法一：通过 Vercel CLI 部署

1. **安装 Vercel CLI**

   ```bash
   npm install -g vercel
   ```

2. **登录 Vercel**

   ```bash
   vercel login
   ```

3. **部署到开发环境**

   ```bash
   npm run deploy-dev
   # 或者
   vercel
   ```

4. **部署到生产环境**
   ```bash
   npm run deploy
   # 或者
   vercel --prod
   ```

### 方法二：通过 Vercel 网站部署

1. **连接 Git 仓库**

   - 访问 [Vercel Dashboard](https://vercel.com/dashboard)
   - 点击 "New Project"
   - 连接你的 GitHub/GitLab/Bitbucket 仓库
   - 选择 `data-capture` 项目

2. **配置项目设置**

   - Framework Preset: `Other`
   - Build Command: `npm run vercel-build`
   - Output Directory: 留空
   - Install Command: `npm install`

3. **设置环境变量**

### 在 Vercel 控制台配置环境变量

1. 登录 [Vercel Dashboard](https://vercel.com/dashboard)
2. 选择您的项目
3. 进入 "Settings" 标签页
4. 点击 "Environment Variables"
5. 添加以下变量：

   - `X_TOKEN`: 您的 X.com Bearer Token
   - `PUBLIC_X_LIST_ID`: X.com 列表 ID
   - `SUPABASE_URL`: Supabase 项目 URL
   - `SUPABASE_ANON_KEY`: Supabase 匿名密钥
   - `CRON_EXPRESSION`: 定时任务表达式（可选）
   - `SCHEDULER_ENABLED`: 是否启用调度器（可选）

6. **部署**
   - 点击 "Deploy" 开始部署

## 环境变量配置

在 Vercel 中配置以下环境变量：

### 必需的环境变量

| 变量名              | 描述                   | 示例值                             |
| ------------------- | ---------------------- | ---------------------------------- |
| `X_TOKEN`           | X.com API Bearer Token | `AAAAAAAAAAAAAAAAAAAAAEvF3QEA...`  |
| `PUBLIC_X_LIST_ID`  | X.com 列表 ID          | `123456789`                        |
| `SUPABASE_URL`      | Supabase 项目 URL      | `https://your-project.supabase.co` |
| `SUPABASE_ANON_KEY` | Supabase 匿名密钥      | `eyJhbGciOiJIUzI1NiIsInR5cCI6...`  |

### 可选的环境变量

| 变量名              | 描述           | 默认值       |
| ------------------- | -------------- | ------------ |
| `PORT`              | 服务器端口     | `3001`       |
| `NODE_ENV`          | 运行环境       | `production` |
| `CRON_EXPRESSION`   | 定时任务表达式 | `0 * * * *`  |
| `SCHEDULER_ENABLED` | 是否启用调度器 | `true`       |

## API 端点

部署完成后，您的服务将提供以下 API 端点：

### 1. 健康检查

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

### 2. 获取推文数据

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
      "title": "推文标题",
      "content": "推文内容",
      "published_date": "2024-01-20T10:00:00.000Z",
      "created_at": "2024-01-20T10:30:00.000Z"
    }
  ],
  "count": 1,
  "timestamp": "2024-01-20T10:30:00.000Z"
}
```

### 3. 手动触发数据收集

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

### 4. 根路径

```http
GET /
```

自动重定向到 `/health`

## 本地开发

1. **安装依赖**

   ```bash
   npm install
   ```

2. **配置环境变量**

   ```bash
   cp .env.example .env
   # 编辑 .env 文件，添加你的 PUBLIC_TOKEN 和 PUBLIC_X_LIST_ID
   ```

3. **启动本地服务器**

   ```bash
   npm run dev
   ```

4. **本地测试 Vercel 函数**
   ```bash
   vercel dev
   ```

## 故障排除

### 常见问题

1. **部署失败**

   - 检查 `package.json` 中的依赖是否正确
   - 确保 `vercel.json` 配置正确
   - 查看 Vercel 部署日志获取详细错误信息

2. **API 调用失败**

   - 验证环境变量是否正确配置
   - 检查 `X_TOKEN` 是否有效（注意变量名已更新）
   - 确认 Supabase 连接配置
   - 检查模块导入路径是否正确

3. **数据采集问题**

   - 检查 X.com 列表 ID 是否正确
   - 验证 RSS Feed 是否可访问
   - 查看服务器日志
   - 确认定时任务配置是否正确

4. **模块化相关问题**

   - 检查 `lib/` 目录下的模块是否正确导入
   - 验证配置管理模块是否正常工作
   - 确认数据库连接模块是否正确初始化

5. **CORS 错误**
   - API 函数已配置 CORS 头，如果仍有问题，检查客户端请求

### 调试技巧

1. **查看函数日志**

   - 在 Vercel Dashboard 中查看函数执行日志
   - 使用 `console.log` 添加调试信息

2. **本地测试**

   ```bash
   # 开发模式
   npm run dev

   # 生产模式
   npm start
   ```

3. **环境变量验证**
   在代码中添加日志输出来验证环境变量是否正确加载
4. **模块测试**

   ```bash
   # 测试配置模块
   node -e "console.log(require('./lib/config').getTwitterConfig())"

   # 测试数据库连接
   node -e "require('./lib/database').testConnection()"
   ```

## 性能优化

1. **函数超时设置**

   - 当前设置为 30 秒，可在 `vercel.json` 中调整

2. **缓存策略**

   - 考虑添加响应缓存以减少 API 调用
   - 使用 Vercel Edge Cache 优化性能

3. **错误处理**
   - 已实现重试机制和详细错误日志
   - 监控 API 调用成功率和响应时间

## 安全注意事项

1. **环境变量安全**

   - 永远不要将 `X_TOKEN` 和 `PUBLIC_X_LIST_ID` 提交到代码仓库
   - 使用 Vercel 的环境变量功能安全存储敏感信息
   - 定期轮换 API tokens
   - 确保列表 ID 不包含敏感信息

2. **访问控制**
   - 考虑添加 API 密钥验证
   - 实现请求频率限制
   - 监控异常访问模式

## 支持

如果遇到问题，请检查：

- [Vercel 文档](https://vercel.com/docs)
- [X.com API 文档](https://developer.x.com/en/docs)
- 项目 GitHub Issues
