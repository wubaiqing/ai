# Twitter AI Reporter

一个专业的 Twitter/X.com 智能分析和报告生成系统，集成推文采集、AI 分析和自动化报告功能。

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

**Clash代理配置**（如需要）
```bash
PROXY_HOST=127.0.0.1
PROXY_PORT=7890
```

**浏览器配置**
```bash
# Chrome/Chromium 可执行文件路径
# 本地开发环境（macOS）
CHROME_EXECUTABLE_PATH=/Applications/Google Chrome.app/Contents/MacOS/Google Chrome

# Docker环境或Linux
CHROME_EXECUTABLE_PATH=/usr/bin/chromium-browser

# 其他Linux环境
CHROME_EXECUTABLE_PATH=/usr/bin/google-chrome
```

### 3. 启动服务

#### 本地运行

```bash
# 推文爬取服务
node scripts/crawl-tweets.js

# AI 简报生成服务
node scripts/generate-report.js

# 更新登录cookies
node scripts/update-cookies.js
```

#### Docker 部署

**前置要求**
- 确保已安装 Docker 和 Docker Compose
- 确保项目根目录下存在必要的目录结构

**部署步骤**

1. 创建必要的目录：
```bash
# 创建日志和报告目录
mkdir -p logs reports

# 确保 cookies.json 文件存在（如果不存在会自动创建）
touch cookies.json
```

2. 构建并启动容器：
```bash
# 构建镜像
docker compose build

# 启动服务
docker compose up -d

# 查看日志
docker compose logs -f
```

3. 停止服务：
```bash
docker compose down
```

**重要说明**
- docker-compose.yml 使用相对路径进行卷挂载，确保在项目根目录下运行
- 日志文件将保存在 `./logs` 目录中
- 生成的报告将保存在 `./reports` 目录中
- cookies.json 文件用于保持登录状态的持久化

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
A: 根据项目要求必须使用代理，配置PROXY_HOST和PROXY_PORT即可。如果代理需要认证，还需要配置PROXY_USERNAME和PROXY_PASSWORD

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

### Docker 部署问题

**Q: 出现 "Bind mount failed: '/volume1/docker/twitter-ai-reporter/logs' does not exist" 错误？**
A: 这是因为使用了错误的绝对路径。请确保：
- 在项目根目录下运行 `docker compose` 命令
- 使用提供的 docker-compose.yml 文件（已配置相对路径）
- 运行前先创建必要目录：`mkdir -p logs reports`

**Q: Docker 容器启动失败？**
A: 检查以下几点：
- 确保 Docker 和 Docker Compose 已正确安装
- 确保 .env 文件配置正确
- 检查端口是否被占用
- 查看容器日志：`docker compose logs`

**Q: 容器内无法访问挂载的文件？**
A: 检查文件权限和目录结构：
- 确保 logs、reports 目录存在且可写
- 检查 cookies.json 文件权限
- 如在 Linux 系统上，可能需要调整文件所有者：`sudo chown -R 1000:1000 logs reports`

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

## 🐳 Docker 部署

### 使用 Docker Compose 部署

项目已配置完整的 Docker 容器化支持，特别适配群辉 NAS 环境。

#### 1. 准备环境文件

确保 `.env` 文件已正确配置所有必需的环境变量。

#### 2. 构建和启动服务

```bash
# 构建并启动服务
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f twitter-ai-reporter
```

#### 3. 群辉 NAS 部署指南

**前置要求：**
- 群辉 NAS 已安装 Docker 套件
- 确保有足够的存储空间和内存资源

**部署步骤：**

1. **上传项目文件**
   - 将整个项目文件夹上传到群辉 NAS
   - 建议放在 `/docker/twitter-ai-reporter/` 目录下

2. **配置环境变量**
   - 复制 `.env.example` 为 `.env`
   - 根据实际情况配置所有环境变量

3. **设置权限**
   ```bash
   # SSH 连接到群辉 NAS 后执行
   sudo chown -R 1000:1000 /docker/twitter-ai-reporter/
   ```

4. **启动服务**
   ```bash
   cd /docker/twitter-ai-reporter/
   docker-compose up -d
   ```

#### 4. Docker 配置说明

**资源限制：**
- 内存限制：1GB（预留512MB）
- CPU限制：0.5核心（预留0.25核心）

**数据持久化：**
- `./reports` - 报告输出目录
- `./cookies.json` - 登录状态文件
- `./logs` - 日志文件目录
- `./.env` - 环境配置文件

**网络配置：**
- 使用桥接网络模式
- 支持代理配置

#### 5. 常用 Docker 命令

```bash
# 重启服务
docker-compose restart

# 停止服务
docker-compose down

# 更新服务
docker-compose pull
docker-compose up -d

# 进入容器
docker-compose exec twitter-ai-reporter sh

# 查看资源使用情况
docker stats twitter-ai-reporter
```

#### 6. 故障排除

**常见问题：**

- **权限问题**：确保文件权限设置为 1000:1000
- **内存不足**：调整 docker-compose.yml 中的资源限制
- **网络问题**：检查代理配置和防火墙设置
- **存储空间**：确保有足够的磁盘空间用于日志和报告

**调试命令：**
```bash
# 查看详细日志
docker-compose logs --tail=100 twitter-ai-reporter

# 检查容器健康状态
docker-compose ps

# 进入容器调试
docker-compose exec twitter-ai-reporter sh
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