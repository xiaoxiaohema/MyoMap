#!/usr/bin/env python3
"""
将SVG人体替换为3D人体模型
"""

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

print(f"原始HTML大小: {len(html)}")

# 1. 替换视图切换按钮 - 3D模型不需要前/后视图切换
old_view_switcher = '''            <!-- 视图切换 -->
            <div class="view-switcher">
                <button class="view-btn active" onclick="setView('front')">正面视图</button>
                <button class="view-btn" onclick="setView('back')">背面视图</button>
            </div>'''

new_view_switcher = '''            <!-- 3D视图说明 -->
            <div class="view-switcher">
                <div style="color:#888;font-size:13px;text-align:center;padding:8px;">
                    🖱️ 拖动旋转 · 滚轮缩放 · 点击选择
                </div>
            </div>'''

if old_view_switcher in html:
    html = html.replace(old_view_switcher, new_view_switcher)
    print("✓ 已替换视图切换按钮")
else:
    print("✗ 未找到视图切换按钮")

# 2. 替换SVG容器为3D容器
# 找到开始和结束标记
start_marker = '            <!-- 人体SVG -->'
end_marker = '                <div id="label-layer"></div>\n            </div>'

start_idx = html.find(start_marker)
end_idx = html.find(end_marker)

if start_idx != -1 and end_idx != -1:
    end_idx += len(end_marker)
    
    new_body = '''            <!-- 3D人体模型 -->
            <div class="body-3d-container" id="body-3d-container">
                <div class="controls-hint">🖱️ 拖动旋转 · 滚轮缩放 · 点击肌肉选择</div>
            </div>
            <div class="muscle-tooltip" id="muscle-tooltip"></div>'''
    
    html = html[:start_idx] + new_body + html[end_idx:]
    print(f"✓ 已替换SVG容器为3D容器 (位置: {start_idx}-{end_idx})")
else:
    print(f"✗ 未找到SVG容器 (start: {start_idx}, end: {end_idx})")

# 3. 在JS代码末尾添加3D人体初始化代码
# 找到 </script> 标签（最后一个）
script_end = html.rfind('</script>')

if script_end != -1:
    # 读取3D JS代码
    with open('three_body_code.txt', 'r', encoding='utf-8') as f:
        code_content = f.read()
    
    # 提取JS部分
    js_start = code_content.find('=== JS_3D_BODY ===')
    if js_start != -1:
        js_code = code_content[js_start + len('=== JS_3D_BODY ==='):].strip()
        
        # 在最后一个</script>前插入初始化调用和3D代码
        init_code = '''
        // 页面加载完成后初始化3D人体
        window.addEventListener('load', function() {
            setTimeout(init3DBody, 500);
        });
'''
        
        # 找到合适的位置插入 - 在最后一个script结束前
        insert_pos = script_end
        
        html = html[:insert_pos] + js_code + init_code + '\n' + html[insert_pos:]
        print(f"✓ 已添加3D人体JS代码 (位置: {insert_pos})")
    else:
        print("✗ 未找到JS_3D_BODY标记")
else:
    print("✗ 未找到</script>标签")

# 保存
with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print(f"\n新HTML大小: {len(html)}")
print("处理完成！")
