FROM node:24.9.0-alpine

# 安装 pnpm 和静态服务器
RUN npm install -g pnpm serve

WORKDIR /app

# 复制 workspace 配置和 package 文件
COPY pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY web/package*.json ./web/
COPY simple-mind-map/package*.json ./simple-mind-map/

# 安装依赖
RUN pnpm install --frozen-lockfile

# 复制源代码
COPY . /app/

# 构建生产版本
RUN pnpm --filter thoughts run build

EXPOSE 8080

# 启动应用，使用 serve 提供静态文件
CMD ["serve", "-s", "-l", "8080", "/app/dist"]