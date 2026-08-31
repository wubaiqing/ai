# DeepSeek V4 Flash 集成指南

## 概述

项目已集成 DeepSeek V4 Flash 模型支持。

## 配置步骤

### 1. 获取 DeepSeek API Key

访问 [DeepSeek 平台](https://platform.deepseek.com) 注册并获取 API Key。

### 2. 配置环境变量

复制 `.env.example` 创建 `.env` 文件：

```bash
cp .env.example .env
```

编辑 `.env` 文件，配置 DeepSeek 相关参数：

```bash
# DeepSeek 配置
DEEPSEEK_API_KEY=your_deepseek_api_key_here
DEEPSEEK_API_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-v4-flash
```

### 3. 测试集成

运行测试脚本验证配置：

```bash
node scripts/tests/deepseek.test.js
```

## 使用方式

### 在代码中使用

```javascript
const { aiContentService } = require('./scripts/core/services/aiService');

// 生成内容
const result = await aiContentService.generateContent(
  '你的提示词',
  { systemPrompt: '系统提示词（可选）' }
);

console.log(result.content);
```

### 生成推文简报

```javascript
const tweets = [
  {
    content: '推文内容',
    url: 'https://twitter.com/example/1',
    published_date: '2026-08-31'
  }
];

const report = await aiContentService.analyzeTweetsAndGenerateReport(tweets);
console.log(report.content);
console.log('使用模型:', report.model);
```

## DeepSeek V4 Flash 特性

- **模型名称**: `deepseek-v4-flash`
- **上下文长度**: 64K tokens
- **价格**: 极具竞争力，约为 GPT-4 的 1/100
- **速度**: Flash 版本优化了推理速度
- **API 兼容**: OpenAI 兼容的 API 格式

## 配置说明

### 支持的配置项

| 配置项 | 说明 | 默认值 |
|--------|------|--------|
| `DEEPSEEK_API_KEY` | DeepSeek API Key | 无 |
| `DEEPSEEK_API_BASE_URL` | API 基础 URL | `https://api.deepseek.com` |
| `DEEPSEEK_MODEL` | 模型名称 | `deepseek-v4-flash` |

### 请求参数

系统会自动使用以下参数：

- `temperature`: 0.7
- `max_tokens`: 4096
- `timeout`: 300000ms (5分钟)

## 常见问题

### 1. 认证失败 (401)

检查 `DEEPSEEK_API_KEY` 是否正确配置。

### 2. 网络连接失败

- 检查网络连接
- 如果在国内，可能需要配置代理
- 确认 API endpoint 可访问

### 3. 如何确认服务已初始化？

运行应用时，日志会显示：
```
DeepSeek AI服务初始化成功
```

## 支持

如有问题，请查看：
- [DeepSeek API 文档](https://api-docs.deepseek.com)
- 项目 Issues
