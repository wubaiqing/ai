#!/bin/bash

# 创建必要的目录
mkdir -p logs outputs

# 启动 nginx
echo "Starting nginx..."
nginx -g "daemon off;" &

# 等待一下让 nginx 启动
sleep 2

# 启动 Node.js 应用
echo "Starting Node.js application..."
node app.js