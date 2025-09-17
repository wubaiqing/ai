# Docker Chrome 浏览器路径修复说明

## 问题描述
Docker 容器中报错：`Browser was not found at the configured executablePath (/Applications/Google Chrome.app/Contents/MacOS/Google Chrome)`

## 问题原因
脚本中配置的 Chrome 浏览器路径是 macOS 本地路径，在 Docker 容器中不存在。

## 修复内容

### 1. 修改 `scripts/crawl-tweets.js`
- 将 `CHROME_EXECUTABLE_PATH` 从硬编码的 macOS 路径改为环境变量配置
- 默认值设为 Docker 容器中的 Chromium 路径：`/usr/bin/chromium-browser`

```javascript
// 修改前
CHROME_EXECUTABLE_PATH: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",

// 修改后
CHROME_EXECUTABLE_PATH: process.env.CHROME_EXECUTABLE_PATH || "/usr/bin/chromium-browser",
```

### 2. 修改 `scripts/update-cookies.js`
- 同样将 `CHROME_EXECUTABLE_PATH` 改为环境变量配置
- 默认值设为 Docker 容器中的 Chromium 路径

```javascript
// 修改前
CHROME_EXECUTABLE_PATH: process.env.CHROME_EXECUTABLE_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',

// 修改后
CHROME_EXECUTABLE_PATH: process.env.CHROME_EXECUTABLE_PATH || '/usr/bin/chromium-browser',
```

### 3. 更新环境变量配置
- 在 `.env.example` 文件中添加 `CHROME_EXECUTABLE_PATH` 配置
- 通过 `.env` 文件管理不同环境的浏览器路径
- `docker-compose.yml` 通过 `env_file` 自动读取环境变量

```bash
# .env.example 中的配置
CHROME_EXECUTABLE_PATH=/Applications/Google Chrome.app/Contents/MacOS/Google Chrome
```

## 验证修复

### Dockerfile 配置确认
- ✅ 已安装 Chromium：`chromium`
- ✅ 已设置 Puppeteer 环境变量：`PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser`
- ✅ 已跳过 Chromium 下载：`PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true`

### 测试步骤
1. 重新构建 Docker 镜像：`docker compose build`
2. 启动容器：`docker compose up -d`
3. 查看容器日志：`docker compose logs -f`

## 兼容性说明
- ✅ Docker 环境：使用 `/usr/bin/chromium-browser`
- ✅ 本地开发：可通过环境变量 `CHROME_EXECUTABLE_PATH` 指定本地 Chrome 路径
- ✅ 跨平台：支持通过环境变量动态配置浏览器路径

## 环境变量配置示例

### 本地开发 (.env)
```bash
# macOS
CHROME_EXECUTABLE_PATH=/Applications/Google Chrome.app/Contents/MacOS/Google Chrome

# Linux
CHROME_EXECUTABLE_PATH=/usr/bin/google-chrome

# Windows
CHROME_EXECUTABLE_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe
```

### Docker 环境
```bash
# .env 文件中配置（用于 Docker 部署）
CHROME_EXECUTABLE_PATH=/usr/bin/chromium-browser
```

注意：Docker 环境需要在 `.env` 文件中将 `CHROME_EXECUTABLE_PATH` 设置为 `/usr/bin/chromium-browser`，而不是使用 `.env.example` 中的默认 macOS 路径。

修复完成后，Docker 容器应该能够正常启动并使用 Chromium 浏览器执行爬取任务。