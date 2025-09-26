# 第一阶段：前端构建
FROM node:20-slim as frontend-builder

# 配置 Debian 使用中国镜像源
RUN sed -i 's/deb.debian.org/mirrors.aliyun.com/g' /etc/apt/sources.list.d/debian.sources

# 配置 npm 使用淘宝镜像源并安装 pnpm
RUN npm config set registry https://registry.npmmirror.com && \
    npm install -g pnpm && \
    pnpm config set registry https://registry.npmmirror.com

# 设置工作目录
WORKDIR /app

# 复制前端项目文件
COPY frontend/package*.json ./
COPY frontend/pnpm-lock.yaml ./
COPY frontend/vite.config.ts ./
COPY frontend/index.html ./
COPY frontend/src/ ./src/
COPY frontend/public/ ./public/
COPY frontend/tsconfig.json ./
COPY frontend/tsconfig.app.json ./
COPY frontend/tsconfig.node.json ./
COPY frontend/tailwind.config.js ./
COPY frontend/postcss.config.js ./

# 安装前端依赖
RUN pnpm install

# 构建前端项目
RUN pnpm run build

# 第二阶段：运行时环境
FROM node:20-slim

# 配置 Debian 使用中国镜像源
RUN sed -i 's/deb.debian.org/mirrors.aliyun.com/g' /etc/apt/sources.list.d/debian.sources

# 配置 npm 使用淘宝镜像源并安装 pnpm
RUN npm config set registry https://registry.npmmirror.com && \
    npm install -g pnpm && \
    pnpm config set registry https://registry.npmmirror.com

# 安装必要的系统依赖
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libdrm2 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libgbm1 \
    libxss1 \
    libgconf-2-4 \
    nginx \
    && rm -rf /var/lib/apt/lists/*

# 安装 Chromium
RUN apt-get update && apt-get install -y chromium && rm -rf /var/lib/apt/lists/*

# 设置时区
ENV TZ=Asia/Shanghai
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# 设置工作目录
WORKDIR /app

# 复制 package.json 和 pnpm-lock.yaml（如果存在）
COPY package*.json ./
COPY pnpm-lock.yaml ./

# 安装生产依赖
RUN pnpm install --prod

# 复制后端应用代码
COPY app.js ./
COPY start.sh ./
COPY scripts/ ./scripts/

# 从构建阶段复制前端构建产物
COPY --from=frontend-builder /app/dist /var/www/html

# 复制 outputs 目录到 nginx 服务目录（用于前端访问）
COPY frontend/public/outputs /var/www/html/outputs

# 创建必要的目录
RUN mkdir -p logs outputs

# 复制 outputs 目录到应用目录（用于后端脚本）
COPY frontend/public/outputs /app/outputs

# 复制 nginx 配置
COPY nginx.conf /etc/nginx/nginx.conf

# 设置执行权限
RUN chmod +x start.sh

# 暴露端口
EXPOSE 80

# 启动应用
CMD ["./start.sh"]