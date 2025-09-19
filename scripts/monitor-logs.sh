#!/bin/sh

# 日志监控脚本
# 实时监控和修复日志输出问题

echo "[$(date "+%Y-%m-%d %H:%M:%S")] [LOG-MONITOR] Starting log monitoring service"

# 创建日志目录（如果不存在）
mkdir -p /var/log

# 初始化日志文件
if [ ! -f "/var/log/cron.log" ]; then
    touch /var/log/cron.log
    echo "[$(date "+%Y-%m-%d %H:%M:%S")] [LOG-MONITOR] Created cron.log file" > /var/log/cron.log
fi

# 设置日志文件权限
chmod 644 /var/log/cron.log

# 监控循环
while true; do
    # 检查日志文件大小
    LOG_SIZE=$(stat -c%s "/var/log/cron.log" 2>/dev/null || echo "0")
    
    # 如果日志文件过大（超过50MB），进行轮转
    if [ "$LOG_SIZE" -gt 52428800 ]; then
        echo "[$(date "+%Y-%m-%d %H:%M:%S")] [LOG-MONITOR] Log file too large (${LOG_SIZE} bytes), rotating..." >> /var/log/cron.log
        
        # 保留最后10MB的日志
        tail -c 10485760 /var/log/cron.log > /var/log/cron.log.tmp
        mv /var/log/cron.log.tmp /var/log/cron.log
        
        echo "[$(date "+%Y-%m-%d %H:%M:%S")] [LOG-MONITOR] Log rotation completed" >> /var/log/cron.log
    fi
    
    # 检查是否有二进制数据污染
    BINARY_COUNT=$(grep -c '[^[:print:][:space:]]' /var/log/cron.log 2>/dev/null || echo "0")
    
    if [ "$BINARY_COUNT" -gt 0 ]; then
        echo "[$(date "+%Y-%m-%d %H:%M:%S")] [LOG-MONITOR] Detected binary data in logs, cleaning..." >> /var/log/cron.log
        /app/scripts/format-logs.sh
    fi
    
    # 每30秒检查一次
    sleep 30
done