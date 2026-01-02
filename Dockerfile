FROM node:24.9.0-alpine

WORKDIR /app

# 安装依赖
COPY web/package*.json ./web/
COPY simple-mind-map/package*.json ./simple-mind-map/

RUN cd /app/simple-mind-map && npm install
RUN cd /app/web && npm install

# 复制源代码
COPY . /app/

EXPOSE 8080

# 启动应用
CMD ["npm", "run", "serve"]