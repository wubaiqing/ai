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
    busybox-suid

# 设置Puppeteer中国镜像源以提高下载速度
ENV PUPPETEER_DOWNLOAD_HOST=https://registry.npmmirror.com/-/binary

# 告诉Puppeteer跳过下载Chromium，使用系统安装的版本
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# 复制package.json和pnpm-lock.yaml
COPY package*.json ./
COPY pnpm-lock.yaml ./

# 安装pnpm并安装依赖
RUN npm install -g pnpm && \
    pnpm install --frozen-lockfile

# 项目文件将通过volume挂载，无需复制

# 创建必要的目录
RUN mkdir -p reports logs /var/log

# 复制cron配置文件
COPY crontab /etc/crontabs/root

# 设置cron文件权限
RUN chmod 0644 /etc/crontabs/root

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "console.log('Health check passed')" || exit 1

# 创建启动脚本
RUN echo '#!/bin/sh' > /app/start.sh && \
    echo 'crond -f -d 8 &' >> /app/start.sh && \
    echo 'exec "$@"' >> /app/start.sh && \
    chmod +x /app/start.sh

# 启动命令：启动cron服务并运行应用
CMD ["/app/start.sh", "npm", "start"]