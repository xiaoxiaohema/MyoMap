#!/bin/bash
# ============================================================
#  MyoMap · 快速启动（临时预览 / 内网访问）
#  用法：bash deploy/serve.sh [端口]
#  访问：http://<本机IP>:端口
#  说明：生产环境建议用 Nginx（见 deploy/DEPLOY.md），本脚本仅用于快速预览
# ============================================================
PORT="${1:-8080}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if [ -d "$ROOT/dist" ]; then
  DIR="$ROOT/dist"
else
  echo "未找到 dist/，先执行 bash deploy/build.sh"
  exit 1
fi

IP=$(ipconfig getifaddr en0 2>/dev/null || hostname -I 2>/dev/null | awk '{print $1}' || echo "本机IP")
echo "MyoMap 已启动"
echo "  本机访问： http://localhost:$PORT"
echo "  局域网访问：http://$IP:$PORT"
echo "  按 Ctrl+C 停止"
echo ""
cd "$DIR" && python3 -m http.server "$PORT" --bind 0.0.0.0
