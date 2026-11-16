#!/usr/bin/env python3
"""替换为V5"""

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

with open('body_v5.js', 'r', encoding='utf-8') as f:
    v5_code = f.read()

markers = [
    '        // ============ 3D人体模型 V4 - 自然精致版 ============',
    '        // ============ 3D人体模型 V3 - 精致版 ============',
    '        // ============ 3D人体模型 V2 - 更精致版本 ============',
]

start_idx = -1
for mk in markers:
    start_idx = html.find(mk)
    if start_idx != -1:
        break

end_marker = '        // 页面加载完成后初始化3D人体'
end_idx = html.find(end_marker)

if start_idx == -1 or end_idx == -1:
    print(f"错误: 找不到标记。start={start_idx}, end={end_idx}")
    exit(1)

print(f"找到旧代码范围: {start_idx} - {end_idx}")

new_html = html[:start_idx] + v5_code + '\n\n        ' + html[end_idx:]

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(new_html)

print("V5替换完成!")
