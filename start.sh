#!/bin/sh

# 创建日志目录
mkdir -p /var/log

# 启动日志监控服务（后台运行）
/app/scripts/monitor-logs.sh &

# 启动 cron 服务
crond -f -d 8 &

# 等待服务启动
sleep 2

echo "[$(date "+%Y-%m-%d %H:%M:%S")] [CONTAINER-START] Container services started successfully"

# 执行传入的命令
exec "$@"