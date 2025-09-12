# AI简报生成脚本使用说明

## 功能介绍

本脚本用于读取tweets表中当天的所有数据，调用硅基流动平台的DeepSeek接口，分析推文内容并生成中文科技简报。

## 配置要求

### 1. 环境变量配置

在 `.env` 文件中添加以下配置：

```env
# 硅基流动平台配置
SILICONFLOW_API_KEY=你的API密钥
```

### 2. 获取API密钥

1. 访问 [硅基流动平台](https://siliconflow.cn/) 官网
2. 注册账号并登录
3. 在控制台中创建API密钥
4. 将密钥配置到 `.env` 文件中

## 使用方法

1. **配置API密钥**
   ```bash
   # 在.env文件中添加硅基流动平台API密钥
   SILICONFLOW_API_KEY=your_api_key_here
   ```

2. **运行脚本**
   ```bash
   # 方式1：直接运行
   node generateAIReport.js
   
   # 方式2：使用npm脚本
   npm run generate-report
   ```

3. **测试功能**
   ```bash
   # 完整功能测试
   npm run test-report
   
   # 仅测试API连接
   npm run test-api
   ```

### 在其他脚本中调用

```javascript
const { generateAIReport } = require('./generateAIReport.js');

async function main() {
  try {
    const result = await generateAIReport();
    console.log('简报生成成功:', result.reportPath);
  } catch (error) {
    console.error('简报生成失败:', error.message);
  }
}

main();
```

## 输出格式

生成的简报将按照以下格式输出：

```
① Claude API 功能增强，新增了网页抓取 (web fetch) 功能，可直接获取和分析任何网页 URL 的内容。消息来源
② Replit Agent 3 正式发布，其自主工作能力大幅提升，可持续思考和运行长达 200 分钟。消息来源
③ 阿里巴巴发布 Qwen3-Next-80B-A3B 高效大模型，采用超稀疏 MoE 架构。消息来源
...
```

## 文件输出

- 简报文件保存在 `reports/` 目录下
- 文件名格式：`ai-report-YYYY-MM-DD.md`
- 包含生成时间和数据来源信息

## 功能特点

1. **智能筛选**：只选择有价值的科技、AI、编程相关内容
2. **多语言支持**：自动将英文或其他语言内容翻译成中文
3. **格式规范**：按照指定格式生成带编号的简报
4. **来源追溯**：每条信息都包含原始推文链接
5. **错误处理**：完善的错误处理和日志记录
6. **灵活调用**：支持独立运行或模块化调用

## 测试功能

### 测试API连接

```bash
node testDeepSeekAPI.js
```

### 测试数据库查询

```bash
node -e "const { fetchTodayTweets } = require('./generateAIReport.js'); fetchTodayTweets().then(tweets => console.log('查询到', tweets.length, '条数据')).catch(err => console.error('查询失败:', err.message));"
```

## 常见问题

### Q: API调用返回401错误
A: 请检查 `SILICONFLOW_API_KEY` 是否正确配置在 `.env` 文件中。

### Q: 没有查询到当天数据
A: 请确认tweets表中有当天的数据，检查数据库连接是否正常。

### Q: 生成的简报内容为空
A: 可能是当天的推文中没有科技相关内容，或者AI接口调用失败。

## 日志说明

脚本运行时会输出详细的日志信息：

- `[INFO]`：正常操作信息
- `[WARN]`：警告信息
- `[ERROR]`：错误信息

## 依赖包

- `@supabase/supabase-js`：数据库操作
- `axios`：HTTP请求
- `dotenv`：环境变量管理
- `fs/promises`：文件操作
- `path`：路径处理

## 注意事项

1. 确保数据库连接正常
2. API密钥需要有足够的调用额度
3. 生成的简报内容依赖于当天推文的质量
4. 建议在生产环境中添加更多的错误重试机制