# X.com (Twitter) 数据采集服务

一个基于 Node.js 的 X.com (Twitter) 数据采集和存储服务，支持定时采集指定列表的推特数据并存储到 Supabase 数据库。

## ✨ 功能特性

* 🔄 **自动定时采集**: 基于 node-cron 的本地定时任务

* 📊 **数据存储**: 集成 Supabase 数据库存储

* 🛡️ **模块化架构**: 清晰的代码结构，易于维护和扩展

* 🐳 **Docker 容器化**: 支持 Docker 容器部署，易于在 NAS 等环境中运行

* 🔐 **自动登录**: 支持自动登录 X.com 获取 cookies

* 📝 **完整日志**: 详细的操作日志和错误处理

## 📁 项目结构

```
data-capture/
├── lib/                    # 核心库文件
│   ├── config.js          # 配置管理
│   ├── database.js        # 数据库操作
│   ├── scheduler.js       # 定时任务调度
│   └── twitter.js         # Twitter API 集成
├── serve/                 # 服务器文件
│   └── x.js              # 主服务器文件
├── supabase/              # 数据库迁移文件
│   └── migrations/
│       └── create_tweets_table.sql
├── .env.example          # 环境变量模板
├── .gitignore            # Git 忽略文件
├── cookies.json          # X.com 登录 cookies
├── Dockerfile            # Docker 镜像配置
├── docker-compose.yml    # Docker Compose 配置
├── loginAndSaveCookies.js # 自动登录脚本
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

# X.com 登录凭据 (用于自动登录获取cookies)
X_USERNAME=your_x_username_or_email
X_PASSWORD=your_x_password

# Supabase 配置
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key

# 服务器配置
PORT=3001
NODE_ENV=development
```

### 3. 数据库设置

项目使用 Supabase 作为数据库，需要先创建数据表：

```bash
# 在 Supabase 控制台中执行 supabase/migrations/create_tweets_table.sql 文件
```

数据表结构：

```sql
CREATE TABLE tweets (
  id BIGSERIAL PRIMARY KEY,
  url TEXT UNIQUE NOT NULL,
  content TEXT,
  list_id TEXT,
  published_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4. 获取 X.com Cookies

项目提供了自动登录工具来获取必要的 cookies：

```bash
# 自动登录并保存 cookies
npm run login
```

**说明**：

* 该脚本会使用 `.env` 文件中的 `X_USERNAME` 和 `X_PASSWORD` 自动登录 X.com

* 登录成功后会自动保存 cookies 到 `cookies.json` 文件

* 如果已存在有效的 cookies 文件，脚本会跳过登录过程

* 首次运行时建议设置 `headless: false` 以便观察登录过程

### 5. 启动服务

```bash
# 开发模式
npm run dev

# 生产模式
npm start
```

服务将在 `http://localhost:3001` 启动。

### 6. Docker 部署（推荐）

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

## ⚙️ 配置说明

### 环境变量

| 变量名                 | 必需 | 说明                     | 示例                                 |
| ------------------- | -- | ---------------------- | ---------------------------------- |
| `X_TOKEN`           | ✅  | X.com API Bearer Token | `AAAAAAAAAAAAAAAAAAAAAEvF3QEA...`  |
| `X_LIST_ID`         | ✅  | X.com 列表 ID            | `123456789`                        |
| `X_USERNAME`        | ❌  | X.com 用户名或邮箱           | `your_username` 或 `user@email.com` |
| `X_PASSWORD`        | ❌  | X.com 登录密码             | `your_password`                    |
| `SUPABASE_URL`      | ✅  | Supabase 项目 URL        | `https://xxx.supabase.co`          |
| `SUPABASE_ANON_KEY` | ✅  | Supabase 匿名密钥          | `eyJhbGciOiJIUzI1NiIsInR5cCI6...`  |
| `PORT`              | ❌  | 服务器端口                  | `8095` (Docker) / `3001` (开发)      |
| `NODE_ENV`          | ❌  | 运行环境                   | `production`                       |

### 定时任务配置

定时任务通过 `node-cron` 实现，可在代码中配置执行频率。默认配置为每小时执行一次数据采集。

## 🛠️ 开发

### 脚本命令

```bash
# 开发模式
npm run dev

# 生产模式
npm start

# 自动登录获取 cookies
npm run login
```

### 代码结构

* **lib/config.js**: 统一的配置管理，包含环境变量验证

* **lib/database.js**: Supabase 数据库操作封装

* **lib/twitter.js**: X.com API 集成和数据处理

* **lib/scheduler.js**: 定时任务调度和数据收集逻辑

* **serve/x.js**: 主服务器文件，数据采集和处理逻辑

* **loginAndSaveCookies.js**: 自动登录脚本，获取 X.com cookies

* **supabase/migrations/**: 数据库迁移文件，包含表结构定义

### 数据库结构

**tweets 表字段说明**：

| 字段名              | 类型          | 说明            |
| ---------------- | ----------- | ------------- |
| `id`             | BIGSERIAL   | 主键，自增 ID      |
| `url`            | TEXT        | 推文 URL，唯一约束   |
| `content`        | TEXT        | 推文内容          |
| `list_id`        | TEXT        | X.com 列表 ID   |
| `published_date` | TIMESTAMPTZ | 推文发布时间        |
| `created_at`     | TIMESTAMPTZ | 记录创建时间，默认当前时间 |

## 🔧 故障排除

### 常见问题

1. **环境变量配置错误**

   * 检查 `.env` 文件是否存在且配置正确

   * 确认所有必需的环境变量都已设置

2. **Supabase 连接失败**

   * 验证 `SUPABASE_URL` 和 `SUPABASE_ANON_KEY` 是否正确

   * 检查 Supabase 项目是否正常运行

   * 确认数据表已正确创建

3. **X.com API 访问失败**

   * 确认 `X_TOKEN` 是否有效

   * 检查 `X_LIST_ID` 是否存在且可访问

   * 验证 cookies.json 文件是否存在且有效

4. **自动登录失败**

   * 检查 `X_USERNAME` 和 `X_PASSWORD` 是否正确

   * 确认网络连接正常

   * 查看登录过程中的错误信息

### 日志查看

服务运行时会输出详细的日志信息，包括：

* 服务启动信息

* 定时任务执行状态

* 数据采集和存储过程

* 错误信息和堆栈跟踪

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📞 支持

如有问题，请通过以下方式联系：

* 提交 GitHub Issue

* 查看项目文档

* 参考数据库迁移文件了解表结构

