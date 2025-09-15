# X.com 数据采集服务

一个用于采集和分析 X.com (Twitter) 数据的自动化服务，支持推文爬取、AI 分析和报告生成。

## 功能特性

- 🔍 **智能推文爬取**: 自动爬取指定列表的推文数据
- 🤖 **AI 智能分析**: 使用大语言模型分析推文内容
- 📊 **自动报告生成**: 生成结构化的科技资讯简报
- 🔐 **安全认证**: 支持 Cookie 认证和环境变量配置
- 📅 **定时任务**: 支持定时自动执行数据采集
- 💾 **数据存储**: 集成 Supabase 数据库存储

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

### 3. 启动服务

```bash
# 推文爬取服务
node serve/x.js

# AI 简报生成服务
node serve/ai.js
```

## 📚 文档目录

详细文档请查看 `docs/` 目录：

- [项目详细说明](docs/readme.md) - 完整的项目介绍和使用指南
- [环境配置指南](docs/env-configuration.md) - 环境变量配置说明
- [AI 简报功能](docs/AI_REPORT_README.md) - AI 简报生成功能说明
- [数据丢失分析](docs/DATA_LOSS_ANALYSIS.md) - 数据丢失问题分析和解决方案

## 🚀 主要脚本

```bash
# 登录并保存 Cookies
npm run login

# 爬取推文数据 (直接运行)
node serve/x.js

# 生成 AI 简报
npm run generate-report
# 或直接运行
node serve/ai.js

# 测试 AI 功能
npm run test-ai

# 检查配置
npm run check-config

# 调试数据丢失问题
npm run debug-data-loss

# 测试 DeepSeek API
npm run test-deepseek
```

## 🔗 主要服务

- `serve/x.js` - X.com 推文爬取服务 (主入口)
- `serve/ai.js` - AI 简报生成服务
- `loginAndSaveCookies.js` - Cookie 认证服务
- `lib/` - 核心功能模块库

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License