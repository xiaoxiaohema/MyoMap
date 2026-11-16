# MyoMap · Vue + Three.js 版

在原「本地优先」健身计划指南系统基础上，用 **Vue 3 + Vite + Three.js** 重做的 UI 版本，
视觉、配色、主题与业务逻辑与原版保持一致，同时把架构升级为组件化 SPA。

## 技术栈

| 维度 | 原生版（旧） | Vue 版（本工程） |
|---|---|---|
| 页面组织 | 多页应用（11 个 .html，整页跳转） | SPA + `vue-router`（Hash 路由，懒加载分包） |
| UI 框架 | 原生 HTML + IIFE 脚本操作 DOM | Vue 3（`<script setup>` 组件 + 响应式） |
| 3D 渲染 | `viewer3d.js`（全局脚本，importmap 加载 three） | `lib/BodyScene.js`（ESM 移植）+ `components/BodyViewer.vue`（生命周期管理） |
| Three.js | 本地 `libs/three.module.js`（r160） | npm `three`（r160，Vite 打包） |
| 构建 | 无（直接静态文件） | Vite 5（`npm run build` → `dist/`） |
| 样式 | `assets/css/common.css` + 各页内联 `<style>` | `src/styles/common.css` + `src/styles/app.css`（原各页样式汇总） |
| 主题 | `theme.js` + `<html data-theme>`，6 套配色 | `services/theme.js` + `ThemeModal.vue`（组件化，6 套配色） |
| 状态/业务逻辑 | `window.Common` / `window.Store` / `MyPlanner` / `MyAI` / `MyPose` | **原样复用**（`src/lib/*` 挂到 window）|
| 后端接口 | `/user` `/ai` `/plan` …（Spring Boot） | 完全一致，无需改动 |

## 目录结构

```
src/
├─ main.js              # 入口：加载样式 + 复用逻辑模块 + 初始化主题
├─ App.vue              # <router-view/>
├─ router/index.js      # 11 条路由 + 登录守卫
├─ components/
│  ├─ AppLayout.vue     # 侧栏 + 顶栏 + 内容 + 免责声明弹窗
│  ├─ Sidebar.vue       # 导航（组件化，含锁/登录态）
│  ├─ Topbar.vue        # 标题 + 主题按钮 + 登录/用户
│  ├─ ThemeModal.vue    # 主题切换（6 套）
│  ├─ Modal.vue         # 通用弹窗
│  ├─ Icon.vue          # 由 icons.js 渲染 SVG
│  └─ BodyViewer.vue    # 3D 容器（懒加载 BodyScene，卸载时 dispose）
├─ services/theme.js    # 主题读写与持久化
├─ styles/              # common.css（设计系统）+ app.css（各页样式）
├─ lib/                 # 复用原逻辑：store/common/planner/ai-client/pose-analysis/device/icons/exercises-data/BodyScene
└─ views/               # 11 个页面组件
```

## 运行与部署

```bash
npm install
npm run dev        # 开发：http://localhost:5173
npm run build      # 产出 dist/
npm run preview    # 预览构建产物
```

- **本地常驻**：`~/Library/LaunchAgents/com.myomap.vue.plist`（launchd，`--port 5173 --strictPort`，KeepAlive 自愈）。
- **公网 / Docker**：仓库的 `deploy/build.sh` 会自动构建本工程并把 `dist/` 合入原站 `dist/vue/`，
  nginx 增加 `location /vue/`，因此可访问 `http://<host>/vue/`（见根仓库 `deploy/nginx.full.conf`）。
- 子路径部署：`vite.config.js` 设 `base:'./'`；`BodyScene`/`MyPose` 中的 draco、body.glb、mediapipe
  资源均基于 `document.baseURI` 解析，`/` 与 `/vue/` 下都能正确加载。

## 与旧版的主要差异（做了什么）

1. **架构组件化**：整页跳转 → SPA 路由 + 组件复用；每个页面拆为独立视图组件，公共部分（侧栏/顶栏/弹窗）只实现一次。
2. **3D 组件化**：`viewer3d.js` 移植为 `BodyScene.js`（three 改为 npm 依赖，模型/解码器路径可配置），
   由 `BodyViewer.vue` 在 `onMounted` 懒加载、`onBeforeUnmount` 释放，首页加载更干净。
3. **主题组件化**：顶栏调色盘 → `ThemeModal.vue`；6 套配色（暗夜橙 / 纯白明亮 / 暖沙 / 深海蓝 / 森林绿 / 星夜紫）逻辑与原版一致。
4. **懒加载分包**：视图与 Three.js（BodyScene）按需加载，首屏更小（three 单独分包 ~597KB）。
5. **业务逻辑零改动复用**：`store.js`（localStorage 本地优先）、`common.js`（工具/动作库/图表/弹窗）、
   `planner.js`（本地算法 + 后端 AI 生成）、`ai-client.js`（客户端大模型）、`pose-analysis.js`（MediaPipe 姿态）原样接入，
   因此登录/验证码、AI 问答、AI 生成计划、视频动作解析等功能与旧版行为一致，并直连同一后端。
6. **修复的显示问题**：纯白主题下 `.toast` 提示框文字对比度（背景改为随主题的 `--panel-solid`）等。

> 数据仍为「本地优先」：账号/计划/记录/饮食等保存在浏览器 localStorage；登录与 AI/计划生成可选调用后端。

## 功能对照（均已在 Vue 版实现）

- 首页：3D 人体（南瓜头/橘子手/哈密瓜脚）点选肌肉、推荐动作、健康仪表盘、游客提示
- 动作库：893 个动作，肌群/器械/难度筛选、搜索、详情弹窗、自定义动作
- 训练计划：AI 优先生成（失败回退算法）+ 我的计划 + 模板
- 训练记录：训练队列、组×次×重量、1RM、休息计时、训练报告
- 身体数据：体重/体脂/围度录入与趋势图
- 饮食规划：目标热量/三大营养素、食物库、AI 拍照识别
- AI 助手：智能问答（服务端优先 → 客户端 → 本地兜底）、14 类动作视频姿态分析
- 智能设备：连接手环、步数/心率/睡眠、影响 TDEE
- 地图行程：高德地图路线规划与轨迹记录（失败降级 SVG）
- 我的档案：资料/目标、BMI/BMR/TDEE、导入导出
