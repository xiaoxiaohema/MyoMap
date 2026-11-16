# MyoMap 部署指南（云服务器）

将本项目部署到云服务器，任何人通过网址即可在电脑 / 手机 / 平板上访问。

---

## 目录

- [部署方式概览](#部署方式概览)
- [准备](#准备)
- [方案 A：Docker Compose（推荐）](#方案-adocker-compose推荐)
- [方案 B：Nginx 直接部署](#方案-bnginx-直接部署)
- [方案 C：快速预览](#方案-c快速预览)
- [域名与 HTTPS（重要）](#域名与-https重要)
- [高德地图 Key 域名白名单](#高德地图-key-域名白名单)
- [防火墙 / 安全组](#防火墙--安全组)
- [AI 助手说明](#ai-助手说明)
- [常见问题](#常见问题)

---

## 部署方式概览

| 方案 | 适用 | 难度 | HTTPS |
|---|---|---|---|
| A. Docker Compose | 纯前端生产部署（推荐） | ★ | 配合 Nginx/证书 |
| D. 全栈（前端+后端+MySQL） | 需展示后端能力（毕设推荐） | ★★ | 支持 |
| B. Nginx 直接部署 | 已有 Nginx 的服务器 | ★★ | 支持 |
| C. serve.sh | 临时预览 / 内网 | ☆ | 无 |

> 本项目前端是**纯静态站点**（HTML/CSS/JS + Three.js），后端为 Spring Boot（可选），任何静态服务器都能托管前端。
> **仅想在本机运行、用其他设备访问？** 请看 [局域网 / 外网访问指南](LAN.md)。

---

## 准备

1. 一台云服务器（阿里云 / 腾讯云 / 华为云等），系统 Ubuntu 20.04+ / Debian 12+；
2. 开放安全组端口：`80`（HTTP）、`443`（HTTPS）；Docker 方案还需 `8080`；
3. 可选：一个域名，并解析到服务器公网 IP（用于 HTTPS）。

把项目上传到服务器（任选其一）：

```bash
# 方式一：git
git clone <你的仓库地址> MyoMap && cd MyoMap

# 方式二：本地上传（在本地电脑执行）
scp -r MyoMap root@<服务器IP>:/root/
```

生成部署包（只含运行所需文件，约 9MB）：

```bash
cd MyoMap
bash deploy/build.sh      # 生成 dist/
```

---

## 方案 A：Docker Compose（推荐）

```bash
# 1. 安装 Docker（Ubuntu）
curl -fsSL https://get.docker.com | bash
systemctl enable --now docker

# 2. 构建并启动
cd MyoMap
bash deploy/build.sh
docker compose -f deploy/docker-compose.yml up -d --build

# 3. 查看状态
docker compose -f deploy/docker-compose.yml ps
```

访问：`http://<服务器IP>:8080`

常用命令：

```bash
docker compose -f deploy/docker-compose.yml logs -f      # 查看日志
docker compose -f deploy/docker-compose.yml restart      # 重启
docker compose -f deploy/docker-compose.yml down         # 停止
```

---

## 方案 B：Nginx 直接部署

```bash
# 1. 安装 Nginx
apt update && apt install -y nginx

# 2. 部署文件
bash deploy/build.sh
mkdir -p /var/www/myomap
cp -r dist/* /var/www/myomap/

# 3. 写入站点配置
cat > /etc/nginx/sites-available/myomap <<'CONF'
server {
    listen 80;
    server_name _;
    root /var/www/myomap;
    index index.html;
    gzip on;
    gzip_types text/css application/javascript application/json image/svg+xml;
    location ~* \.(?:js|css|glb|jpg|png|gif|svg)$ { expires 7d; add_header Cache-Control "public"; }
    location / { try_files $uri $uri/ =404; }
}
CONF
ln -sf /etc/nginx/sites-available/myomap /etc/nginx/sites-enabled/myomap
rm -f /etc/nginx/sites-enabled/default

# 4. 校验并重启
nginx -t && systemctl restart nginx
```

访问：`http://<服务器IP>`

> 若用宝塔面板：新建站点 → 网站根目录指向 `dist/` 内容即可。

---

## 方案 C：快速预览

```bash
bash deploy/build.sh
bash deploy/serve.sh 8080
```

- 本机：`http://localhost:8080`
- 局域网其他设备：`http://<本机IP>:8080`（同一 Wi-Fi 下即可访问）

> 仅用于演示，不适合生产；无 HTTPS，定位功能可能受限。

---

## 方案 D：全栈部署（前端 + Spring Boot 后端 + MySQL）

适合需要展示后端能力的场景（毕设答辩推荐）。一条命令拉起三个容器：

```bash
cd MyoMap
bash deploy/build.sh

# 配置服务端 AI Key（写入仓库外的 ~/.myomap.env；不配置则 AI 走内置知识库）
echo 'MYOMAP_AI_KEY=你的智谱Key' > ~/.myomap.env && chmod 600 ~/.myomap.env

docker compose --env-file ~/.myomap.env -f deploy/docker-compose.full.yml up -d --build
```

| 容器 | 说明 | 端口 |
|---|---|---|
| `myomap-mysql` | MySQL 8（自动建库建表） | 内部 |
| `myomap-backend` | Spring Boot 3（8081） | 内部 |
| `myomap-web` | Nginx 前端 + `/api` 反向代理 | **8080** |

访问：`http://<服务器IP>:8080`
- 前端通过 **同源 `/api`** 访问后端（Nginx 反代到 `backend:8081`），**无需额外暴露 8081，也没有跨域问题**；
- 演示账号 `admin` / `123456`（后端首次启动自动创建）；
- 后端接口文档：可在容器内访问 `http://backend:8081/swagger-ui.html`（如需外网访问，可临时把 8081 端口映射出来）。

常用命令：

```bash
docker compose -f deploy/docker-compose.full.yml logs -f backend   # 后端日志
docker compose -f deploy/docker-compose.full.yml ps
docker compose -f deploy/docker-compose.full.yml down              # 停止（保留数据卷）
docker compose -f deploy/docker-compose.full.yml down -v           # 停止并清空数据库
```

> 前端 API 地址会**自动适配**：本地开发直连 `http://localhost:8081`，线上部署走同源 `/api`。
> 也可在浏览器控制台执行 `localStorage.setItem('myomap:api','https://api.example.com')` 手动指定。

---

## 域名与 HTTPS（重要）

**为什么必须 HTTPS？**

浏览器的安全策略规定：**非 `localhost` 的页面调用定位（GPS）必须使用 HTTPS**。
如果只用 `http://IP` 访问，`map.html` 的「定位」和「轨迹记录」会失败（高德地图本身仍可显示）。

**申请免费证书（Let's Encrypt）：**

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d your-domain.com        # 按提示输入邮箱，自动配置并续期
```

证书自动续期已由 certbot 定时任务处理，可用 `certbot renew --dry-run` 验证。

---

## 高德地图 Key 域名白名单

高德 JS API Key 需要把**部署域名**加入白名单，否则地图/路线/POI 会报错：

1. 登录 [高德开放平台控制台](https://console.amap.com/) → 应用管理 → 我的应用；
2. 找到对应 Key（`bffd9eb4ede72606b32e3c26996cc29c`）；
3. 在「Web端(JS API)」的域名白名单中添加：
   - 域名：`your-domain.com`（HTTPS 部署可填 `https://your-domain.com`）
   - 若仅用 IP 测试，可临时留空或填服务器 IP；
4. 保存后等待生效（通常几分钟）。

> 若白名单未配置，`map.html` 会**自动降级**为离线模拟路线，页面不会崩。

---

## 防火墙 / 安全组

- 云厂商控制台「安全组」放行：`80`、`443`（Docker 再加 `8080`）；
- 服务器本机防火墙（如启用 ufw）：

```bash
ufw allow 80
ufw allow 443
ufw allow 8080    # Docker 方案
ufw reload
```

---

## AI 助手说明

AI 配置保存在**每个访客自己的浏览器**（`localStorage`），因此：

- 部署者**不需要**把自己的 API Key 写进代码；
- 每个访客在「AI 助手 → AI 设置」里填自己的 Key（推荐免费方案）：
  - **智谱 GLM-4-Flash**：注册 [open.bigmodel.cn](https://open.bigmodel.cn/) 免费领取 Key；
  - **本地 Ollama**：在访客自己电脑上运行，Base URL `http://localhost:11434/v1`，无需 Key；
- 未配置时自动使用**内置知识库**，功能始终可用。

> 如果你希望「所有人共用一个 Key 且不暴露」，需要额外写一个**服务端代理**（Node/Nginx 转发并注入 Key）。这属于后端工作，可按需扩展。

---

## 常见问题

**Q1. 打开是空白 / 3D 模型不显示？**
必须是 HTTP 服务访问（不能 `file://`）。若 3D 不显示，检查 `body.glb` 是否已上传、浏览器是否支持 WebGL。

**Q2. 页面 404？**
确认 `dist/` 内容已放到站点根目录，且 `index.html` 位于根目录。

**Q3. 地图显示但路线/周边失败？**
多为高德 Key 域名白名单或安全密钥问题，见上文。页面会自动降级为模拟路线。

**Q4. 定位/轨迹记录失败？**
需要用 **HTTPS** 访问（见上文）。

**Q5. 修改代码后如何更新？**
重新执行 `bash deploy/build.sh` 并替换站点目录（Docker：`docker compose ... up -d --build`）。

**Q6. 端口被占用 / 想换端口？**
修改 `deploy/docker-compose.yml` 的 `"8080:80"` 左侧端口即可（如 `"80:80"`）。
