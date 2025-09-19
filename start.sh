#!/bin/sh

# 启动cron服务（后台运行）
crond -f -d 8 &

# 执行传入的命令
exec "$@"