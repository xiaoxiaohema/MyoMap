#!/usr/bin/env python3
"""替换index.html中的SVG_FRONT和SVG_BACK常量"""
import json, re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

with open('svg_front.svg', 'r', encoding='utf-8') as f:
    svg_front = f.read().strip()
with open('svg_back.svg', 'r', encoding='utf-8') as f:
    svg_back = f.read().strip()

front_const = f'const SVG_FRONT = {json.dumps(svg_front, ensure_ascii=False)};'
back_const = f'const SVG_BACK = {json.dumps(svg_back, ensure_ascii=False)};'

# 用正则替换SVG_FRONT和SVG_BACK常量
html = re.sub(
    r'const SVG_FRONT = .*?;',
    front_const,
    html,
    count=1,
    flags=re.DOTALL
)
html = re.sub(
    r'const SVG_BACK = .*?;',
    back_const,
    html,
    count=1,
    flags=re.DOTALL
)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print(f"替换完成！文件大小: {len(html)}")
