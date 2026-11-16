# MyoMap · Docker 镜像（Nginx 静态托管）
# 构建（在项目根目录执行）：
#   bash deploy/build.sh
#   docker build -f deploy/Dockerfile -t myomap .
# 运行：
#   docker run -d --name myomap -p 8080:80 --restart unless-stopped myomap

FROM nginx:alpine

# 站点文件（由 deploy/build.sh 生成）
COPY dist/ /usr/share/nginx/html/

# Nginx 配置
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
