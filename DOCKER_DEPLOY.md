# Docker 部署指南

本文档详细说明如何使用 Docker 容器部署数据采集项目。

## 项目概述

数据采集项目是一个基于 Node.js 的应用程序，用于自动收集和存储 Twitter 数据。该项目现已完全适配 Docker 容器化部署，支持在 NAS 或任何支持 Docker 的环境中运行。

## 主要特性

- 🐳 **Docker 容器化部署**：完全容器化，易于部署和管理
- ⏰ **基于 node-cron 的本地定时任务**：每小时自动执行数据收集
- 🔄 **自动数据收集**：定时从 Twitter 列表获取最新数据
- 💾 **Supabase 数据存储**：安全可靠的云端数据库
- 🌐 **RESTful API**：提供数据查询和手动触发接口
- 📊 **健康检查**：内置健康检查端点
- 🔒 **安全配置**：支持环境变量配置，保护敏感信息

## 系统要求

- Docker Engine 20.0+
- Docker Compose 2.0+
- 至少 512MB 可用内存
- 网络连接（用于访问 Twitter API 和 Supabase）

## 快速开始

### 1. 克隆项目

```bash
git clone <repository-url>
cd tweets
```

### 2. 配置环境变量

创建 `.env` 文件并配置必要的环境变量：

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```env
# Supabase 配置
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key

# Twitter API 配置
X_LIST_ID=your_twitter_list_id
X_TOKEN=your_twitter_token

# 服务器配置
PORT=8095
NODE_ENV=production

# 定时任务配置
SCHEDULER_ENABLED=true
CRON_EXPRESSION=0 * * * *  # 每小时执行一次
```

### 3. 使用 Docker Compose 部署（推荐）

```bash
# 构建并启动容器
docker-compose up -d

# 查看容器状态
docker-compose ps

# 查看日志
docker-compose logs -f
```

### 4. 使用 Docker 命令部署

```bash
# 构建镜像
docker build -t tweets .

# 运行容器
docker run -d \
  --name tweets-app \
  -p 8095:8095 \
  --env-file .env \
  --restart unless-stopped \
  tweets
```

## 配置说明

### 环境变量

| 变量名              | 必需 | 默认值        | 说明              |
| ------------------- | ---- | ------------- | ----------------- |
| `SUPABASE_URL`      | ✅   | -             | Supabase 项目 URL |
| `SUPABASE_ANON_KEY` | ✅   | -             | Supabase 匿名密钥 |
| `X_LIST_ID`         | ✅   | -             | Twitter 列表 ID   |
| `X_TOKEN`           | ✅   | -             | Twitter API Token |
| `PORT`              | ❌   | 8095          | 服务器端口        |
| `NODE_ENV`          | ❌   | production    | 运行环境          |
| `SCHEDULER_ENABLED` | ❌   | true          | 是否启用定时任务  |
| `CRON_EXPRESSION`   | ❌   | 0 \* \* \* \* | Cron 表达式       |

### Cron 表达式示例

| 表达式         | 说明             |
| -------------- | ---------------- |
| `0 * * * *`    | 每小时执行一次   |
| `0 */2 * * *`  | 每2小时执行一次  |
| `0 0 * * *`    | 每天午夜执行一次 |
| `0 0 */3 * *`  | 每3天执行一次    |
| `*/30 * * * *` | 每30分钟执行一次 |

### Docker Compose 配置

`docker-compose.yml` 文件包含以下配置：

- **端口映射**：8095:8095
- **环境变量**：从 `.env` 文件加载
- **重启策略**：unless-stopped
- **数据卷**：持久化数据和日志
- **健康检查**：自动监控容器健康状态
- **网络**：独立的 Docker 网络

## API 端点

### 健康检查

```
GET http://localhost:8095/health
```

响应示例：

```json
{
  "status": "ok",
  "timestamp": "2024-01-20T10:30:00.000Z",
  "deployment": "docker-container",
  "scheduler": "node-cron"
}
```

### 获取推特数据

```
GET http://localhost:8095/tweets?limit=100
```

### 手动触发数据收集

```
POST http://localhost:8095/collect
```

### 根路径

```
GET http://localhost:8095/
```

重定向到健康检查端点。

## 管理命令

### 使用 npm 脚本

```bash
# 构建 Docker 镜像
npm run docker:build

# 运行单个容器
npm run docker:run

# 使用 Docker Compose 启动
npm run docker:compose

# 停止 Docker Compose 服务
npm run docker:stop
```

### 使用 Docker Compose

```bash
# 启动服务
docker-compose up -d

# 停止服务
docker-compose down

# 重启服务
docker-compose restart

# 查看日志
docker-compose logs -f tweets

# 进入容器
docker-compose exec tweets sh
```

### 使用 Docker 命令

```bash
# 查看运行中的容器
docker ps

# 查看容器日志
docker logs -f tweets-app

# 进入容器
docker exec -it tweets-app sh

# 停止容器
docker stop tweets-app

# 删除容器
docker rm tweets-app
```

## 数据持久化

项目配置了以下数据卷：

- `./data:/app/data` - 应用数据持久化
- `./logs:/app/logs` - 日志文件持久化

确保宿主机上的 `data` 和 `logs` 目录具有适当的权限。

## 故障排除

### 常见问题

#### 1. 容器无法启动

**检查步骤：**

- 确认 `.env` 文件存在且配置正确
- 检查端口 8095 是否被占用
- 查看容器日志：`docker-compose logs tweets`

#### 2. 定时任务不执行

**检查步骤：**

- 确认 `SCHEDULER_ENABLED=true`
- 检查 `CRON_EXPRESSION` 格式是否正确
- 查看应用日志中的定时任务启动信息

#### 3. API 调用失败

**检查步骤：**

- 确认容器正在运行：`docker ps`
- 测试健康检查端点：`curl http://localhost:8095/health`
- 检查网络连接和防火墙设置

#### 4. 数据收集失败

**检查步骤：**

- 验证 Twitter API 配置（`X_LIST_ID`, `X_TOKEN`）
- 验证 Supabase 配置（`SUPABASE_URL`, `SUPABASE_ANON_KEY`）
- 检查网络连接
- 查看详细错误日志

### 调试技巧

#### 查看详细日志

```bash
# 实时查看日志
docker-compose logs -f tweets

# 查看最近的日志
docker-compose logs --tail=100 tweets
```

#### 进入容器调试

```bash
# 进入运行中的容器
docker-compose exec tweets sh

# 在容器内检查环境变量
env | grep -E "(SUPABASE|X_|PORT|CRON)"

# 在容器内测试网络连接
wget -qO- http://localhost:8095/health
```

#### 重新构建镜像

```bash
# 强制重新构建
docker-compose build --no-cache
docker-compose up -d
```

## 性能优化

### 资源限制

在 `docker-compose.yml` 中添加资源限制：

```yaml
services:
  tweets:
    # ... 其他配置
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
        reservations:
          memory: 256M
          cpus: '0.25'
```

### 日志管理

配置日志轮转：

```yaml
services:
  tweets:
    # ... 其他配置
    logging:
      driver: 'json-file'
      options:
        max-size: '10m'
        max-file: '3'
```

## 安全考虑

### 环境变量安全

- 不要将 `.env` 文件提交到版本控制系统
- 使用强密码和安全的 API 密钥
- 定期轮换 API 密钥

### 网络安全

- 考虑使用反向代理（如 Nginx）
- 配置防火墙规则限制访问
- 使用 HTTPS（在生产环境中）

### 容器安全

- 定期更新基础镜像
- 使用非 root 用户运行应用（已在 Dockerfile 中配置）
- 限制容器权限

## 监控和维护

### 健康检查

项目内置健康检查功能，Docker Compose 会自动监控容器健康状态。

### 日志监控

建议设置日志监控和告警：

```bash
# 监控错误日志
docker-compose logs tweets | grep -i error

# 监控定时任务执行
docker-compose logs tweets | grep "定时任务执行"
```

### 备份策略

- 定期备份 Supabase 数据库
- 备份应用配置文件
- 备份容器数据卷

## 升级指南

### 应用升级

```bash
# 1. 停止当前服务
docker-compose down

# 2. 拉取最新代码
git pull origin main

# 3. 重新构建镜像
docker-compose build --no-cache

# 4. 启动新版本
docker-compose up -d

# 5. 验证服务状态
curl http://localhost:8095/health
```

### Docker 镜像升级

```bash
# 更新基础镜像
docker pull node:20-alpine

# 重新构建应用镜像
docker-compose build --no-cache
```

## 许可证

MIT License

## 支持

如果遇到问题，请：

1. 查看本文档的故障排除部分
2. 检查项目的 GitHub Issues
3. 提交新的 Issue 并提供详细的错误信息和日志

---

**注意**：确保在生产环境中使用适当的安全配置和监控措施。
