# MyoMap 跨网络访问部署指南（Docker）

> 目标：让**其他设备在任意网络下**（不同 Wi-Fi、手机 4G/5G）通过网址访问你的项目。

提供两种方式：

| 方式 | 适合 | 公网地址 | 成本 |
|---|---|---|---|
| **A. 本机 Docker + Cloudflare 隧道** | 没有云服务器，快速演示 | 临时 `https://xxx.trycloudflare.com`（每次重启变化） | 免费 |
| **B. 云服务器 + Docker** | 需要固定域名、长期稳定 | 你的服务器 IP / 域名 | 云主机费用 |

---

## 方式 A：本机 Docker + Cloudflare 隧道（推荐先用这个）

### 一键启动

```bash
cd MyoMap
bash deploy/start-public.sh
```

脚本会自动：构建前端 → 启动 **Docker 全栈（前端 + 后端 + MySQL）** → 建立 Cloudflare 隧道 → 打印公网地址。

看到类似输出即可：

```
  公网访问（任意网络 / 手机流量均可）：
    https://xxxx-xxxx-xxxx.trycloudflare.com
  本机访问： http://localhost:8080
```

用手机（**关掉 Wi-Fi，用流量**）打开该 https 地址即可验证跨网络访问。

### 原理

```
手机(任意网络) ──https──► Cloudflare 边缘 ──隧道──► 本机 cloudflared
                                                      │
                                              本机 Docker: localhost:8080
                                                      │
                                        nginx(前端) ──/api──► 后端容器 ──► MySQL 容器
```

- 前端与 `/api` 同源（由 nginx 反代），**无跨域问题**；
- 自动 HTTPS（定位/GPS 功能可用）；
- **无需公网 IP、无需改路由器**。

### 停止

```bash
bash deploy/stop-public.sh
```

### 固定域名（可选）

临时隧道地址每次重启会变。固定域名需：
1. 在 Cloudflare 托管一个域名；
2. `cloudflared tunnel login` → `cloudflared tunnel create myomap`；
3. 配置 DNS 并 `cloudflared tunnel run myomap`（详见 [Cloudflare 文档](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/)）。

---

## 方式 B：部署到云服务器（固定域名）

1. 租一台云服务器（Ubuntu 20.04+），开放安全组端口 `80`、`443`；
2. 上传项目并安装 Docker：

```bash
git clone <你的仓库> MyoMap && cd MyoMap
curl -fsSL https://get.docker.com | bash
```

3. 构建并启动全栈：

```bash
bash deploy/build.sh
# 配置服务端 AI Key：写入仓库外的私有文件（推荐，所有电脑零配置）
echo 'MYOMAP_AI_KEY=你的智谱Key' > ~/.myomap.env && chmod 600 ~/.myomap.env
docker compose --env-file ~/.myomap.env -f deploy/docker-compose.full.yml up -d --build
```

4. 修改 `deploy/nginx.full.conf` 或端口映射，让 Web 容器监听 80 端口：

```yaml
# deploy/docker-compose.full.yml
  web:
    ports:
      - "80:80"        # 改为 80
```

5. 访问 `http://<服务器公网IP>`；绑定域名后用 certbot 免费申请 HTTPS。

> 云服务器的优势：地址固定、可配置域名与 HTTPS；劣势：需要维护服务器。

---

## 与需求文档对照

- **NFR-17**：健康数据仅本地存储 —— 方式 A 中数据在**你自己的电脑**（Docker 卷），不经过第三方存储；隧道仅转发请求。
- **NFR-16**：密钥不硬编码 —— AI Key 通过环境变量 `MYOMAP_AI_KEY` 注入后端；高德 Key 在各访客浏览器或前端配置。

---

## 常见问题

**Q：手机流量打不开？**
A：① 确认隧道进程在运行（`ps aux | grep cloudflared`）；② 地址用 `https://` 开头；③ 首次访问 Cloudflare 可能慢几秒。

**Q：能打开前端但登录失败？**
A：说明 `/api` 反代不通。检查 `docker ps` 三个容器是否都在；`docker logs myomap-backend` 看后端是否正常。

**Q：地址每次变太麻烦？**
A：用方式 B（云服务器 + 域名），或配置 Cloudflare 命名隧道（见上）。

**Q：不想一直开着电脑？**
A：用方式 B 部署到云服务器，或用路由器端口映射（需公网 IP）。

**Q：如何查看隧道日志？**
```bash
tail -f /tmp/myomap-tunnel.log      # 隧道
docker logs -f myomap-backend       # 后端
docker logs -f myomap-web           # 前端
```

---

## 隧道常驻自愈（macOS launchd）

前面的 `start-public.sh` 起的是一次性隧道进程，机器睡眠/网络抖动时可能断开。推荐用 launchd 常驻：

```bash
# 安装（已在仓库内提供配置）
cp deploy/launchd/com.myomap.tunnel.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.myomap.tunnel.plist

# 查看状态与当前公网地址
launchctl list | grep com.myomap.tunnel
grep -hoE "https://[a-z0-9-]+\.trycloudflare\.com" /tmp/myomap-tunnel.log /tmp/myomap-tunnel.err.log | tail -1
```

- `KeepAlive=true`：进程退出后由 launchd 自动重启（断线自愈）。
- 快速隧道**每次重启会分配新公网地址**；若需固定域名，请使用上文「命名隧道」方式。
- 卸载：`launchctl unload ~/Library/LaunchAgents/com.myomap.tunnel.plist`（`stop-public.sh` 已兼容此情况）。
