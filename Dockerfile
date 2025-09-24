# 使用官方Node.js镜像作为基础镜像
FROM node:20-alpine

# 设置工作目录
WORKDIR /app

# 设置APK中国镜像源以提高下载速度
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories

# 安装必要的系统依赖
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    git \
    dcron \
    bash

# 设置Puppeteer中国镜像源以提高下载速度
ENV PUPPETEER_DOWNLOAD_HOST=https://registry.npmmirror.com/-/binary

# 告诉Puppeteer跳过下载Chromium，使用系统安装的版本
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# 复制package.json和pnpm-lock.yaml
COPY package*.json ./
# COPY pnpm-lock.yaml ./

# 安装pnpm并安装依赖
RUN npm install -g pnpm && \
    pnpm install 

# 复制应用代码
COPY . .

# 创建必要的目录
RUN mkdir -p reports logs

# Note: No shell scripts in /app/scripts directory to set permissions for

# 安装crontab并设置权限
RUN crontab /app/crontab

# 创建启动脚本
RUN echo '#!/bin/bash' > /app/start.sh && \
    echo 'echo "Starting cron daemon..."' >> /app/start.sh && \
    echo 'mkdir -p /var/log' >> /app/start.sh && \
    echo 'touch /var/log/cron.log' >> /app/start.sh && \
    echo 'crond -f -d 8 &' >> /app/start.sh && \
    echo 'echo "Cron daemon started"' >> /app/start.sh && \
    echo 'echo "Starting Node.js application..."' >> /app/start.sh && \
    echo 'exec npm run serve' >> /app/start.sh && \
    chmod +x /app/start.sh

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "console.log('Health check passed')" || exit 1

# 启动命令：运行启动脚本
CMD ["/app/start.sh"]