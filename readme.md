# Twitter AI Reporter 🐦📊

一个专业的 Twitter/X.com 智能分析和报告生成系统，集成推文采集、AI 分析和自动化报告功能。

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

- 🔍 **智能推文爬取**: 自动爬取指定列表的推文数据，支持批量处理
- 🤖 **AI 智能分析**: 使用硅基流动API分析推文内容，生成深度洞察
- 📊 **自动报告生成**: 生成结构化的科技资讯简报，支持多种格式
- 🔐 **安全认证**: 支持 Cookie 认证和环境变量配置，保障数据安全
- 💾 **数据存储**: 集成 Supabase 数据库存储，支持数据持久化
- 🔄 **数据去重**: 智能去重机制避免重复数据，提升数据质量
- 🌐 **代理支持**: 支持HTTP代理配置，适应不同网络环境
- ⏰ **定时执行**: 支持 Cron 定时任务自动化运行
- 🐳 **容器化部署**: 完整的 Docker 支持，适配群辉 NAS 等环境
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

### 1. 安装依赖

```bash
# 使用 npm
npm install

# 或使用 pnpm（推荐）
pnpm install

# 或使用 yarn
yarn install
```

### 2. 环境配置

复制环境变量模板并配置：

```bash
cp .env.example .env
```

编辑 `.env` 文件，配置必要的环境变量（详见下方配置说明）。

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

#### 使用 npm 脚本

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
├── scripts/                 # 🚀 执行脚本
│   ├── crawl-tweets.js     # Twitter 数据爬取
│   ├── generate-report.js  # AI 简报生成
│   └── update-cookies.js   # Cookie 认证管理
├── src/                    # 📦 核心功能模块
│   ├── lib/               # 工具库和配置
│   ├── services/          # 业务服务模块
│   └── data/              # 数据处理模块
├── tests/                  # 🧪 测试文件
├── logs/                   # 📝 日志文件目录
├── reports/                # 📊 报告输出目录
├── docker/                 # 🐳 Docker 相关文件
├── .env.example           # ⚙️ 环境变量模板
├── docker-compose.yml     # 容器编排配置
├── Dockerfile             # Docker 镜像配置
├── crontab                # 定时任务配置
└── package.json           # 📋 项目依赖配置
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

### Docker 环境中的定时任务

项目已配置完整的定时任务支持，可在 Docker 容器中自动执行。

**执行时间表：**
- **上午 9:00**: 执行推文爬取任务
- **下午 4:00**: 执行推文爬取任务
- **晚上 11:00**: 生成AI分析报告

**Cron 表达式说明：**
```bash
# 分钟 小时 日 月 星期 命令
0 9 * * *    # 每天上午9点
0 16 * * *   # 每天下午4点
0 23 * * *   # 每天晚上11点
```

### Linux/macOS 系统使用 Cron

1. **编辑 Cron 任务**：
```bash
crontab -e
```

2. **添加定时任务示例**：
```bash
# 每天凌晨 2 点执行数据爬取
0 2 * * * cd /path/to/twitter-ai-reporter && node scripts/crawl-tweets.js >> /var/log/twitter-reporter.log 2>&1

# 每 6 小时执行一次
0 */6 * * * cd /path/to/twitter-ai-reporter && node scripts/crawl-tweets.js

# 每周一上午 9 点生成周报
0 9 * * 1 cd /path/to/twitter-ai-reporter && node scripts/generate-report.js
```

3. **查看和管理 Cron 任务**：
```bash
# 查看当前任务
crontab -l

# 删除所有任务
crontab -r
```

### Windows 系统使用任务计划程序

1. 打开「任务计划程序」
2. 创建基本任务
3. 设置触发器（时间安排）
4. 设置操作：
   - 程序：`node`
   - 参数：`scripts/crawl-tweets.js`
   - 起始位置：项目根目录路径

### 定时任务监控

```bash
# 查看定时任务日志
docker exec twitter-ai-reporter tail -f /var/log/cron.log

# 查看应用日志
docker logs twitter-ai-reporter

# 手动执行任务
docker exec twitter-ai-reporter npm start
docker exec twitter-ai-reporter npm run generate-report
```

## Docker 部署 🐳

### 基础 Docker 部署

#### 1. 准备环境

```bash
# 创建必要的目录
mkdir -p logs reports

# 确保 cookies.json 文件存在
touch cookies.json

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件配置所有必需变量
```

#### 2. 构建和启动

```bash
# 构建镜像
docker compose build

# 启动服务
docker compose up -d

# 查看日志
docker compose logs -f
```

#### 3. 服务管理

```bash
# 重启服务
docker compose restart

# 停止服务
docker compose down

# 更新服务
docker compose pull
docker compose up -d

# 进入容器调试
docker compose exec twitter-ai-reporter sh
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
- `./reports` - 报告输出目录
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

## 故障排除 🔧

### 🚨 常见问题及解决方案

#### 1. 环境配置问题

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
sudo chown -R 1000:1000 logs reports cookies.json
sudo chmod -R 755 logs reports
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
du -sh logs/ reports/
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