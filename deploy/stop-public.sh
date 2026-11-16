#!/bin/bash
# ============================================================
#  MyoMap · 停止「本地 Docker 全栈 + 公网隧道」
#  用法：bash deploy/stop-public.sh
# ============================================================
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> 停止公网隧道"
if launchctl list 2>/dev/null | grep -q com.myomap.tunnel; then
  launchctl unload ~/Library/LaunchAgents/com.myomap.tunnel.plist 2>/dev/null
  echo "    已停止（launchd 常驻已卸载）"
  echo "    重新启用：launchctl load ~/Library/LaunchAgents/com.myomap.tunnel.plist"
else
  pkill -f "cloudflared tunnel" 2>/dev/null && echo "    已停止" || echo "    未运行"
fi

echo "==> 停止 Docker 全栈"
docker compose -f deploy/docker-compose.full.yml down 2>/dev/null && echo "    已停止（数据卷保留）" || echo "    未运行"

echo "完成。如需彻底清空数据库： docker compose -f deploy/docker-compose.full.yml down -v"
