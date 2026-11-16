# MyoMap 局域网 / 外网访问指南

> 场景：项目**在本机运行**（MySQL + Spring Boot 后端 + 前端），你用**其他设备**（手机 / 平板 / 另一台电脑）通过浏览器访问。

---

## 一、最快上手（同一 Wi-Fi 局域网）

### 1. 确认服务已运行

```bash
brew services list | grep mysql      # MySQL: started
launchctl list | grep myomap         # 后端 / 前端：有 PID
```

### 2. 查看本机 IP

```bash
ipconfig getifaddr en0        # 例如 10.59.186.217
```

### 3. 在其他设备浏览器打开

```
http://10.59.186.217:8799
```

> 前端会自动把后端地址解析为 `http://10.59.186.217:8081`，**无需任何配置**。

---

## 二、关键注意事项

### ⚠️ 1. macOS 防火墙（最常见连不上的原因）

本机防火墙已开启时，会拦截外部设备的连接。请放行：

**系统设置 → 网络 → 防火墙 → 选项**，将 **Python** 与 **java** 设置为「允许传入连接」。

或临时关闭防火墙测试：

```bash
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --setglobalstate off   # 测试用，用完请恢复 on
```

### ✅ 2. API 地址自适应（已实现）

前端会自动判断访问方式，无需手动配置：

| 访问方式 | 后端地址 |
|---|---|
| `localhost:8799` | `http://localhost:8081` |
| `10.59.186.217:8799`（局域网） | `http://10.59.186.217:8081` |
| `https://your-domain.com`（80/443） | 同源 `/api`（Nginx 反向代理） |

也可在浏览器控制台手动指定：

```js
localStorage.setItem('myomap:api', 'http://192.168.1.5:8081');
```

### 🔒 3. MySQL 仅本机可连（已加固）

已配置 `bind-address = 127.0.0.1`（`/opt/homebrew/etc/my.cnf`），**3306 不会暴露到局域网**，外部设备无法直连数据库，安全。

### 🗺️ 4. 高德地图 Key 白名单

外部设备访问时，若地图不显示（降级为模拟路线），需在高德控制台把**访问地址**加入 Key 白名单：

- 局域网：填本机 IP（部分控制台支持 IP，或临时留空白名单）
- 外网/域名：填 `your-domain.com`

> 未配置白名单时页面**不会崩**，会自动降级为离线模拟路线。

### 📍 5. 定位 / GPS 轨迹需要 HTTPS

浏览器规定：**非 `localhost` 的页面调用定位必须使用 HTTPS**。
因此通过 `http://<IP>:8799` 访问时：

- ✅ 地图、路线规划、周边设施正常
- ❌ 定位、GPS 轨迹记录会失败

如需定位功能，见下方「外网访问」的 HTTPS 方案。

---

## 三、外网访问（不在同一局域网）

### 方案 A：内网穿透（推荐，自动 HTTPS）

无需公网 IP、无需改路由器，适合答辩演示。

**cloudflared（免费）：**

```bash
brew install cloudflared
cloudflared tunnel --url http://localhost:8799
# 会输出一个 https://xxxx.trycloudflare.com 地址，其他设备直接打开
```

**ngrok：**

```bash
ngrok http 8799
```

> 注意：穿透后前端是 HTTPS，但后端仍在本机 8081。需同时暴露后端，或改用**同源反向代理**（见方案 C）。
> 简单做法：分别穿透两个端口，然后在其他设备的浏览器控制台执行
> `localStorage.setItem('myomap:api','https://你的后端穿透地址')`。

### 方案 B：路由器端口映射

在路由器后台把公网端口映射到本机：

| 公网端口 | 内网地址 |
|---|---|
| 8799 | 本机IP:8799（前端） |
| 8081 | 本机IP:8081（后端） |

然后访问 `http://<公网IP>:8799`。
（需公网 IP；多数家宽为内网 IP，需联系运营商或改用方案 A/C）

### 方案 C：部署到云服务器（最稳定）

见 **[`DEPLOY.md`](DEPLOY.md)** 的「方案 D：全栈部署」。用 Nginx 反向代理 `/api` → 后端，
**同源无跨域**，并可申请免费 HTTPS 证书（定位功能可用）。

---

## 四、验证清单

在外部设备上依次确认：

- [ ] 打开 `http://<本机IP>:8799` 能看到登录页
- [ ] 用 `admin / 123456` 能登录（说明前端已连上后端）
- [ ] 打开「动作库」能看到 893 个动作
- [ ] 打开「地图行程」能显示地图（若不能，检查高德 Key 白名单）
- [ ] 打开「AI 助手」能对话（未配 Key 时用内置知识库）

---

## 五、常见问题

**Q：其他设备打不开 / 一直转圈？**
A：① 确认两台设备在同一 Wi-Fi；② 检查 macOS 防火墙是否放行 Python/java；③ 用本机 `curl http://<IP>:8799` 自测。

**Q：能打开页面但数据不同步？**
A：每个设备的数据默认各自存在浏览器 `localStorage`；登录后走**后端 MySQL** 即会同步（需后端在线且防火墙放行 8081）。

**Q：地图不显示？**
A：高德 Key 白名单未包含当前访问地址，见上文第 4 点。

**Q：定位按钮没反应？**
A：HTTP 下浏览器禁止定位，需 HTTPS，见上文第 5 点。

**Q：如何停止对外服务？**
```bash
launchctl unload ~/Library/LaunchAgents/com.myomap.frontend.plist
launchctl unload ~/Library/LaunchAgents/com.myomap.backend.plist
```
