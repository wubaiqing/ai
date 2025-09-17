# Twitter AI Reporter 定时任务配置

## 概述

本项目已配置定时任务，可以在Docker容器中自动执行Twitter数据爬取和报告生成。

## 定时任务配置

### 执行时间表

- **上午 9:00**: 执行推文爬取任务 (`npm start`)
- **下午 4:00**: 执行推文爬取任务 (`npm start`)
- **晚上 11:00**: 生成AI分析报告 (`npm run generate-report`)

### Cron表达式说明

```bash
# 分钟 小时 日 月 星期 命令
0 9 * * *    # 每天上午9点
0 16 * * *   # 每天下午4点
0 23 * * *   # 每天晚上11点
```

## Docker配置

### 构建和运行

```bash
# 构建镜像
docker build -t twitter-ai-reporter .

# 运行容器
docker run -d --name twitter-ai-reporter \
  --env-file .env \
  -v ./logs:/app/logs \
  -v ./reports:/app/reports \
  twitter-ai-reporter

# 或使用docker-compose
docker-compose up -d
```

### 查看定时任务日志

```bash
# 查看cron日志
docker exec twitter-ai-reporter tail -f /var/log/cron.log

# 查看应用日志
docker logs twitter-ai-reporter
```

## 手动执行任务

```bash
# 手动执行爬取任务
docker exec twitter-ai-reporter npm start

# 手动生成报告
docker exec twitter-ai-reporter npm run generate-report
```

## 修改定时任务

1. 编辑 `crontab` 文件
2. 重新构建Docker镜像
3. 重启容器

## 故障排除

### 检查cron服务状态

```bash
# 进入容器
docker exec -it twitter-ai-reporter sh

# 检查cron进程
ps aux | grep cron

# 查看cron配置
crontab -l
```

### 常见问题

1. **定时任务不执行**: 检查cron服务是否正常运行
2. **权限问题**: 确保crontab文件权限正确 (644)
3. **环境变量**: 确保.env文件正确配置
4. **日志文件**: 检查/var/log/cron.log获取详细错误信息

## 注意事项

- 容器时区默认为UTC，如需调整请在Dockerfile中设置时区
- 定时任务日志会输出到 `/var/log/cron.log`
- 确保有足够的磁盘空间存储日志和报告文件
- 建议定期清理旧的日志文件