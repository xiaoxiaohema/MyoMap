#!/bin/bash
# ============================================================
#  MyoMap · 一键启动「本地 Docker 全栈 + 公网隧道」
#  实现：其他设备在任意网络下通过公网网址访问本机项目
#  用法：bash deploy/start-public.sh
# ============================================================
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> 1/4 构建前端静态包"
bash deploy/build.sh >/dev/null

echo "==> 2/4 启动 Docker 全栈（前端 + 后端 + MySQL）"
# 仓库外的私有环境文件（含 MYOMAP_AI_KEY 等），注入给 compose
ENV_FILE="$HOME/.myomap.env"
ENV_ARG=""
[ -f "$ENV_FILE" ] && ENV_ARG="--env-file $ENV_FILE"
docker compose $ENV_ARG -f deploy/docker-compose.full.yml up -d --build

echo "==> 3/4 等待服务就绪（前端 + 后端 /api）"
ready=0
for i in $(seq 1 90); do
  sleep 2
  fe=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/index.html 2>/dev/null || echo 000)
  api=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:8080/api/user/login \
        -H "Content-Type: application/json" -d '{"username":"admin","password":"123456"}' 2>/dev/null || echo 000)
  if [ "$fe" = "200" ] && [ "$api" = "200" ]; then
    echo "    就绪（前端 200，后端 /api 200，约 $((i*2))s）"
    ready=1
    break
  fi
done
[ "$ready" = "0" ] && echo "    [警告] 服务可能未完全就绪，请稍后重试或查看 docker logs"

echo "==> 4/4 启动 Cloudflare 公网隧道"
if ! command -v cloudflared >/dev/null 2>&1; then
  echo "    [跳过] 未安装 cloudflared，仅本机可访问"
  echo "    安装：brew install cloudflared"
  echo ""
  echo "  本机访问： http://localhost:8080"
  exit 0
fi
# 若已由 launchd 常驻管理（com.myomap.tunnel），直接复用，避免重复起隧道
if launchctl list 2>/dev/null | grep -q com.myomap.tunnel; then
  echo "    隧道由 launchd 常驻管理（com.myomap.tunnel），读取当前地址…"
else
  pkill -f "cloudflared tunnel" 2>/dev/null || true
  sleep 1
  nohup cloudflared tunnel --url http://localhost:8080 > /tmp/myomap-tunnel.log 2>&1 &
fi
URL=""
for i in $(seq 1 30); do
  sleep 2
  URL=$(grep -hoE "https://[a-z0-9-]+\.trycloudflare\.com" /tmp/myomap-tunnel.log /tmp/myomap-tunnel.err.log 2>/dev/null | tail -1)
  [ -n "$URL" ] && break
done

echo ""
echo "════════════════════════════════════════════════"
if [ -n "$URL" ]; then
  echo "  公网访问（任意网络 / 手机流量均可）："
  echo "    $URL"
else
  echo "  隧道启动失败，请查看 /tmp/myomap-tunnel.log"
fi
echo "  本机访问： http://localhost:8080"
echo "  演示账号： admin / 123456"
echo "════════════════════════════════════════════════"
echo "提示：临时隧道地址每次重启会变化；如需固定域名，见 deploy/CLOUD.md"
