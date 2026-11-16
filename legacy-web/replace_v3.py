#!/usr/bin/env python3
"""替换index.html中的V2 3D代码为V3"""

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

with open('body_v3.js', 'r', encoding='utf-8') as f:
    v3_code = f.read()

start_marker = '        // ============ 3D人体模型 V2 - 更精致版本 ============'
end_marker = '        // 页面加载完成后初始化3D人体'

start_idx = html.find(start_marker)
end_idx = html.find(end_marker)

if start_idx == -1 or end_idx == -1:
    print(f"错误: 找不到标记。start={start_idx}, end={end_idx}")
    exit(1)

print(f"找到旧代码范围: {start_idx} - {end_idx}")

new_html = html[:start_idx] + v3_code + '\n\n        ' + html[end_idx:]

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(new_html)

print("替换完成!")
print(f"新文件大小: {len(new_html)} 字符")
