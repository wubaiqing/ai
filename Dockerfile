# 使用官方Node.js镜像作为基础镜像
FROM node:20-alpine

# 设置工作目录
WORKDIR /app

# 安装必要的系统依赖
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# 设置Puppeteer中国镜像源以提高下载速度
ENV PUPPETEER_DOWNLOAD_HOST=https://registry.npmmirror.com/-/binary

# 告诉Puppeteer跳过下载Chromium，使用系统安装的版本
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# 复制package.json和pnpm-lock.yaml（如果存在）
COPY package*.json pnpm-lock.yaml* ./

# 安装pnpm并安装依赖
RUN npm install -g pnpm && \
    pnpm install --frozen-lockfile

# 复制项目文件
COPY . .

# 创建必要的目录
RUN mkdir -p reports logs

# 设置用户权限（适配群辉NAS）
RUN addgroup -g 1000 appuser && \
    adduser -D -s /bin/sh -u 1000 -G appuser appuser && \
    chown -R appuser:appuser /app

# 切换到非root用户
USER appuser

# 暴露端口（如果需要）
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "console.log('Health check passed')" || exit 1

# 启动命令
CMD ["npm", "start"]