# MyoMap · 健身计划指南系统

> 本地优先（Local-First）、AI 驱动、多源数据融合的智能健身指导系统
>
> **前后端分离**：Vue 3 + Vite 前端 · Spring Boot + MySQL 后端 · 旧版多页面实现保留在 `legacy-web/`

---

## 项目结构

```
MyoMap/                      项目根
├── frontend/                ★ 新版前端：Vue 3.5 + Vue Router 4 + Vite 5（单页应用）
│   ├── src/                 源码：views / components / lib / services / styles
│   ├── public/              静态资源：body.glb、draco/、mediapipe/、893 条动作数据
│   ├── dist/                Vite 构建产物（npm run build 生成）
│   ├── index.html  vite.config.js  package.json
│   └── node_modules/
├── backend/                 ★ 后端：Java 17 + Spring Boot 3.2 + MyBatis-Plus + MySQL 8
│   ├── src/main/java/com/myomap/
│   │   ├── controller/      7 个控制器、21 个接口
│   │   ├── service/         业务服务（用户、验证码、限流、AI）
│   │   ├── mapper/          6 个 MyBatis-Plus Mapper
│   │   ├── entity/ dto/     实体与传输对象
│   │   ├── security/        JWT 生成校验、鉴权拦截器、用户上下文
│   │   └── config/          WebConfig、JwtProperties、初始化
│   ├── src/main/resources/  application.yml、schema.sql（6 张表）
│   └── pom.xml
├── legacy-web/              旧版多页面实现（历史版本，保留可访问）
│   ├── *.html               11 个页面 + 生成脚本 + 原始数据
│   └── assets/ libs/ utils/ wallpaper/
├── deploy/                  部署脚本与配置（nginx / Docker / launchd）
│   ├── build.sh             构建 dist/：旧版页面 → dist/，Vue 构建 → dist/vue/
│   ├── nginx.conf  Dockerfile  docker-compose*.yml
│   └── launchd/             macOS 常驻服务模板
├── legacy/                  初版单文件实现（index-monolith.html，历史存档）
├── dist/                    部署产物（由 deploy/build.sh 生成，不纳入版本库）
├── .gitignore
└── README.md
```

> `dist/`、`frontend/dist/`、`backend/target/`、`frontend/node_modules/` 均为构建产物，已在 `.gitignore` 中排除，克隆后重新构建即可。

## 三部分如何运行

| 部分 | 目录 | 启动方式 | 地址 |
|---|---|---|---|
| **前端（新版）** | `frontend/` | `npm run dev` | http://localhost:5173 |
| **后端** | `backend/` | `mvn spring-boot:run` 或 `java -jar target/myomap-backend-1.0.0.jar` | http://localhost:8081（Swagger：/swagger-ui.html） |
| **旧版多页面** | `legacy-web/` | 任意静态服务器，如 `python3 -m http.server 8799` | http://localhost:8799 |

**启动顺序**：MySQL → 后端 → 前端。前端在无后端时仍可完整运行（本地优先 + 降级）。

```bash
# 1) 数据库（已装 MySQL 8，库名 myomap，首次启动后端会自动执行 schema.sql 建表）

# 2) 后端（注意用 JDK 17，不是系统默认的 JDK 26）
cd backend
JAVA_HOME=$(/usr/libexec/java_home -v 17) mvn spring-boot:run

# 3) 前端
cd frontend
npm install      # 首次
npm run dev      # → http://localhost:5173

# 4) 一键构建部署包（旧版页面 + Vue 前端）
bash deploy/build.sh
```

**VS Code**：双击项目根目录的 `MyoMap.code-workspace`，可直接用「终端 → 运行任务」一键启动 MySQL / 后端 / 前端。

**macOS 常驻服务**（launchd，已在 `~/Library/LaunchAgents/`）：

| 服务 | 作用 | 端口 | 工作目录 |
|---|---|---|---|
| `com.myomap.vue` | Vite dev server | 5173 | `MyoMap/frontend` |
| `com.myomap.frontend` | 旧版多页面静态服务 | 8799 | `MyoMap/legacy-web` |
| `com.myomap.backend` | Spring Boot 后端 | 8081 | `MyoMap/backend` |
| `com.myomap.tunnel` | Cloudflare 公网隧道 | → 8080 | — |

```bash
launchctl bootout   gui/$(id -u)/com.myomap.vue     # 停止
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.myomap.vue.plist   # 启动
```

---

## 以下内容针对 legacy-web/（旧版多页面实现）

## 目录

- [项目简介](#项目简介)
- [功能总览](#功能总览)
- [技术栈](#技术栈)
- [目录结构](#目录结构)
- [快速开始](#快速开始)
- [访问控制与演示账号](#访问控制与演示账号)
- [数据存储](#数据存储)
- [3D 人体模型](#3d-人体模型)
- [动作库数据](#动作库数据)
- [后端接口（可选）](#后端接口可选)
- [与需求规格说明书（SRS）的对应](#与需求规格说明书srs的对应)
- [已知限制](#已知限制)
- [免责声明](#免责声明)

---

## 项目简介

MyoMap 是一套面向个人健身场景的**本地优先**健身指导系统。用户通过可交互的人体模型选择训练部位，系统结合身体档案、训练记录、饮食摄入与智能设备数据，生成个性化训练计划与饮食建议。

项目以**毕业设计**为目标编写，需求依据《健身计划指南系统 软件需求规格说明书（SRS）v1.0》（FM-01 ~ FM-08）。

核心设计原则：

| 原则 | 说明 |
|---|---|
| 本地优先 | 所有账号与健康数据默认保存在浏览器 `localStorage`，不上传云端 |
| 免登录浏览 | 首页与动作库对游客开放；其余功能需登录 |
| 无构建步骤 | 纯静态资源，任何静态服务器即可运行 |
| 优雅降级 | 后端不可用时，AI 问答、饮食解析、计划生成等全部走本地逻辑 |
| 可扩展 | 数据层与 UI 解耦，后端 REST API 与智能设备接入均已预留 |

---

## 功能总览

| 页面 | 功能 | 对应 SRS 模块 | 是否需登录 |
|---|---|---|---|
| `index.html` 首页 | 3D 人体交互式部位选择（可多选）· 今日健康仪表盘 · 推荐动作 | FM-02 / FM-08 | 否 |
| `library.html` 动作库 | **893 个标准动作** · 搜索 / 肌群 / 难度 / 器械筛选 · 分步动作指导 · 自定义动作 | FM-03.3 | 否 |
| `login.html` 登录注册 | **后端 JWT 登录 / 注册**（后端不可用时本地账号）· 游客模式 · 记住我 | FM-01 | — |
| `plan.html` 训练计划 | 计划生成器（目标 / 难度 / 频率 / 周期）· 计划模板 · 计划管理 · 设备数据融合 | FM-02.3 / FM-03.1 | 是 |
| `workout.html` 训练记录 | 训练模式 · 组间休息计时 · 容量统计 · 1RM 估算 · 训练报告 · 历史对比 | FM-03.2 | 是 |
| `body.html` 身体数据 | 体重 / 体脂 / 围度录入 · BMI / BMR / TDEE · 体重趋势图 · 体成分雷达 · 围度对比 | FM-04 | 是 |
| `diet.html` 饮食规划 | 营养目标 · 自然语言食物识别 · **AI 拍照识别热量** · 摄入进度 · AI 建议 · 今日推荐食谱 · 食物库 | FM-05 | 是 |
| `map.html` 地图行程 | **高德地图** · 路线规划（跑步/骑行/徒步）· GPS 轨迹记录 · 周边设施 | FM-06 | 是 |
| `ai.html` AI 助手 | **优先走后端 AI 代理**（访客无需 Key）· 可直连大模型 · 流式回答 · 快捷提问 · 对话历史 | FM-07 | 是 |
| `device.html` 智能设备 | 手环连接 · 心率 / 睡眠 / 运动记录 · 多源数据融合仪表盘 | FM-08 | 是 |
| `profile.html` 我的档案 | 个人档案 · 指标解读 · 数据导出 / 导入 / 清空 · 账号管理 | FM-01 | 是 |

**其他能力**

- 统一左侧导航 + 顶栏外壳，全部页面共用同一套设计系统
- 全项目自绘 **74 个线性 SVG 图标**（无第三方图标库、无 emoji）
- 动态壁纸（`wallpaper/`）：可直接打开作为独立动态壁纸页
- 响应式布局：**移动端深度优化**（侧栏收起、多列折叠、表格横滑、触控目标加大）

---

## 技术栈

| 层 | 选型 |
|---|---|
| 前端 | 原生 HTML5 + CSS3 + ES2017 JavaScript（无框架、无打包器） |
| 3D 渲染 | Three.js（ES Module + importmap），GLTFLoader + DRACOLoader + OrbitControls |
| 样式 | 原生 CSS 变量 + 组件化设计系统（`assets/css/common.css`） |
| 图标 | 自绘 SVG 线性图标（`assets/js/icons.js`） |
| 数据 | 浏览器 `localStorage`（本地优先） |
| 图表 | 自绘 SVG（折线图 / 雷达图 / 进度条） |
| 后端 | Spring Boot 3 + MyBatis-Plus + MySQL + JWT（见 `backend/`，可选启动） |

> 依赖的 Three.js 相关文件已本地化到 `libs/`，离线可用。

---

## 目录结构

```
MyoMap/
├── index.html               # 首页：3D 人体选择器 + 健康仪表盘（免登录）
├── library.html             # 动作库（免登录）
├── login.html               # 登录 / 注册 / 游客模式
├── plan.html                # 训练计划生成与管理
├── workout.html             # 训练记录 / 训练模式
├── body.html                # 身体数据管理
├── diet.html                # AI 饮食规划
├── ai.html                  # AI 助手
├── device.html              # 智能设备接入
├── map.html                 # 地图行程规划
├── profile.html             # 我的档案
│
├── assets/
│   ├── css/
│   │   └── common.css       # 共享设计系统（布局 / 组件 / 主题）
│   └── js/
│       ├── store.js         # 本地数据层（User/Profile/BodyMetric/Plan/Log/Diet…）
│       ├── common.js        # 导航外壳 / 访问控制 / 公式 / API / 提示 / 图表
│       ├── icons.js         # 线性 SVG 图标库（74 个）
│       ├── ai-client.js     # AI 客户端（大模型对话 / 视觉识别 / 共享设置面板）
│       ├── exercises-data.js# 动作库数据（893 个中文动作）
│       ├── planner.js       # 训练计划生成器 + 预设模板
│       └── device.js        # 智能手环数据模拟层
│
├── viewer3d.js              # 3D 肌肉模型查看器（Three.js）
├── body.glb                 # 3D 人体模型（DRACO 压缩，约 8MB）
├── libs/                    # Three.js 及加载器（本地化）
│   ├── three.module.js
│   ├── OrbitControls.js
│   ├── GLTFLoader.js
│   ├── DRACOLoader.js
│   └── draco/
├── wallpaper/               # 独立动态壁纸页面
│   ├── index.html
│   └── assets/fitness-lines.jpg
│
├── exercises.json           # 原始动作数据集（1324 条，英文，含 gif）
├── matched_exercises.json   # 动作匹配表
├── exercise_gifs.json       # 动作演示图映射
├── backend/                 # Spring Boot 后端（用户/档案/数据/计划/记录/饮食/AI 代理）
│   ├── pom.xml
│   ├── Dockerfile           # 后端镜像（多阶段构建）
│   ├── README.md            # 后端说明与接口文档
│   └── src/main/
│       ├── java/com/myomap/ # controller / service / mapper / entity / security
│       └── resources/       # application.yml / schema.sql
├── deploy/                  # 部署（构建脚本 / Nginx / Docker / 指南）
│   ├── build.sh             # 生成仅含运行文件的 dist/
│   ├── nginx.conf           # Nginx 站点配置（纯前端）
│   ├── nginx.full.conf      # Nginx 配置（全栈，含 /api 反代）
│   ├── Dockerfile           # 前端镜像（纯前端）
│   ├── Dockerfile.full      # 前端镜像（全栈）
│   ├── docker-compose.yml   # 一键部署（纯前端）
│   ├── docker-compose.full.yml # 一键部署（前端 + 后端 + MySQL）
│   ├── serve.sh             # 快速预览
│   └── DEPLOY.md            # 部署指南
├── test-api.sh              # 后端接口冒烟测试脚本
├── dist/                    # 构建产物（deploy/build.sh 生成）
├── anatomy.html / anatomy3d.html  # 早期 2D/3D 实验页面
└── legacy/                  # 早期单页版本备份
    └── index-monolith.html
```

---

## 快速开始

### 1. 启动静态服务器

> **必须通过 HTTP 服务访问**，不能直接双击打开 `file://`（否则 ES Module / importmap 与 3D 模型无法加载）。

```bash
cd MyoMap
python3 -m http.server 8799
```

浏览器打开：<http://localhost:8799/index.html>

也可使用任意静态服务器，例如：

```bash
npx serve .            # Node
php -S localhost:8799  # PHP
```

### 2. 环境要求

- 现代浏览器（Chrome / Edge / Safari / Firefox 最新版）
- 支持 WebGL（3D 模型需要）
- 无需 Node.js、无需构建

---

## 访问控制与演示账号

| 页面 | 游客 | 登录用户 |
|---|---|---|
| 首页、动作库 | ✅ 可浏览 | ✅ |
| 其余页面 | 🔒 自动跳转登录页 | ✅ |
| 保存类操作（计划 / 记录 / 数据 / 自定义动作） | 🔒 提示登录 | ✅ |

**演示账号**：`admin` / `123456`（首次打开登录页时自动创建）

**游客模式**：登录页点击「游客模式进入」即可浏览首页与动作库。

---

## 数据存储

所有数据保存在浏览器 `localStorage`，按用户命名空间隔离（键前缀 `myomap:`）。

| 实体 | 键 | 说明 |
|---|---|---|
| 会话 | `myomap:session` | 当前登录用户 |
| 用户 | `myomap:users` | 本地账号（SHA-256 + 随机 salt，非明文） |
| 档案 | `myomap:profile:<uid>` | 性别 / 生日 / 身高 / 体重 / 目标 / 经验 / 活动水平 |
| 身体数据 | `myomap:body:<uid>` | 体重 / 体脂 / 围度，按日期去重 |
| 训练计划 | `myomap:plans:<uid>` | 计划名称 / 目标 / 频率 / 周期 / 动作列表 |
| 训练记录 | `myomap:logs:<uid>` | 时长 / 容量 / 消耗 / 各动作组数 |
| 饮食记录 | `myomap:diet:<uid>` | 餐别 / 食物 / 热量 / 三大营养素 |
| AI 对话 | `myomap:chat:<uid>` | 对话历史 |
| 设备 | `myomap:device:<uid>` | 绑定设备信息 |
| 自定义动作 | `myomap:custom:<uid>` | 用户自建动作 |

在「我的档案 → 数据管理」中可**导出 / 导入 JSON 备份**或**清空数据**。

> 密码哈希说明：受浏览器环境限制，采用 `SHA-256 + 随机 salt`（通过 Web Crypto）。生产环境应替换为服务端 bcrypt。

---

## 3D 人体模型

`viewer3d.js` 基于 `body.glb`（Z-Anatomy 解剖模型）实现：

- **按需渲染**：仅在相机变化 / 悬停 / 选中时重绘，降低 GPU 占用
- **共享材质**：826 个网格归并为 3 种材质，大幅减少 draw call
- **交互**：拖动旋转、滚轮缩放、悬停高亮 + 名称提示、点击选中并聚焦放大
- **正/背面**：`mapMuscleName()` 将英文解剖名映射到中文肌群
- **皮肤外壳重建**：原模型无皮肤网格（头 / 手 / 脚仅有骨骼）。系统从骨骼顶点云重建平滑皮肤外壳：
  - 采集区域顶点 → 支撑函数（凸包）→ 球面半径平滑 → 生成闭合网格
  - 几何判定隐藏外壳内部的深层结构（眼球肌、听小骨、软骨、牙齿等）
  - 结果：头为平滑头型、手为连指手套形、脚为平滑脚型
- **蔬果造型外壳**（程序化生成，完全包裹原骨骼）：
  - 头部 → **南瓜**（10 道纵向瓜棱 + 瓜蒂）
  - 手部 → **橘子**（球体 + 细密橘皮凹凸 + 小蒂）
  - 脚部 → **哈密瓜**（纵向瓜棱 + 网纹起伏 + 瓜蒂）
  - 切换开关：`viewer3d.js` 顶部的 `PUMPKIN_HEAD` / `ORANGE_HANDS` / `MELON_FEET`，改为 `false` 即恢复平滑外壳

> 首次加载需解析约 8MB 的 DRACO 压缩模型，请稍候；加载失败时会提示改用本地服务器。

---

## 动作库数据

- `assets/js/exercises-data.js`：**893 个中文动作**，覆盖 18 个肌群，由 `exercises.json`（1324 条）自动生成，字段包含
  `id / name(中) / en(英) / muscle / bodyPart / type / difficulty / equipment / gif / instructions / tips`
- 演示图来自开源数据集 `hasaneyldrm/exercises-dataset`（jsDelivr CDN），**需联网**；离线时显示占位图标
- 原始数据集 `exercises.json`（1324 条，英文）保留在根目录，可据此扩充
- 推荐排序遵循「复合动作优先、孤立动作次之」

### 动作指导

点击任意动作（首页「推荐动作」或动作库卡片）会打开**动作指导**弹窗，包含：

| 内容 | 说明 |
|---|---|
| 建议组次 | 按难度给出（初级 3×12-15 / 中级 4×8-12 / 高级 4-5×5-8） |
| 准备姿势 | 按动作类型（推/拉/蹲/举/弯举/卷腹/拉伸）给出 |
| 动作步骤 | 由动作说明拆分并编号，逐步呈现 |
| 呼吸节奏 | 发力呼气、还原吸气 |
| 常见错误 | 按动作类型的典型错误清单 |
| 训练技巧 | 该动作的要点提示 |

### 动作数量统计

- **首页**「推荐动作」面板显示：动作库总数、覆盖肌群数、难度分布；选择部位后显示该部位动作总数与推荐数
- **动作库**顶部统计卡与肌群标签均带动作数量；筛选结果实时显示数量与难度构成

### 新手入门指导

首页与动作库均提供「新手入门指导」入口，内容包含：
热身 → 训练原则 → 训练频率 → 渐进超负荷 → 拉伸放松，
并按肌群自动推荐入门动作（点击即可查看分步指导）。

---

## AI 助手配置

`ai.html` 支持接入**真实大模型**，配置入口在页面右上角「AI 设置」。协议为 **OpenAI 兼容**，因此兼容多家服务。

| 服务商 | Base URL | 模型 | 费用 |
|---|---|---|---|
| **智谱 GLM-4-Flash** | `https://open.bigmodel.cn/api/paas/v4` | `glm-4-flash` | **免费额度**（推荐） |
| 本地 Ollama | `http://localhost:11434/v1` | `qwen2.5` 等 | **完全免费·无需 Key** |
| DeepSeek | `https://api.deepseek.com/v1` | `deepseek-chat` | 需 Key |
| 通义千问 | `https://dashscope.aliyuncs.com/compatible-mode/v1` | `qwen-plus` | 需 Key |
| OpenAI | `https://api.openai.com/v1` | `gpt-4o-mini` | 需 Key |
| Moonshot | `https://api.moonshot.cn/v1` | `moonshot-v1-8k` | 需 Key |
| 自定义 | 任意 OpenAI 兼容地址 | — | — |

### 饮食拍照识别热量

`diet.html` 的「AI 拍照识别热量」使用**多模态模型**：上传/拍摄食物照片 → AI 识别食物种类与分量 → 估算热量与三大营养素 → 一键加入当日记录。

- 视觉模型在各服务商预设中已自动配置（智谱 `glm-4v-flash` 免费、通义 `qwen-vl-plus`、OpenAI `gpt-4o` 等）；
- 图片会在浏览器端压缩到最长边 900px 后再上传，省流量、降费用；
- 识别结果为 AI 估算，界面提示「仅供参考，可按实际调整」；
- 未配置 AI 时点击识别会引导前往「AI 设置」。

### 方案一：智谱 GLM-4-Flash（免费额度，最省事）

1. 打开 [open.bigmodel.cn](https://open.bigmodel.cn/) 注册并创建 API Key（免费）；
2. 「AI 设置」中选择 **智谱 GLM-4-Flash（免费）**（已默认选中并预填 Base URL 与模型）；
3. 粘贴 API Key → 点击「测试连接」确认 → 保存。

### 方案二：本地 Ollama（完全免费、无需 Key）

```bash
# 1. 安装 Ollama（https://ollama.com）
# 2. 拉取一个中文友好的小模型
ollama pull qwen2.5
# 3. 若浏览器报跨域错误，设置允许来源后重启
export OLLAMA_ORIGINS=*
ollama serve
```

然后在「AI 设置」中选择「本地 Ollama」，点击「检测本地模型」即可自动填入模型名，API Key 留空。

> 特性：
> 1. **流式输出**（逐字显示），回答更自然；设置面板内置「测试连接」，保存前即可验证 Key；
> 2. 未配置 / 调用失败时，自动回退到内置健身知识库，**始终可用**；
> 3. 对话历史与配置仅保存在本地浏览器；
> 4. API Key 存于 `localStorage`，属本地优先用法；如需更高安全性应改用服务端代理。

---

## 高德地图配置

`map.html` 使用**高德地图 Web 端（JS API）**，配置位于文件顶部：

```js
const AMAP_KEY = 'bffd9eb4ede72606b32e3c26996cc29c';   // Web 端(JS API) Key
const AMAP_SECURITY = '9c91a6cc07be4bfaeb06d8a148b1bf71'; // 安全密钥 securityJsCode
```

已接入的能力：

| 能力 | 高德服务 |
|---|---|
| 地图展示 | `AMap.Map`（浅色主题 whitesmoke） |
| 路线规划 | `AMap.Walking` / `AMap.Riding`（跑步·徒步 / 骑行） |
| 定位与轨迹记录 | `AMap.Geolocation`（`getCurrentPosition` / `watchPosition`） |
| 周边设施 | `AMap.PlaceSearch`（健身房 / 公园 / 体育场馆，3km 内）；点击设施在地图上**打点标注**并弹出信息窗 |
| 距离计算 | `AMap.GeometryUtil.distance` |

> 说明：
> 1. 需在[高德开放平台](https://console.amap.com/)为 Key 开通「Web端(JS API)」，并配置安全密钥；
> 2. Key 与安全密钥会暴露在前端，这是 JS API 的正常用法；如需隐藏，应改用服务端代理；
> 3. **未联网或服务未授权时自动降级**为离线模拟引擎（地图区域显示 SVG 模拟路线）。

---

## 后端服务（Spring Boot）

项目自带一个 **Spring Boot 3 + MyBatis-Plus + MySQL + JWT** 后端，位于 `backend/`。

| 层 | 选型 |
|---|---|
| 框架 | Spring Boot 3.2（Java 17） |
| ORM | MyBatis-Plus 3.5 |
| 数据库 | MySQL 8 |
| 认证 | JWT + BCrypt |
| 文档 | Swagger UI（`/swagger-ui.html`） |

### 启动

```bash
mysql -uroot -p < backend/src/main/resources/schema.sql   # 建库建表
cd backend
cp src/main/resources/application-local.yml.example src/main/resources/application-local.yml
# 编辑 application-local.yml，填入本机 MySQL 口令（该文件已被 .gitignore 排除）
mvn spring-boot:run                                        # 或 mvn package && java -jar target/*.jar
```

> **配置约定**：仓库中的 `application.yml` 只放非敏感项，口令/密钥一律走环境变量或本地
> `application-local.yml`。可用环境变量（优先级最高）：
> `MYOMAP_DB_USERNAME`、`MYOMAP_DB_PASSWORD`、`MYOMAP_JWT_SECRET`、`MYOMAP_AI_KEY`。
> 生产环境**必须**通过 `MYOMAP_JWT_SECRET` 覆盖默认开发密钥。

- 服务地址：<http://localhost:8081>
- 接口文档：<http://localhost:8081/swagger-ui.html>
- 演示账号：`admin` / `123456`（首次启动自动创建；仅用于本地演示，请勿用于生产）

### 前后端协作

| 能力 | 优先 | 降级 |
|---|---|---|
| 登录 / 注册 | 后端 `/user/login`（返回 JWT） | 本地账号（SHA-256） |
| AI 问答 | 后端 `/ai/chat`（**服务端持 Key**） | 客户端直连大模型 → 内置知识库 |
| 饮食拍照识别 | 后端 `/food/analyze` | 客户端视觉模型 |
| 其他数据 | 后端接口 | 浏览器 localStorage |

- 前端请求自动携带 `Authorization: Bearer <JWT>`；
- API 地址**自适应**：本地开发 `http://localhost:8081`，线上走同源 `/api`（Nginx 反向代理）；
- **后端未启动时全部功能本地降级**，不影响演示。

### 接口一览

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/user/register` · `/user/login` | 注册 / 登录（返回 JWT） |
| GET/POST | `/profile` | 个人档案 |
| GET/POST/DELETE | `/bodydata/*` | 身体数据 |
| GET/POST/DELETE | `/plan/*` | 训练计划（含 `/plan/generate` 生成） |
| GET/POST | `/workout/*` | 训练记录 |
| GET/POST | `/food/*` | 饮食记录（含 `/food/analyze` AI 分析） |
| POST | `/ai/chat` | AI 问答（**服务端代理，Key 不暴露**） |

> 前端 `Common.api()` 默认连接 `http://localhost:8081`；**后端未启动时全部功能本地降级**，不影响使用。
> 详见 [`backend/README.md`](backend/README.md)。

---

|---|---|---|
| POST | `/user/login` | 登录 | 本地账号 |
| POST | `/plan/generate` | 生成训练计划 | 本地计划生成器 |
| POST | `/ai/chat` | AI 问答 | 本地知识库 |
| POST | `/food/analyze` | 饮食解析 | 本地食物库解析 |
| GET | `/bodydata/history` | 身体数据 | 本地存储 |
| GET | `/food/calories/{date}` | 当日热量 | 本地存储 |
| GET | `/workout/list` | 训练记录 | 本地存储 |

接口冒烟测试：

```bash
bash test-api.sh
```

---

## 与需求规格说明书（SRS）的对应

| 模块 | 优先级 | 实现情况 | 主要位置 |
|---|---|---|---|
| FM-01 用户与档案管理 | P0 | ✅ 注册 / 登录 / 游客 / 档案 / BMI·BMR·TDEE | `login.html`、`profile.html` |
| FM-02 人体交互式部位选择器 | P0 | ✅ 3D 交互 / 多选 / 推荐动作 / 一键全身 / 计划生成 | `index.html`、`viewer3d.js`、`planner.js` |
| FM-03 训练计划与记录 | P0 | ✅ 计划生成 / 模板 / 训练模式 / 容量 / 1RM / 报告 / 动作库 | `plan.html`、`workout.html`、`library.html` |
| FM-04 身体数据管理 | P0 | ✅ 体重 / 体脂 / 围度 / 趋势图 / 雷达图 | `body.html` |
| FM-05 AI 饮食规划 | P1 | ✅ 营养目标 / 文本识别 / **AI 拍照识别热量** / 进度 / 建议 / 食谱 | `diet.html` |
| FM-06 地图行程规划 | P1 | ✅ 高德地图 API：路线规划 / 轨迹记录 / 周边 POI | `map.html` |
| FM-07 AI 智能助手 | P2 | ✅ 接入真实大模型（OpenAI 兼容协议，支持流式）；未配置时用内置知识库 | `ai.html`、`assets/js/ai-client.js` |
| FM-08 智能设备接入 | P2 | ◑ 手环数据模拟 / 数据融合仪表盘 | `device.html`、`device.js` |

> 图例：✅ 完整实现　◑ 演示 / 模拟实现（已预留真实接入点）

---

## 部署（云服务器）

本项目是**纯静态站点**，无需 Node / 数据库，任何静态服务器均可托管。

```bash
# 1. 生成部署包（仅含运行所需文件，约 12MB）
bash deploy/build.sh

# 1b. 全栈部署（前端 + 后端 + MySQL，毕设推荐）
docker compose -f deploy/docker-compose.full.yml up -d --build

# 2a. Docker 一键部署（推荐）
docker compose -f deploy/docker-compose.yml up -d --build

# 2b. 或 Nginx 直接部署（详见 deploy/DEPLOY.md）
```

访问 `http://<服务器IP>:8080` 即可；配置域名后建议启用 **HTTPS**（免费 Let's Encrypt）。

> **三个部署要点**：
> 1. **HTTPS**：非 `localhost` 访问时，浏览器的定位/GPS 必须走 HTTPS，否则 `map.html` 的定位与轨迹记录会失败；
> 2. **高德 Key 白名单**：在[高德控制台](https://console.amap.com/)把部署域名加入该 Key 的 Web 端白名单，否则地图服务会降级；
> 3. **AI Key 不必写进代码**：AI 配置存于每个访客自己的浏览器，部署者无需暴露 Key。

完整步骤（含防火墙、证书、常见问题）见 **[`deploy/DEPLOY.md`](deploy/DEPLOY.md)**；
仅本机运行、用手机等其他设备访问，见 **[`deploy/LAN.md`](deploy/LAN.md)**。

---

## 已知限制

1. **无真实后端**：账号、计划、记录等均为浏览器本地存储，清除浏览器数据会丢失；请善用导出备份。
2. **地图**：已接入高德地图 Web JS API（需联网）。Key / 安全密钥在 `map.html` 顶部配置；若服务未授权会自动降级为模拟路线。
3. **视频动作解析**：为演示实现，未接入 MediaPipe / OpenPose。
4. **智能设备**：为数据模拟层，未接入真实 BLE / HealthKit。
5. **AI 能力**：后端不可用时使用本地知识库与规则解析，回答范围有限。
6. **3D 颈部**：极限放大至颈部时可能看到深层喉部结构（面部 / 手部 / 脚部已处理为平滑外壳）。
7. **演示图**：动作 gif 依赖外部 CDN，离线不可用。
8. 根目录下的 `anatomy*.html`、`body_v*.js`、`generate_*.py` 等为早期实验文件，不属于当前多页应用。

---

## 免责声明

1. 本系统提供的训练计划、饮食建议均由算法 / AI 生成，属于**建议性内容**，请根据自身情况调整。
2. 本系统**不提供医疗建议**，所有健康数据仅供参考。
3. 如患有疾病或有伤病史，请在专业人士指导下训练。
4. 所有数据默认仅保存在本地浏览器，保护你的隐私。

---

<p align="center"><sub>MyoMap · 健身计划指南系统 · 毕业设计项目</sub></p>
