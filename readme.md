# Twitter AI Reporter 🐦📊

一个专业的 Twitter/X.com 智能分析和报告生成系统，采用**纯 Node.js 长期运行服务架构**，无需复杂的 shell 脚本和 cron 配置，支持一键 Docker 部署。集成推文采集、AI 分析和自动化报告功能。

## 📋 目录

- [功能特性](#功能特性-)
- [环境要求](#环境要求-)
- [快速开始](#快速开始-)
- [环境变量配置](#环境变量配置-)
- [项目结构](#项目结构-)
- [使用方法](#使用方法-)
- [定时任务配置](#定时任务配置-)
- [Docker 部署](#docker-部署-)
- [故障排除](#故障排除-)
- [安全注意事项](#安全注意事项-)
- [贡献指南](#贡献指南-)
- [许可证](#许可证-)

## 功能特性 ✨

### 🚀 简化部署架构
- ⚡ **纯 Node.js 服务**: 移除复杂的 shell 脚本和 cron 依赖
- 🎯 **内置任务调度**: 使用 Node.js 内置定时器，无需系统 cron 配置
- 🐳 **一键 Docker 部署**: 轻量化容器镜像，支持 Docker Compose 快速启动
- 🔄 **优雅关闭**: 支持 SIGINT 和 SIGTERM 信号处理
- 📝 **统一日志管理**: 集成日志格式，自动清理历史日志

### 🔧 核心功能
- 🔍 **智能推文爬取**: 自动爬取指定列表的推文数据，支持批量处理
- 🤖 **AI 智能分析**: 使用硅基流动API分析推文内容，生成深度洞察
- 📊 **自动报告生成**: 生成结构化的科技资讯简报，支持多种格式
- 🔐 **安全认证**: 支持 Cookie 认证和环境变量配置，保障数据安全
- 💾 **数据存储**: 集成 Supabase 数据库存储，支持数据持久化
- 🔄 **数据去重**: 智能去重机制避免重复数据，提升数据质量
- 🌐 **代理支持**: 支持HTTP代理配置，适应不同网络环境
- 📈 **性能优化**: 支持并发处理和资源限制配置

## 环境要求 🛠️

- **Node.js**: 18.0.0 或更高版本
- **Chrome/Chromium**: 最新稳定版本浏览器
- **内存**: 建议 4GB 以上可用内存
- **网络**: 稳定的互联网连接（支持代理配置）
- **存储**: 至少 2GB 可用磁盘空间
- **数据库**: Supabase 账户和项目配置
- **AI 服务**: 硅基流动 API 密钥

## 快速开始 🚀

### 🐳 Docker 部署（推荐）

**最简单的部署方式，一键启动所有服务：**

```bash
# 1. 克隆项目
git clone <repository-url>
cd twitter-ai-reporter

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env 文件，填入必要的配置

# 3. 一键启动服务
docker-compose up -d

# 4. 查看服务状态
docker-compose logs -f twitter-ai
```

### 💻 本地开发部署

#### 1. 安装依赖

```bash
# 使用 npm
npm install

# 或使用 pnpm（推荐）
pnpm install

# 或使用 yarn
yarn install
```

#### 2. 环境配置

```bash
cp .env.example .env
# 编辑 .env 文件，配置必要的环境变量（详见下方配置说明）
```

#### 3. 启动长期运行服务

```bash
# 启动长期服务（包含自动任务调度）
npm run serve

# 或者开发模式
npm run dev
```

#### 4. 手动执行任务

```bash
# 推文爬取服务
node scripts/crawl-tweets.js

# AI 简报生成服务
node scripts/generate-report.js

# 更新登录cookies
node scripts/update-cookies.js
```

#### 5. 使用 npm 脚本

```bash
# 生成AI简报
npm run generate-report

# 更新登录状态
npm run login

# 测试AI功能
npm run test-ai

# 检查配置
npm run check-config
```

## 环境变量配置 ⚙️

### 🔐 必需配置

**Supabase 数据库配置**
```bash
# Supabase 项目配置
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

**AI 服务配置**
```bash
# 硅基流动 API 配置
SILICONFLOW_API_KEY=your_siliconflow_api_key
```

### 🔧 可选配置

**X.com 登录凭据**（用于推文爬取）
```bash
X_USERNAME=your_x_username
X_PASSWORD=your_x_password
X_EMAIL=your_x_email
```

**网络代理配置**
```bash
# HTTP/HTTPS 代理设置
PROXY_HOST=127.0.0.1
PROXY_PORT=7890

# 注意：当前版本不支持需要认证的代理
# 如需认证代理，请联系开发团队
```

**浏览器配置**
```bash
# Chrome/Chromium 可执行文件路径
# 本地开发环境（macOS）
CHROME_EXECUTABLE_PATH=/Applications/Google Chrome.app/Contents/MacOS/Google Chrome

# Docker环境或Linux
CHROME_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Windows 环境
CHROME_EXECUTABLE_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe
```

**性能优化配置**
```bash
# 并发处理数量
MAX_CONCURRENT=3

# 请求间隔（毫秒）
REQUEST_DELAY=1000

# 超时设置（毫秒）
TIMEOUT=30000

# 日志级别：error, warn, info, debug
LOG_LEVEL=info
```

## 📁 项目结构

```
twitter-ai-reporter/
├── scripts/                    # 🚀 执行脚本和核心模块
│   ├── core/                  # 核心功能模块
│   │   ├── data/             # 数据处理模块
│   │   │   ├── connectionManager.js  # 数据库连接管理
│   │   │   ├── database.js           # 数据库操作
│   │   │   └── twitter.js            # Twitter 数据处理
│   │   ├── lib/              # 工具库和配置
│   │   │   ├── config.js            # 应用配置
│   │   │   ├── proxyValidator.js    # 代理验证
│   │   │   ├── timezone.js          # 时区工具
│   │   │   └── utils.js             # 通用工具
│   │   ├── reports/          # 报告生成模块
│   │   │   ├── config.js            # 报告配置
│   │   │   └── generator.js         # 报告生成器
│   │   └── services/         # 业务服务模块
│   │       ├── aiService.js         # AI 分析服务
│   │       ├── fileService.js       # 文件操作服务
│   │       └── tweetService.js      # 推文处理服务
│   ├── tasks/                 # 执行任务脚本
│   │   ├── crawl-tweets.js          # Twitter 数据爬取
│   │   ├── diagnose-proxy.js        # 代理诊断
│   │   ├── generate-report.js       # AI 简报生成
│   │   └── update-cookies.js        # Cookie 认证管理
│   └── tests/                 # 🧪 测试文件
│       ├── connection-optimization.js # 连接优化测试
│       ├── proxy-utils.js           # 代理工具测试
│       ├── proxy.test.js            # 代理功能测试
│       └── supabase-connection.test.js # 数据库连接测试
├── logs/                      # 📝 日志文件目录
├── outputs/                   # 📊 报告输出目录
├── .env.example              # ⚙️ 环境变量模板
├── app.js                    # 🎯 主应用服务（内置任务调度）
├── start.sh                  # 启动脚本
├── docker-compose.yml        # 容器编排配置
├── Dockerfile                # Docker 镜像配置
├── jest.config.js            # 测试配置
└── package.json              # 📋 项目依赖配置
```

## 使用方法 📖

### 📊 基本数据爬取

```bash
# 爬取推文数据
node scripts/crawl-tweets.js

# 生成AI分析报告
node scripts/generate-report.js

# 更新登录状态
node scripts/update-cookies.js
```

### 🔧 高级配置选项

```bash
# 启用调试模式
NODE_ENV=development node scripts/crawl-tweets.js

# 启用详细日志
DEBUG=* node scripts/generate-report.js

# 测试特定功能
npm run test-ai              # 测试AI功能
npm run check-config         # 检查配置
npm run debug-data-loss      # 调试数据问题
```

### 🧪 测试和验证

```bash
# 测试代理连接
node tests/testProxy.js

# 验证数据库连接
node -e "require('./src/lib/supabase').testConnection()"

# 运行完整测试套件
npm test
```

## 定时任务配置 ⏰

### 🎯 内置任务调度器

项目采用 **Node.js 内置定时器**实现任务调度，无需配置系统 cron 或 shell 脚本。服务启动后自动按计划执行所有任务。

### 定时任务配置

项目使用 **Node.js 内置调度器** 进行任务调度，无需依赖系统 cron：

```javascript
// 在 start.js 中配置调度时间
const SCHEDULE_TIME = process.env.SCHEDULE_TIME || '23:00'; // 默认每天 23:00

// 支持的时间格式
// '23:00'     - 每天 23:00
// '*/2 * * * *' - 每 2 分钟（cron 格式）
// '0 */6 * * *' - 每 6 小时
```

#### 调度器特性
- ✅ **内置调度**: 无需系统 cron 依赖
- ✅ **容器友好**: 完美适配 Docker 环境
- ✅ **灵活配置**: 支持环境变量动态配置
- ✅ **自动重启**: 任务失败后自动重新调度
- ✅ **状态监控**: 实时显示下次执行时间

**默认执行时间表：**

| 任务 | 时间 | 描述 |
|------|------|------|
| 日志清理 | 每天 02:00 | 清理7天前的日志文件 |
| 上午爬取 | 每天 09:00 | 执行推文爬取任务 |
| 下午爬取 | 每天 16:00 | 执行推文爬取任务 |
| 生成报告 | 每天 23:00 | 生成AI分析报告 |

### 🔧 自定义任务时间

如需修改任务执行时间，编辑 `app.js` 文件中的 cron 表达式：

```javascript
// 例如：改为每天上午8点执行
scheduler.addTask('crawl-tweets-morning', '0 8 * * *', 'npm', ['start']);

// Cron 表达式格式：秒 分 时 日 月 星期
// 0 9 * * *  = 每天上午9点
// 0 */6 * * * = 每6小时执行一次
// 0 0 * * 1  = 每周一午夜执行
```

### 📊 服务监控和管理

#### 查看服务状态

```bash
# Docker 环境
docker-compose ps
docker-compose logs -f twitter-ai
docker-compose logs --tail=100 twitter-ai

# 本地环境
ps aux | grep "node.*app.js"
tail -f logs/app.log
```

#### 重启服务

```bash
# Docker 环境
docker-compose restart twitter-ai
docker-compose up -d --build  # 重新构建并启动

# 本地环境
# 使用 Ctrl+C 停止服务，然后重新启动
npm run serve
```

#### 手动执行任务

```bash
# Docker 环境
docker exec twitter-ai-reporter npm start
docker exec twitter-ai-reporter npm run generate-report

# 本地环境
node scripts/crawl-tweets.js
node scripts/generate-report.js
```

### 🚀 架构优势

1. **简化部署**: 不需要配置 cron 和 shell 脚本
2. **统一日志**: 所有任务日志集成在应用日志中
3. **优雅关闭**: 支持 SIGINT 和 SIGTERM 信号处理
4. **跨平台**: 不依赖特定的 shell 环境
5. **易于调试**: 所有逻辑都在 Node.js 中
6. **资源效率**: 更轻量的容器镜像

## Docker 部署 🐳

### 🚀 简化的 Docker 架构

项目已完全简化 Docker 部署流程：
- ✅ **移除 cron 依赖**: 不再需要复杂的 cron 配置
- ✅ **移除 shell 脚本**: 纯 Node.js 服务架构
- ✅ **轻量化镜像**: 更小的容器体积和更快的启动速度
- ✅ **统一日志**: 集成的日志管理和自动清理

### 📦 快速部署

#### 1. 准备环境

```bash
# 克隆项目
git clone <repository-url>
cd twitter-ai-reporter

# 创建必要的目录
mkdir -p logs outputs

# 确保 cookies.json 文件存在
touch cookies.json

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件配置所有必需变量
```

#### 2. 一键启动

```bash
# 构建并启动服务
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看实时日志
docker-compose logs -f twitter-ai
```

#### 3. 服务管理

```bash
# 重启服务
docker-compose restart twitter-ai

# 重新构建并启动
docker-compose up -d --build

# 停止服务
docker-compose stop

# 停止并删除容器
docker-compose down

# 进入容器调试
docker-compose exec twitter-ai sh
```

### 群辉 NAS 部署指南

**前置要求：**
- 群辉 NAS 已安装 Docker 套件
- 确保有足够的存储空间（建议 5GB+）和内存资源（建议 2GB+）

**部署步骤：**

1. **上传项目文件**
   ```bash
   # 建议放在以下目录
   /volume1/docker/twitter-ai-reporter/
   ```

2. **设置权限**
   ```bash
   # SSH 连接到群辉 NAS 后执行
   sudo chown -R 1000:1000 /volume1/docker/twitter-ai-reporter/
   sudo chmod -R 755 /volume1/docker/twitter-ai-reporter/
   ```

3. **配置环境变量**
   ```bash
   cd /volume1/docker/twitter-ai-reporter/
   cp .env.example .env
   # 编辑 .env 文件，特别注意设置正确的 Chrome 路径
   echo "CHROME_EXECUTABLE_PATH=/usr/bin/chromium-browser" >> .env
   ```

4. **启动服务**
   ```bash
   docker-compose up -d
   ```

### Docker 配置说明

**资源限制：**
- 内存限制：1GB（预留512MB）
- CPU限制：0.5核心（预留0.25核心）
- 存储：自动清理日志，保留最近30天

**数据持久化：**
- `./outputs` - 报告输出目录
- `./cookies.json` - 登录状态文件
- `./logs` - 日志文件目录
- `./.env` - 环境配置文件

**网络配置：**
- 使用桥接网络模式
- 支持代理配置
- 自动处理 DNS 解析

### Chrome 浏览器路径配置

**问题说明：**
Docker 容器中可能出现 Chrome 浏览器路径错误：
```
Browser was not found at the configured executablePath
```

**解决方案：**

1. **环境变量配置**（推荐）：
```bash
# 在 .env 文件中设置正确路径
CHROME_EXECUTABLE_PATH=/usr/bin/chromium-browser
```

2. **不同环境的路径配置**：
```bash
# Docker 环境
CHROME_EXECUTABLE_PATH=/usr/bin/chromium-browser

# macOS 本地开发
CHROME_EXECUTABLE_PATH=/Applications/Google Chrome.app/Contents/MacOS/Google Chrome

# Linux 系统
CHROME_EXECUTABLE_PATH=/usr/bin/google-chrome

# Windows 系统
CHROME_EXECUTABLE_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe
```

3. **验证配置**：
```bash
# 进入容器检查
docker exec -it twitter-ai-reporter sh
ls -la /usr/bin/chromium-browser

# 测试浏览器启动
chromium-browser --version
```

## 📝 日志系统

### 日志系统特性

项目采用**内置日志管理系统**，提供统一的日志格式和自动化管理功能：

- ✅ **统一日志格式**: 所有输出都包含 ISO 时间戳和任务标识符
- ✅ **自动日志轮转**: 当日志文件超过指定大小时自动创建新文件
- ✅ **智能清理**: 自动删除过期日志文件，保留最近的记录
- ✅ **内存优化**: 适配群辉 NAS 等资源受限环境
- ✅ **实时监控**: 支持实时日志查看和状态监控

### 日志标识符说明

| 标识符 | 含义 |
|--------|------|
| `[CONTAINER-START]` | 容器启动 |
| `[SCHEDULER-START]` | 任务调度器启动 |
| `[CRAWL-START]` | 开始爬取 |
| `[CRAWL-SUCCESS]` | 爬取成功 |
| `[CRAWL-ERROR]` | 爬取错误 |
| `[AUTH-START]` | 开始认证 |
| `[AUTH-SUCCESS]` | 认证成功 |
| `[AUTH-ERROR]` | 认证错误 |
| `[REPORT-START]` | 开始生成报告 |
| `[REPORT-SUCCESS]` | 报告生成成功 |
| `[REPORT-ERROR]` | 报告生成错误 |
| `[LOG-CLEANUP]` | 日志清理 |
| `[TASK-SCHEDULED]` | 任务已调度 |

### 日志查看和管理

#### 查看实时日志
```bash
# Docker 环境 - 查看应用日志
docker-compose logs -f twitter-ai
docker-compose logs --tail=100 twitter-ai

# 本地环境 - 查看日志文件
tail -f logs/app.log
tail -f logs/error.log

# 查看特定日期的日志
ls logs/
cat logs/2024-01-15.log
```

#### 日志文件结构
```
logs/
├── app.log              # 当前应用日志
├── error.log            # 错误日志
├── 2024-01-15.log      # 按日期归档的日志
├── 2024-01-14.log      # 历史日志文件
└── .gitkeep            # Git 目录占位文件
```

#### 日志格式示例
```
[2024-01-15T09:00:02.123Z] [SCHEDULER-START] 任务调度器已启动
[2024-01-15T09:00:05.456Z] [CRAWL-START] 开始执行推文爬取任务...
[2024-01-15T09:00:10.789Z] [CRAWL-SUCCESS] 成功创建浏览器实例
[2024-01-15T09:15:30.012Z] [CRAWL-SUCCESS] 推文爬取完成，共收集 25 条推文
[2024-01-15T23:00:01.345Z] [REPORT-START] 开始生成 AI 分析报告
[2024-01-15T23:05:15.678Z] [REPORT-SUCCESS] AI 报告生成完成: outputs/tech-report-2024-01-15.md
```

### 日志系统优势

相比传统的 cron 日志系统，内置日志管理具有以下优势：

1. **清晰的输出**: 移除了 cron 任务中的乱码和二进制数据
2. **完整的信息**: 包含完整的时间戳和任务标识
3. **统一的格式**: 所有日志输出都遵循统一的格式标准
4. **自动管理**: 无需手动清理，系统自动处理日志轮转和清理
5. **易于调试**: 结构化的日志信息便于问题定位和调试

## 故障排除 🔧

### 🚨 常见问题及解决方案

#### 1. 服务启动问题

**Q: 服务无法启动？**

解决步骤：
```bash
# 1. 检查环境变量配置
npm run check-config

# 2. 查看容器日志
docker-compose logs twitter-ai

# 3. 验证配置文件
cat .env | grep -v "^#" | grep -v "^$"

# 4. 检查资源使用
docker stats twitter-ai
```

**Q: 任务没有执行？**

解决步骤：
```bash
# 1. 检查系统时间是否正确
date

# 2. 查看应用日志中的任务调度信息
tail -f logs/app.log | grep "scheduler"

# 3. 手动执行任务测试
node scripts/crawl-tweets.js
```

#### 2. 环境配置问题

**Q: 如何获取 Supabase 配置？**

A: 在 Supabase 项目设置中找到 API 密钥和项目 URL

**Q: 硅基流动 API 密钥在哪里获取？**

A: 访问硅基流动官网注册账号并获取 API 密钥

**Q: 代理配置是必需的吗？**

A: 根据网络环境决定，配置 PROXY_HOST 和 PROXY_PORT 即可

#### 2. 运行问题

**Q: 推文爬取失败怎么办？**

解决步骤：
```bash
# 1. 检查登录状态
node scripts/update-cookies.js

# 2. 验证网络连接
node tests/testProxy.js

# 3. 检查浏览器配置
echo $CHROME_EXECUTABLE_PATH

# 4. 查看详细错误日志
NODE_ENV=development node scripts/crawl-tweets.js
```

**Q: AI 简报生成失败？**

解决步骤：
```bash
# 1. 验证 API 密钥
curl -H "Authorization: Bearer $SILICONFLOW_API_KEY" \
     https://api.siliconflow.cn/v1/models

# 2. 测试 AI 功能
npm run test-ai

# 3. 检查网络连接
ping api.siliconflow.cn
```

#### 4. 性能和资源问题

**Q: 内存不足或处理缓慢？**

解决方案：
```bash
# 1. 调整 docker-compose.yml 中的内存限制
# 在 docker-compose.yml 中添加：
# deploy:
#   resources:
#     limits:
#       memory: 2G
#     reservations:
#       memory: 1G

# 2. 监控容器资源使用情况
docker stats twitter-ai

# 3. 优化并发配置
echo "MAX_CONCURRENT=1" >> .env
echo "REQUEST_DELAY=2000" >> .env

# 4. 调整 Node.js 内存限制
node --max-old-space-size=4096 scripts/crawl-tweets.js
```

### 🔧 调试模式

```bash
# 本地调试运行
node app.js

# 查看详细日志
DEBUG=* node app.js

# 启用详细日志级别
LOG_LEVEL=debug npm run serve
```

### 🔄 迁移指南

如果你之前使用的是 cron 版本，迁移步骤：

1. **停止旧服务**:
   ```bash
   docker-compose down
   ```

2. **更新代码到最新版本**:
   ```bash
   git pull origin main
   ```

3. **重新构建并启动**:
   ```bash
   docker-compose up -d --build
   ```

4. **验证服务正常运行**:
   ```bash
   docker-compose logs -f twitter-ai
   ```

**注意**: 旧的 shell 脚本和 cron 配置文件仍然保留，但不再使用。

**Q: 数据库连接失败？**

解决步骤：
```bash
# 1. 测试数据库连接
node -e "require('./src/lib/supabase').testConnection()"

# 2. 验证配置
echo $SUPABASE_URL
echo $SUPABASE_ANON_KEY

# 3. 检查网络访问
curl -I $SUPABASE_URL
```

#### 3. Docker 部署问题

**Q: 容器启动失败？**

解决步骤：
```bash
# 1. 检查日志
docker compose logs twitter-ai-reporter

# 2. 验证环境文件
cat .env | grep -v "^#" | grep -v "^$"

# 3. 检查资源使用
docker stats twitter-ai-reporter

# 4. 重新构建
docker compose down
docker compose build --no-cache
docker compose up -d
```

**Q: 权限问题？**

解决步骤：
```bash
# 设置正确的文件权限
sudo chown -R 1000:1000 logs outputs cookies.json
sudo chmod -R 755 logs outputs
sudo chmod 644 cookies.json
```

#### 4. 性能问题

**Q: 内存不足或处理缓慢？**

解决方案：
```bash
# 1. 调整 Node.js 内存限制
node --max-old-space-size=4096 scripts/crawl-tweets.js

# 2. 优化并发配置
echo "MAX_CONCURRENT=1" >> .env
echo "REQUEST_DELAY=2000" >> .env

# 3. 监控资源使用
top -p $(pgrep -f "node.*crawl-tweets")
```

### 🔍 调试和监控

#### 启用详细日志
```bash
# 设置调试级别
LOG_LEVEL=debug node scripts/crawl-tweets.js

# 启用 Puppeteer 调试
DEBUG=puppeteer:* node scripts/crawl-tweets.js

# 查看实时日志
tail -f logs/app.log
tail -f logs/error.log
```

#### 性能监控
```bash
# 查看系统资源
docker stats twitter-ai-reporter

# 监控进程
ps aux | grep node

# 检查磁盘使用
df -h
du -sh logs/ outputs/
```

#### 网络诊断
```bash
# 测试网络连接
ping twitter.com
nslookup twitter.com
curl -I https://twitter.com

# 测试代理连接
curl -x http://$PROXY_HOST:$PROXY_PORT http://www.example.com
```

### 📞 获取帮助

如果遇到无法解决的问题：

1. **查看日志文件**: `logs/error.log` 和 `logs/app.log`
2. **运行诊断脚本**: `npm run check-config`
3. **检查系统要求**: 确保满足所有环境要求
4. **更新依赖**: `npm update` 或 `npm audit fix`
5. **重启服务**: 清理缓存并重新启动

```bash
# 完整的故障排除流程
npm run check-config
node tests/testProxy.js
npm run test-ai
docker compose logs --tail=100
```

## 🔒 安全注意事项

### 数据安全
- 🚫 **不要将 `.env` 文件提交到版本控制系统**
- 🔑 **定期更新 API 密钥和登录凭据**
- 🛡️ **使用强密码和双因素认证**
- 🔐 **在生产环境中使用 HTTPS**
- 💾 **定期备份数据库数据**

### 网络安全
- 🌐 **使用可信的代理服务器**
- 🔒 **避免在公共网络中运行敏感操作**
- 🚪 **配置防火墙规则限制访问**
- 📊 **监控异常网络活动**

### 容器安全
- 🐳 **定期更新 Docker 镜像**
- 👤 **使用非 root 用户运行容器**
- 📁 **限制容器文件系统权限**
- 🔍 **定期扫描安全漏洞**

## 🤝 贡献指南

### 开发环境设置

1. **克隆并设置开发环境**：
```bash
git clone <repository-url>
cd twitter-ai-reporter
npm install
cp .env.example .env
```

2. **安装开发依赖**：
```bash
npm install --save-dev jest eslint prettier
```

3. **配置代码格式化**：
```bash
npm run lint
npm run format
```

### 代码规范

- ✅ 使用 ES6+ 语法
- ✅ 遵循 ESLint 配置
- ✅ 添加适当的注释和文档
- ✅ 编写单元测试
- ✅ 使用语义化的提交信息

### 提交流程

1. **Fork 项目**到你的 GitHub 账户
2. **创建功能分支**：`git checkout -b feature/amazing-feature`
3. **提交更改**：`git commit -m 'feat: add some amazing feature'`
4. **推送分支**：`git push origin feature/amazing-feature`
5. **创建 Pull Request**

### 提交规范

使用约定式提交格式：
```
type(scope): description

[optional body]

[optional footer]
```

**类型说明：**
- `feat`: 新功能
- `fix`: 修复 bug
- `docs`: 文档更新
- `style`: 代码格式调整
- `refactor`: 代码重构
- `test`: 测试相关
- `chore`: 构建过程或辅助工具的变动

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件。

---

## 📞 支持与反馈

- 🐛 **Bug 报告**: [GitHub Issues](https://github.com/your-repo/issues)
- 💡 **功能建议**: [GitHub Discussions](https://github.com/your-repo/discussions)
- 📧 **联系我们**: your-email@example.com
- 📚 **文档**: [项目 Wiki](https://github.com/your-repo/wiki)

---

**⭐ 如果这个项目对你有帮助，请给我们一个 Star！**