# 日志系统改进说明

## 问题描述
原始的cron任务日志存在以下问题：
- 输出包含大量乱码和二进制数据
- 日志信息不完整，难以理解
- 缺乏时间戳和任务标识
- 标准输出和错误输出混合

## 解决方案

### 1. 日志格式标准化
- 所有console.log输出都添加了ISO时间戳格式：`[2024-01-01T12:00:00.000Z]`
- 添加任务标识符，如：`[CRAWL-START]`、`[REPORT-SUCCESS]`等
- 统一日志输出格式，确保可读性

### 2. Cron任务配置优化
```bash
# 每天上午9点执行爬取推文任务
0 9 * * * /bin/sh -c 'echo "[$(date "+%Y-%m-%d %H:%M:%S")] [CRON-CRAWL-AM] Starting morning tweet crawling task" && cd /app && timeout 3600 npm start && echo "[$(date "+%Y-%m-%d %H:%M:%S")] [CRON-CRAWL-AM] Morning crawling task completed"' >> /var/log/cron.log 2>&1

# 任务后格式化日志
5 9 * * * /app/scripts/format-logs.sh >> /var/log/cron.log 2>&1
```

### 3. 日志清理和格式化脚本

#### cleanup-logs.sh
- 每日凌晨2点自动清理过期日志
- 清理超过7天的cron日志
- 清理超过30天的应用日志
- 限制cron.log文件大小（超过10MB则截断）

#### format-logs.sh
- 清理日志中的二进制数据和不可读字符
- 保留可打印的ASCII字符、换行符和制表符
- 移除多余的空行
- 在每个主要任务执行后自动运行

#### monitor-logs.sh
- 实时监控日志文件状态
- 自动检测和清理二进制数据污染
- 日志文件大小管理（超过50MB自动轮转）
- 每30秒检查一次日志质量

### 4. 容器启动优化
更新了`start.sh`脚本：
- 创建必要的日志目录
- 启动日志监控服务
- 启动cron服务
- 添加启动成功标识

## 日志标识符说明

| 标识符 | 含义 |
|--------|------|
| `[CONTAINER-START]` | 容器启动 |
| `[CRON-CRAWL-AM]` | 上午爬取任务 |
| `[CRON-CRAWL-PM]` | 下午爬取任务 |
| `[CRON-REPORT]` | 报告生成任务 |
| `[CRAWL-START]` | 开始爬取 |
| `[CRAWL-SUCCESS]` | 爬取成功 |
| `[CRAWL-ERROR]` | 爬取错误 |
| `[AUTH-START]` | 开始认证 |
| `[AUTH-SUCCESS]` | 认证成功 |
| `[AUTH-ERROR]` | 认证错误 |
| `[REPORT-START]` | 开始生成报告 |
| `[REPORT-SUCCESS]` | 报告生成成功 |
| `[REPORT-ERROR]` | 报告生成错误 |
| `[LOG-FORMAT]` | 日志格式化 |
| `[LOG-MONITOR]` | 日志监控 |

## 使用方法

### 查看实时日志
```bash
# 查看cron任务日志
docker exec -it <container_name> tail -f /var/log/cron.log

# 查看应用日志
docker exec -it <container_name> tail -f /app/logs/app.log
```

### 手动清理日志
```bash
# 执行日志清理
docker exec -it <container_name> /app/scripts/cleanup-logs.sh

# 执行日志格式化
docker exec -it <container_name> /app/scripts/format-logs.sh
```

### 检查日志质量
```bash
# 检查是否有二进制数据
docker exec -it <container_name> grep -c '[^[:print:][:space:]]' /var/log/cron.log

# 查看日志文件大小
docker exec -it <container_name> ls -lh /var/log/cron.log
```

## 预期效果

改进后的日志输出示例：
```
[2024-01-15 09:00:01] [CRON-CRAWL-AM] Starting morning tweet crawling task
[2024-01-15T09:00:02.123Z] [CRAWL-START] 开始执行推文爬取任务...
[2024-01-15T09:00:05.456Z] [CRAWL-SUCCESS] 成功创建浏览器实例
[2024-01-15T09:00:10.789Z] [CRAWL-SUCCESS] 推文爬取完成，共收集 25 条推文
[2024-01-15 09:15:30] [CRON-CRAWL-AM] Morning crawling task completed
[2024-01-15 09:05:01] [LOG-FORMAT] Starting log formatting task
[2024-01-15 09:05:02] [LOG-FORMAT] Log formatting completed
```

这样的日志输出清晰、有序、易于理解和调试。