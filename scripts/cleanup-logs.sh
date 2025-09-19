#!/bin/sh

# 日志清理脚本
# 清理超过7天的cron日志，避免日志文件过大

echo "[$(date "+%Y-%m-%d %H:%M:%S")] [LOG-CLEANUP] Starting log cleanup task"

# 清理超过7天的cron日志
find /var/log -name "cron.log*" -type f -mtime +7 -delete 2>/dev/null || true

# 清理应用日志目录中超过30天的日志文件
if [ -d "/app/logs" ]; then
    find /app/logs -name "*.log" -type f -mtime +30 -delete 2>/dev/null || true
fi

# 限制当前cron.log文件大小（如果超过10MB则截断保留最后5MB）
if [ -f "/var/log/cron.log" ]; then
    LOG_SIZE=$(stat -c%s "/var/log/cron.log" 2>/dev/null || echo "0")
    if [ "$LOG_SIZE" -gt 10485760 ]; then  # 10MB
        echo "[$(date "+%Y-%m-%d %H:%M:%S")] [LOG-CLEANUP] Truncating large cron.log file (${LOG_SIZE} bytes)"
        tail -c 5242880 /var/log/cron.log > /tmp/cron.log.tmp && mv /tmp/cron.log.tmp /var/log/cron.log
    fi
fi

echo "[$(date "+%Y-%m-%d %H:%M:%S")] [LOG-CLEANUP] Log cleanup completed"