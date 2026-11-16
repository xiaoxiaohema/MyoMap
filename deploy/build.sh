#!/bin/bash
# ============================================================
#  MyoMap · 构建部署包
#
#  项目结构（前后端分离）：
#    frontend/     Vue 3 + Three.js 前端（Vite 构建 → dist/vue/）
#    backend/      Spring Boot 后端（独立 Maven 工程）
#    legacy-web/   旧版多页面实现（历史版本，保留可访问）
#    deploy/       部署脚本与配置
#
#  本脚本把「旧版多页面」与「新版 Vue 构建产物」一起合入 dist/：
#    dist/         旧版多页面（访问 /）
#    dist/vue/     新版 Vue 前端（访问 /vue/）
#  用法：bash deploy/build.sh
# ============================================================
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIST="$ROOT/dist"
LEGACY="$ROOT/legacy-web"
FRONTEND="$ROOT/frontend"

echo "==> 清理 dist/"
rm -rf "$DIST"
mkdir -p "$DIST"

echo "==> 复制旧版多页面（$LEGACY）"
PAGES="index.html library.html login.html plan.html workout.html body.html diet.html ai.html device.html map.html profile.html"
for p in $PAGES; do
  [ -f "$LEGACY/$p" ] && cp "$LEGACY/$p" "$DIST/"
done

echo "==> 复制资源"
cp -r "$LEGACY/assets"   "$DIST/"
cp -r "$LEGACY/wallpaper" "$DIST/"

# 只复制实际使用的 Three.js 文件（排除未使用的 three.min.js / tween.js）
mkdir -p "$DIST/libs/draco"
cp "$LEGACY/libs/three.module.js"   "$DIST/libs/" 2>/dev/null || true
cp "$LEGACY/libs/OrbitControls.js"  "$DIST/libs/" 2>/dev/null || true
cp "$LEGACY/libs/GLTFLoader.js"     "$DIST/libs/" 2>/dev/null || true
cp "$LEGACY/libs/DRACOLoader.js"    "$DIST/libs/" 2>/dev/null || true
cp -r "$LEGACY/libs/draco/." "$DIST/libs/draco/" 2>/dev/null || true
# MediaPipe 姿态推理依赖与模型（AI 视频动作分析用）
cp -r "$LEGACY/libs/mediapipe" "$DIST/libs/" 2>/dev/null || true
# Three.js 插件依赖：GLTFLoader 内部 import '../utils/BufferGeometryUtils.js'
cp -r "$LEGACY/utils" "$DIST/" 2>/dev/null || true

cp "$LEGACY/viewer3d.js" "$DIST/"
cp "$LEGACY/body.glb"    "$DIST/"
[ -f "$ROOT/README.md" ] && cp "$ROOT/README.md" "$DIST/"

# ---- 构建 Vue 3 + Three.js 前端并合入 dist/vue/（存在则构建，失败不阻断）----
VUE_SRC="$FRONTEND"
if [ -f "$VUE_SRC/package.json" ]; then
  echo "==> 构建 Vue 前端（$VUE_SRC）"
  if ( cd "$VUE_SRC" && npm run build >/dev/null 2>&1 ) && [ -d "$VUE_SRC/dist" ]; then
    mkdir -p "$DIST/vue"
    cp -r "$VUE_SRC/dist/." "$DIST/vue/"
    echo "    已合入 dist/vue/（访问：/vue/）"
  else
    echo "    [警告] Vue 前端构建失败，跳过"
  fi
fi

echo ""
echo "==> 构建完成：$DIST"
# 统一放开读/进入权限，避免 nginx（以 nginx 用户运行）因权限不足返回 403
chmod -R a+rX "$DIST"
du -sh "$DIST" 2>/dev/null || true
echo ""
echo "本地预览：  cd dist && python3 -m http.server 8080"
echo "Docker 部署：docker compose -f deploy/docker-compose.yml up -d --build"
