# ============================================================
#  MyoMap 后端镜像 · 自包含多阶段构建
#  （在容器内用 Maven 编译，换任何机器都能构建，无需本地预打包）
#  构建： docker build -t myomap-backend ./backend
# ============================================================

# ---------- 构建阶段 ----------
FROM maven:3.9-amazoncorretto-17 AS build
WORKDIR /app
# 先只复制 pom，利用 Docker 缓存加速依赖下载
COPY pom.xml .
RUN mvn -q -B dependency:go-offline
COPY src ./src
RUN mvn -q -B clean package -DskipTests

# ---------- 运行阶段 ----------
FROM amazoncorretto:17-alpine
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8081
ENTRYPOINT ["java", "-Xms128m", "-Xmx512m", "-jar", "app.jar"]
