# MyoMap 后端服务（Spring Boot）

MyoMap 健身计划指南系统的后端，提供用户、档案、身体数据、训练计划、训练记录、饮食记录与 AI 代理接口。

## 技术栈

| 层 | 选型 |
|---|---|
| 框架 | Spring Boot 3.2 |
| 语言 | Java 17 |
| ORM | MyBatis-Plus 3.5 |
| 数据库 | MySQL 8 |
| 认证 | JWT（jjwt 0.12） |
| 密码 | BCrypt（spring-security-crypto） |
| 文档 | SpringDoc OpenAPI（Swagger UI） |
| 构建 | Maven |

## 环境要求

- JDK 17+（推荐 17 / 21，**不要用 JDK 26**，Lombok 可能不兼容）
- MySQL 8+
- Maven 3.8+

## 快速开始

### 1. 创建数据库

```bash
mysql -uroot -p < src/main/resources/schema.sql
```

> 也可不手动执行：`application.yml` 中 `spring.sql.init.mode: always` 会在启动时自动建表。

### 2. 修改数据库连接

编辑 `src/main/resources/application.yml`：

```yaml
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/myomap?useUnicode=true&characterEncoding=utf8&serverTimezone=Asia/Shanghai&useSSL=false&allowPublicKeyRetrieval=true
    username: root
    password: 你的密码
```

### 3. 启动

```bash
# 开发运行
mvn spring-boot:run

# 打包运行
mvn clean package -DskipTests
java -jar target/myomap-backend-1.0.0.jar
```

启动后：
- 服务地址：<http://localhost:8081>
- 接口文档：<http://localhost:8081/swagger-ui.html>
- 演示账号：`admin` / `123456`（首次启动自动创建）

## 接口列表

| 方法 | 路径 | 说明 | 鉴权 |
|---|---|---|---|
| POST | `/user/register` | 注册 | 否 |
| POST | `/user/login` | 登录（返回 JWT） | 否 |
| GET | `/user/me` | 当前用户 | 是 |
| GET | `/profile` | 获取档案 | 是 |
| POST | `/profile` | 保存档案 | 是 |
| GET | `/bodydata/history` | 身体数据历史 | 是 |
| POST | `/bodydata` | 新增/更新身体数据 | 是 |
| DELETE | `/bodydata/{id}` | 删除身体数据 | 是 |
| GET | `/plan/list` | 训练计划列表 | 是 |
| POST | `/plan/generate` | 生成训练计划 | 是 |
| POST | `/plan/save` | 保存训练计划 | 是 |
| DELETE | `/plan/{id}` | 删除训练计划 | 是 |
| GET | `/workout/list` | 训练记录列表 | 是 |
| POST | `/workout/log` | 保存训练记录 | 是 |
| GET | `/food/calories/{date}` | 当日热量合计 | 是 |
| GET | `/food/list?date=` | 饮食记录列表 | 是 |
| POST | `/food/log` | 记录饮食 | 是 |
| POST | `/food/analyze` | AI 营养分析（文本/图片） | 是 |
| POST | `/ai/chat` | AI 问答（服务端代理） | 是 |

统一返回格式（与前端约定 `code=1` 为成功）：

```json
{ "code": 1, "msg": "success", "data": { } }
```

## 鉴权

登录成功返回 `token`，后续请求在请求头携带：

```
Authorization: Bearer <token>
```

`AuthInterceptor` 会校验令牌签名与有效期：**令牌缺失或无效时直接返回 401**，不会以空用户身份继续执行。

```json
{ "code": 401, "msg": "未登录或登录已过期", "data": null }
```

放行路径（无需令牌）：`/user/login`、`/user/register`、`/v3/api-docs/**`、`/swagger-ui/**`、
`/swagger-ui.html`、`/error`，以及所有 `OPTIONS` 预检请求。

> 说明：早期版本曾对无效令牌放行，导致受保护接口可被未授权访问，已修复并补充回归测试。
> 前端 `Common.api()` 遇到 401 会走本地降级逻辑，因此后端重启或令牌过期不会中断页面功能。

## AI 代理（Key 不暴露）

AI Key 保存在服务端，前端不再直接暴露：

```yaml
myomap:
  ai:
    base-url: https://open.bigmodel.cn/api/paas/v4
    api-key: ${MYOMAP_AI_KEY:}   # 通过环境变量注入，或直接填写
    model: glm-4-flash
    vision-model: glm-4v-flash
```

启动时注入：

```bash
export MYOMAP_AI_KEY=你的智谱Key
mvn spring-boot:run
```

> 未配置 Key 时，`/ai/chat` 会自动使用**服务端内置知识库**回答，接口仍可用。

## 与前端对接

前端 `assets/js/common.js` 中：

```js
const API_DEFAULT = 'http://localhost:8081';
```

后端启动后，前端会自动优先调用后端接口（未启动则本地降级）。跨域白名单在 `application.yml`：

```yaml
myomap:
  cors:
    allowed-origins: "http://localhost:8799,http://localhost:8080"
```

请把前端实际访问的地址加进去。

## 开机自启（macOS launchd）

打包为 JAR 后由 launchd 托管，**开机自启 + 崩溃自动重启**：

```bash
cd backend
mvn clean package -DskipTests          # 生成 target/myomap-backend-1.0.0.jar

# 创建 ~/Library/LaunchAgents/com.myomap.backend.plist（见下方模板）
launchctl load ~/Library/LaunchAgents/com.myomap.backend.plist
```

`~/Library/LaunchAgents/com.myomap.backend.plist`：

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>com.myomap.backend</string>
  <key>ProgramArguments</key><array>
    <string>/path/to/jdk17/bin/java</string>
    <string>-Xmx512m</string><string>-jar</string>
    <string>/path/to/MyoMap/backend/target/myomap-backend-1.0.0.jar</string>
  </array>
  <key>WorkingDirectory</key><string>/path/to/MyoMap/backend</string>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>/tmp/myomap-backend.log</string>
  <key>StandardErrorPath</key><string>/tmp/myomap-backend.err.log</string>
  <key>EnvironmentVariables</key><dict>
    <key>MYOMAP_AI_KEY</key><string>你的智谱Key（可留空）</string>
  </dict>
</dict></plist>
```

常用命令：

```bash
launchctl list | grep myomap                              # 查看状态（PID / 退出码）
launchctl unload ~/Library/LaunchAgents/com.myomap.backend.plist   # 停止并取消自启
launchctl load   ~/Library/LaunchAgents/com.myomap.backend.plist   # 重新加载
tail -f /tmp/myomap-backend.log                           # 查看日志
```

## 目录结构

```
backend/
├── pom.xml
└── src/main/
    ├── java/com/myomap/
    │   ├── MyoMapApplication.java     # 启动类
    │   ├── common/                    # 统一响应 R / 异常处理
    │   ├── config/                    # WebConfig(跨域/拦截器) / JwtProperties / DataInitializer
    │   ├── security/                  # JwtUtil / AuthInterceptor / UserContext
    │   ├── entity/                    # 6 张表实体
    │   ├── mapper/                    # MyBatis-Plus Mapper
    │   ├── service/                   # UserService / AiService
    │   ├── controller/                # 7 个控制器
    │   └── dto/                       # 请求/响应对象
    └── resources/
        ├── application.yml
        └── schema.sql                 # 建表脚本（启动时自动执行）
```
