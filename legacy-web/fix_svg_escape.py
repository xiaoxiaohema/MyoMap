#!/usr/bin/env python3
"""修复：用反引号模板字符串包裹SVG"""

import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

with open('svg_front.svg', 'r', encoding='utf-8') as f:
    svg_front = f.read().strip()
with open('svg_back.svg', 'r', encoding='utf-8') as f:
    svg_back = f.read().strip()

# 转义模板字符串中的反引号和${}
def esc_for_template(s):
    s = s.replace('`', '\\`')
    s = s.replace('${', '\\${')
    return s

front_const = f'const SVG_FRONT = `{esc_for_template(svg_front)}`;'
back_const = f'const SVG_BACK = `{esc_for_template(svg_back)}`;'

# 替换SVG_FRONT常量
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

print(f"修复完成！文件大小: {len(html)}")
