FROM node:24.9.0-alpine

# 安装 pnpm
RUN npm install -g pnpm

WORKDIR /app

# 复制 workspace 配置和 package 文件
COPY pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY web/package*.json ./web/
COPY simple-mind-map/package*.json ./simple-mind-map/

# 安装依赖
RUN pnpm install --frozen-lockfile

# 复制源代码和运行脚本
COPY . /app/

EXPOSE 8080

# 使用 run.sh 启动开发服务器
CMD sh run.sh dev