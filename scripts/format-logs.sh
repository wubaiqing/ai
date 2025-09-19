#!/bin/sh

# 日志格式化脚本
# 清理日志中的二进制数据和不可读字符

echo "[$(date "+%Y-%m-%d %H:%M:%S")] [LOG-FORMAT] Starting log formatting task"

# 检查cron.log文件是否存在
if [ ! -f "/var/log/cron.log" ]; then
    echo "[$(date "+%Y-%m-%d %H:%M:%S")] [LOG-FORMAT] No cron.log file found"
    exit 0
fi

# 备份原始日志文件
cp /var/log/cron.log /var/log/cron.log.backup

# 清理二进制数据和不可读字符
# 保留可打印的ASCII字符、换行符和制表符
tr -cd '\11\12\15\40-\176' < /var/log/cron.log.backup > /var/log/cron.log.clean

# 移除连续的空行，只保留单个空行
sed '/^$/N;/^\n$/d' /var/log/cron.log.clean > /var/log/cron.log.formatted

# 替换原始日志文件
mv /var/log/cron.log.formatted /var/log/cron.log

# 清理临时文件
rm -f /var/log/cron.log.backup /var/log/cron.log.clean

echo "[$(date "+%Y-%m-%d %H:%M:%S")] [LOG-FORMAT] Log formatting completed"

# 显示日志文件大小
LOG_SIZE=$(stat -c%s "/var/log/cron.log" 2>/dev/null || echo "0")
echo "[$(date "+%Y-%m-%d %H:%M:%S")] [LOG-FORMAT] Current log file size: ${LOG_SIZE} bytes"