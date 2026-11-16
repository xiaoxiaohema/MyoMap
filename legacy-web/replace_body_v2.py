#!/usr/bin/env python3
"""
替换3D人体代码为V2版本
"""

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

print(f"原始HTML大小: {len(html)}")

# 找到旧的3D代码块
start_marker = '    // ============ 3D人体模型 ============'
end_marker = '        // 页面加载完成后初始化3D人体'

start_idx = html.find(start_marker)
end_idx = html.find(end_marker)

if start_idx != -1 and end_idx != -1:
    print(f"找到旧代码位置: {start_idx} - {end_idx}")
    
    # 读取新代码
    with open('body_v2.js', 'r', encoding='utf-8') as f:
        new_code = f.read()
    
    # 替换
    html = html[:start_idx] + new_code + '\n' + html[end_idx:]
    print("✓ 已替换为V2版本")
else:
    print(f"✗ 未找到代码位置 (start: {start_idx}, end: {end_idx})")

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print(f"新HTML大小: {len(html)}")
