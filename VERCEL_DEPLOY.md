# Vercel 部署指南

## 项目概述

这是一个基于 Node.js 的数据采集服务，用于从 X.com (Twitter) 获取推文列表数据。项目已配置为支持 Vercel 无服务器函数部署。

## 部署前准备

### 1. 获取 X.com API Token

1. 访问 [X Developer Portal](https://developer.x.com/)
2. 创建新的应用或使用现有应用
3. 获取 Bearer Token
4. 确保 token 有访问列表和推文的权限

### 2. 项目结构

```
data-capture/
├── api/                    # Vercel API 函数
│   ├── index.js           # 主页端点
│   ├── tweets.js          # 获取推文列表
│   ├── health.js          # 健康检查
│   └── tweets/
│       └── [listId].js    # 获取指定列表推文
├── serve/                 # 原始 Koa 服务器代码
│   ├── index.js          # Koa 服务器
│   └── x.js              # X.com API 调用函数
├── vercel.json           # Vercel 配置文件
├── package.json          # 项目依赖和脚本
└── .env.example          # 环境变量示例
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
   - 在项目设置中添加环境变量：
     - `PUBLIC_TOKEN`: 你的 X.com API Bearer Token
     - `PUBLIC_X_LIST_ID`: 你的 X.com 列表ID

4. **部署**
   - 点击 "Deploy" 开始部署

## 环境变量配置

在 Vercel 项目设置中添加以下环境变量：

| 变量名 | 描述 | 示例值 |
|--------|------|--------|
| `PUBLIC_TOKEN` | X.com API Bearer Token | `AAAAAAAAAAAAAAAAAAAAAEvF3QEA...` |
| `PUBLIC_X_LIST_ID` | X.com 列表ID | `1146654567674912769` |

## API 端点

部署成功后，你的服务将提供以下 API 端点：

- `GET /` - 服务信息和 API 文档
- `GET /tweets` - 获取默认列表的推文数据
- `GET /tweets/{listId}` - 获取指定列表的推文数据
- `GET /health` - 健康检查端点

### 示例请求

```bash
# 获取服务信息
curl https://your-project.vercel.app/

# 获取默认列表推文
curl https://your-project.vercel.app/tweets

# 获取指定列表推文
curl https://your-project.vercel.app/tweets/1146654567674912769

# 健康检查
curl https://your-project.vercel.app/health
```

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
   - 检查环境变量 `PUBLIC_TOKEN` 和 `PUBLIC_X_LIST_ID` 是否正确设置
   - 确认 X.com API token 有效且有足够权限
   - 确认列表ID正确且可访问
   - 检查网络连接和 API 限制

3. **CORS 错误**
   - API 函数已配置 CORS 头，如果仍有问题，检查客户端请求

### 调试技巧

1. **查看函数日志**
   - 在 Vercel Dashboard 中查看函数执行日志
   - 使用 `console.log` 添加调试信息

2. **本地测试**
   - 使用 `vercel dev` 在本地测试 Vercel 函数
   - 使用 `npm run dev` 测试原始 Koa 服务器

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
   - 永远不要将 `PUBLIC_TOKEN` 和 `PUBLIC_X_LIST_ID` 提交到代码仓库
   - 使用 Vercel 的环境变量功能安全存储敏感信息
   - 定期轮换 API tokens
   - 确保列表ID不包含敏感信息

2. **访问控制**
   - 考虑添加 API 密钥验证
   - 实现请求频率限制
   - 监控异常访问模式

## 支持

如果遇到问题，请检查：
- [Vercel 文档](https://vercel.com/docs)
- [X.com API 文档](https://developer.x.com/en/docs)
- 项目 GitHub Issues