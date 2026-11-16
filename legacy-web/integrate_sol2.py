#!/usr/bin/env python3
"""整合方案二到index.html"""
import json

# 读取各部分
with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()
with open('svg_front.svg', 'r', encoding='utf-8') as f:
    svg_front = f.read().strip()
with open('svg_back.svg', 'r', encoding='utf-8') as f:
    svg_back = f.read().strip()
with open('gen_solution2.py', 'r', encoding='utf-8') as f:
    gen_code = f.read()

# 从gen_solution2.py中提取CSS和JS代码块
# 提取CSS
css_start = gen_code.find("css_code = '''") + len("css_code = '''")
css_end = gen_code.find("'''", css_start)
css_code = gen_code[css_start:css_end]

# 提取JS
js_start = gen_code.find("js_code = '''") + len("js_code = '''")
js_end = gen_code.find("'''", js_start)
js_code = gen_code[js_start:js_end]

# ========== 1. 替换CSS部分 ==========
# 找旧CSS的范围
old_css_start = html.find('.body-3d-container {')
# 找到 .muscle-tooltip::after 块结束
after_tooltip = html.find('.muscle-tooltip::after {')
tooltip_end = html.find('}', after_tooltip)
# 再往后找 } 直到结束muscle相关CSS
old_css_end = html.find('\n        /* 隐藏类 */', tooltip_end)
if old_css_end == -1:
    old_css_end = html.find('\n        /* 选中提示 */', tooltip_end)
if old_css_end == -1:
    # 找 body-3d-container canvas 块结束
    canvas_block = html.find('.body-3d-container canvas {')
    old_css_end = html.find('}', canvas_block) + 1

print(f"CSS替换范围: {old_css_start} ~ {old_css_end}")
if old_css_start > 0 and old_css_end > old_css_start:
    html = html[:old_css_start] + css_code + html[old_css_end:]
    print("CSS替换成功")
else:
    print("CSS范围未找到，跳过CSS替换")

# ========== 2. 移除Three.js引用 ==========
html_lines = html.split('\n')
new_lines = []
for line in html_lines:
    if 'three.min.js' in line or 'OrbitControls.js' in line:
        print(f"移除Three.js引用: {line.strip()[:60]}")
        continue
    new_lines.append(line)
html = '\n'.join(new_lines)

# ========== 3. 注入SVG常量 ==========
# 在 <script> 标签开始前（或body末尾）注入SVG_FRONT和SVG_BACK
# 找到 init3DBody 前面的合适位置
svg_constants = f'''
        // SVG肌肉图常量
        const SVG_FRONT = {json.dumps(svg_front, ensure_ascii=False)};
        const SVG_BACK = {json.dumps(svg_back, ensure_ascii=False)};
'''

# 在 function init3DBody() 之前插入
init_func_pos = html.find('function init3DBody()')
if init_func_pos > 0:
    # 往前找合适换行插入
    insert_pos = html.rfind('\n', 0, init_func_pos)
    insert_pos = html.rfind('\n', 0, insert_pos)
    html = html[:insert_pos] + svg_constants + html[insert_pos:]
    print("SVG常量注入成功")
else:
    print("未找到init3DBody函数")

# ========== 4. 替换旧的3D JS代码 ==========
# 找旧3D代码范围：从 3D人体模型 VX 标记到 页面加载完成后初始化3D人体 之前
markers = [
    '// ============ 3D人体模型 V6 - 皮肤肌肉双层版 ============',
    '// ============ 3D人体模型 V5 - 流畅自然版 ============',
    '// ============ 3D人体模型 V4 - 自然精致版 ============',
    '// ============ 3D人体模型 V3 - 精致版 ============',
    '// ============ 3D人体模型 V2 - 更精致版本 ============',
]

js_start_idx = -1
for mk in markers:
    js_start_idx = html.find(mk)
    if js_start_idx > 0:
        print(f"找到旧3D标记: {mk.strip()}")
        break

end_marker = '// 页面加载完成后初始化3D人体'
js_end_idx = html.find(end_marker)

if js_start_idx > 0 and js_end_idx > js_start_idx:
    print(f"JS替换范围: {js_start_idx} ~ {js_end_idx}")
    html = html[:js_start_idx] + js_code + '\n\n        ' + html[js_end_idx:]
    print("3D JS替换成功")
else:
    print(f"未找到旧JS范围 start={js_start_idx} end={js_end_idx}")

# ========== 5. 保存 ==========
with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print(f"\n✅ 整合完成！最终文件大小: {len(html)} 字符")
