# 环境变量配置文档

本文档详细说明了 X.com 数据采集服务所需的环境变量配置。

## 📋 配置清单

### 必需配置

以下环境变量是服务正常运行的必要配置：

#### X.com API 配置

```env
# X.com API Bearer Token
X_TOKEN=AAAAAAAAAAAAAAAAAAAAAEvF3QEAAAAAqQPitn6aODiLvUjmJWkf8D0zBjw%3DqMx1234567890abcdef

# X.com 列表 ID
X_LIST_ID=123456789
```

**获取方法**：
- `X_TOKEN`: 从 X.com Developer Portal 获取 Bearer Token
- `X_LIST_ID`: 从 X.com 列表 URL 中提取，格式如 `https://twitter.com/i/lists/{LIST_ID}`

#### Supabase 数据库配置

```env
# Supabase 项目 URL
SUPABASE_URL=https://your-project-id.supabase.co

# Supabase 匿名密钥
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvdXItcHJvamVjdC1pZCIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNjc4ODg2NDAwLCJleHAiOjE5OTQ0NjI0MDB9.example-signature
```

**获取方法**：
- 登录 [Supabase Dashboard](https://supabase.com/dashboard)
- 选择你的项目
- 进入 Settings > API
- 复制 Project URL 和 anon public key

### 可选配置

以下环境变量为可选配置，用于增强功能：

#### X.com 自动登录配置

```env
# X.com 用户名或邮箱（用于自动登录）
X_USERNAME=your_username
# 或者使用邮箱
X_USERNAME=your_email@example.com

# X.com 登录密码
X_PASSWORD=your_password
```

**用途**：
- 用于 `loginAndSaveCookies.js` 脚本自动登录
- 获取必要的 cookies 用于数据采集
- 如果不配置，需要手动获取 cookies

#### 服务器配置

```env
# 服务器端口（默认：3001）
PORT=3001

# 运行环境（默认：development）
NODE_ENV=production
```

## 🔧 配置步骤

### 1. 复制模板文件

```bash
cp .env.example .env
```

### 2. 编辑配置文件

使用文本编辑器打开 `.env` 文件：

```bash
# 使用 nano 编辑器
nano .env

# 或使用 vim 编辑器
vim .env

# 或使用 VS Code
code .env
```

### 3. 填入实际值

将模板中的占位符替换为实际的配置值：

```env
# 替换前（模板）
X_TOKEN=your_x_api_bearer_token

# 替换后（实际值）
X_TOKEN=AAAAAAAAAAAAAAAAAAAAAEvF3QEAAAAAqQPitn6aODiLvUjmJWkf8D0zBjw%3DqMx1234567890abcdef
```

### 4. 验证配置

启动服务验证配置是否正确：

```bash
npm start
```

如果配置正确，服务将正常启动并显示相关信息。

## 🔍 配置验证

### 检查必需配置

确保以下配置已正确设置：

```bash
# 检查 X.com 配置
echo "X_TOKEN: ${X_TOKEN:0:20}..."
echo "X_LIST_ID: $X_LIST_ID"

# 检查 Supabase 配置
echo "SUPABASE_URL: $SUPABASE_URL"
echo "SUPABASE_ANON_KEY: ${SUPABASE_ANON_KEY:0:20}..."
```

### 测试连接

#### 测试 Supabase 连接

```javascript
// 在 Node.js 中测试
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// 测试查询
supabase.from('tweets').select('count').then(console.log);
```

#### 测试 X.com API

```bash
# 使用 curl 测试 API
curl -H "Authorization: Bearer $X_TOKEN" \
     "https://api.twitter.com/2/lists/$X_LIST_ID/tweets"
```

## 🚨 安全注意事项

### 1. 保护敏感信息

- **永远不要**将 `.env` 文件提交到版本控制系统
- 确保 `.env` 文件已添加到 `.gitignore`
- 定期更换 API 密钥和密码

### 2. 权限控制

```bash
# 设置 .env 文件权限（仅所有者可读写）
chmod 600 .env
```

### 3. 环境隔离

为不同环境使用不同的配置文件：

```bash
# 开发环境
.env.development

# 生产环境
.env.production

# 测试环境
.env.test
```

## 🐳 Docker 环境配置

### 使用环境变量文件

在 `docker-compose.yml` 中指定环境变量文件：

```yaml
services:
  app:
    build: .
    env_file:
      - .env
    ports:
      - "8095:3001"
```

### 直接在 Docker Compose 中配置

```yaml
services:
  app:
    build: .
    environment:
      - X_TOKEN=${X_TOKEN}
      - X_LIST_ID=${X_LIST_ID}
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
    ports:
      - "8095:3001"
```

## 🔧 故障排除

### 常见错误

#### 1. 环境变量未加载

**错误信息**：`undefined` 或 `null` 值

**解决方案**：
- 检查 `.env` 文件是否存在
- 确认变量名拼写正确
- 验证 `dotenv` 包是否正确加载

#### 2. Supabase 连接失败

**错误信息**：`Invalid API key` 或连接超时

**解决方案**：
- 验证 `SUPABASE_URL` 格式正确
- 检查 `SUPABASE_ANON_KEY` 是否有效
- 确认 Supabase 项目状态正常

#### 3. X.com API 访问被拒绝

**错误信息**：`401 Unauthorized` 或 `403 Forbidden`

**解决方案**：
- 检查 `X_TOKEN` 是否有效
- 验证 API 权限设置
- 确认 `X_LIST_ID` 存在且可访问

### 调试技巧

#### 1. 启用详细日志

```env
# 添加调试配置
DEBUG=true
LOG_LEVEL=debug
```

#### 2. 使用测试脚本

创建 `test-config.js` 验证配置：

```javascript
require('dotenv').config();

const requiredVars = ['X_TOKEN', 'X_LIST_ID', 'SUPABASE_URL', 'SUPABASE_ANON_KEY'];

requiredVars.forEach(varName => {
  if (!process.env[varName]) {
    console.error(`❌ 缺少必需的环境变量: ${varName}`);
  } else {
    console.log(`✅ ${varName}: ${process.env[varName].substring(0, 10)}...`);
  }
});
```

运行测试：

```bash
node test-config.js
```

## 📚 参考资源

- [Supabase 文档](https://supabase.com/docs)
- [X.com API 文档](https://developer.twitter.com/en/docs)
- [dotenv 包文档](https://www.npmjs.com/package/dotenv)
- [Docker 环境变量指南](https://docs.docker.com/compose/environment-variables/)