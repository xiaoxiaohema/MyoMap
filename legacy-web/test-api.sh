#!/bin/bash
echo "=== 健身计划指南API测试 ==="
echo ""

BASE="http://localhost:8081"

echo "[1] 用户登录"
RESP=$(curl -s -X POST "$BASE/user/login" -H "Content-Type: application/json" -d '{"username":"admin","password":"123456"}')
echo "$RESP" | head -c 500
echo ""
echo ""

TOKEN=$(echo "$RESP" | grep -o 'token":"[^"]*' | sed 's/token":"//')
if [ -z "$TOKEN" ]; then
    echo "登录失败，退出测试"
    exit 1
fi
echo "登录成功，Token: ${TOKEN:0:30}..."
echo ""

echo "[2] 身体数据历史"
curl -s "$BASE/bodydata/history" -H "Authorization: $TOKEN" | head -c 300
echo ""
echo ""

echo "[3] 训练计划列表"
curl -s "$BASE/plan/list" -H "Authorization: $TOKEN" | head -c 300
echo ""
echo ""

echo "[4] 当日热量"
curl -s "$BASE/food/calories/2026-07-03" -H "Authorization: $TOKEN" | head -c 100
echo ""
echo ""

echo "[5] AI问答"
curl -s -X POST "$BASE/ai/chat" -H "Authorization: $TOKEN" -H "Content-Type: application/json" -d '{"question":"如何增肌？"}' | head -c 300
echo ""
echo ""

echo "[6] 生成训练计划"
curl -s -X POST "$BASE/plan/generate" -H "Authorization: $TOKEN" -H "Content-Type: application/json" -d '{"bodyPart":"背","goal":"增肌","difficulty":2}' | head -c 300
echo ""
echo ""

echo "=== 测试完成 ==="
