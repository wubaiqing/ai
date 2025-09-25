#!/bin/sh

# Twitter AI Reporter - 简化启动脚本
# 直接启动Node.js长期服务，不再使用cron

echo "[$(date "+%Y-%m-%d %H:%M:%S")] [START] Starting Twitter AI Reporter Service..."

# 创建必要的目录
mkdir -p logs outputs

# 启动Node.js服务
echo "[$(date "+%Y-%m-%d %H:%M:%S")] [START] Launching Node.js service..."
exec node app.js