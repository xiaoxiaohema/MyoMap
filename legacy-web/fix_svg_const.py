#!/usr/bin/env python3
"""修复：注入SVG_FRONT和SVG_BACK常量到index.html"""
import json

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

with open('svg_front.svg', 'r', encoding='utf-8') as f:
    svg_front = f.read().strip()
with open('svg_back.svg', 'r', encoding='utf-8') as f:
    svg_back = f.read().strip()

svg_constants = f'''
        // SVG肌肉图常量（正/背面）
        const SVG_FRONT = {json.dumps(svg_front, ensure_ascii=False)};
        const SVG_BACK = {json.dumps(svg_back, ensure_ascii=False)};
'''

# 在方案二代码之前插入
marker = '        // ============ 方案二：2D肌肉SVG + CSS 3D交互 ============'
pos = html.find(marker)

if pos > 0:
    html = html[:pos] + svg_constants + '\n\n' + html[pos:]
    print(f"SVG常量注入成功, 位置={pos}")
else:
    print("未找到方案二标记！")

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print(f"完成！文件大小={len(html)}")
