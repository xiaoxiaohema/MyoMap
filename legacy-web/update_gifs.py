#!/usr/bin/env python3
import json
import sys

with open('exercise_gifs.json', 'r', encoding='utf-8') as f:
    gif_map = json.load(f)

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

print("开始处理...")

# 1. 替换视频占位符为GIF显示
old_placeholder = '''<div class="exercise-video-placeholder" onclick="playVideo('${ex.name}')">
                        <div class="play-btn">
                            <span class="play-icon">▶</span>
                        </div>
                    </div>'''

new_placeholder = '''<div class="exercise-gif-container" onclick="playVideo('${ex.name}')">
                        ${ex.gif ? `<img src="${ex.gif}" alt="${ex.name}" class="exercise-gif" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">
                        <div class="exercise-video-placeholder" style="display:none">
                            <div class="play-btn">
                                <span class="play-icon">▶</span>
                            </div>
                        </div>` : `<div class="exercise-video-placeholder">
                            <div class="play-btn">
                                <span class="play-icon">▶</span>
                            </div>
                        </div>`}
                    </div>'''

if old_placeholder in html:
    html = html.replace(old_placeholder, new_placeholder)
    print("✓ 已替换视频占位符为GIF显示")
else:
    print("✗ 未找到视频占位符")

# 2. 添加GIF相关的CSS样式
old_css_marker = ".exercise-video-placeholder {"

new_css = """.exercise-gif-container {
            width: 100%;
            height: 180px;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            position: relative;
            overflow: hidden;
            border-radius: 8px 8px 0 0;
        }
        .exercise-gif {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        .exercise-gif-container:hover .exercise-gif {
            transform: scale(1.05);
            transition: transform 0.3s ease;
        }
        .exercise-video-placeholder {"""

if old_css_marker in html:
    html = html.replace(old_css_marker, new_css)
    print("✓ 已添加GIF CSS样式")
else:
    print("✗ 未找到CSS位置")

# 3. 简化playVideo函数 - 直接打开详情而不是视频弹窗
old_play_video = """function playVideo(name) {
            // 模拟视频播放弹窗
            const modal = document.createElement('div');
            modal.className = 'video-modal';
            modal.innerHTML = `
                <div class="video-modal-content">
                    <div class="video-modal-header">
                        <h3>${name}</h3>
                        <button onclick="this.closest('.video-modal').remove()">✕</button>
                    </div>
                    <div class="video-placeholder">
                        <div class="big-play-btn">
                            <span class="play-icon">▶</span>
                        </div>
                        <p>动作演示视频</p>
                    </div>
                </div>
            `;
            modal.onclick = (e) => {
                if (e.target === modal) modal.remove();
            };
            document.body.appendChild(modal);
        }"""

new_play_video = """function playVideo(name) {
            // 找到对应的动作详情
            for (const muscle in exerciseDB) {
                const ex = exerciseDB[muscle].find(e => e.name === name);
                if (ex) {
                    const modal = document.createElement('div');
                    modal.className = 'video-modal';
                    modal.innerHTML = `
                        <div class="video-modal-content">
                            <div class="video-modal-header">
                                <h3>${name}</h3>
                                <button onclick="this.closest('.video-modal').remove()">✕</button>
                            </div>
                            <div class="modal-gif-container">
                                ${ex.gif ? `<img src="${ex.gif}" alt="${ex.name}" class="modal-gif">` : `
                                <div class="video-placeholder">
                                    <div class="big-play-btn">
                                        <span class="play-icon">▶</span>
                                    </div>
                                    <p>暂无演示</p>
                                </div>`}
                            </div>
                            <div class="modal-info">
                                <div class="modal-info-row">
                                    <span class="modal-label">难度:</span>
                                    <span class="modal-value">${ex.difficulty}</span>
                                </div>
                                <div class="modal-info-row">
                                    <span class="modal-label">器械:</span>
                                    <span class="modal-value">${ex.equipment}</span>
                                </div>
                                <div class="modal-info-row">
                                    <span class="modal-label">组数:</span>
                                    <span class="modal-value">${ex.sets}</span>
                                </div>
                                <div class="modal-info-row">
                                    <span class="modal-label">次数:</span>
                                    <span class="modal-value">${ex.reps}</span>
                                </div>
                                <div class="modal-section">
                                    <h4>动作说明</h4>
                                    <p>${ex.instructions}</p>
                                </div>
                                <div class="modal-section">
                                    <h4>💡 训练技巧</h4>
                                    <p>${ex.tips}</p>
                                </div>
                            </div>
                        </div>
                    `;
                    modal.onclick = (e) => {
                        if (e.target === modal) modal.remove();
                    };
                    document.body.appendChild(modal);
                    return;
                }
            }
        }"""

if old_play_video in html:
    html = html.replace(old_play_video, new_play_video)
    print("✓ 已更新playVideo函数")
else:
    print("✗ 未找到playVideo函数")

# 4. 添加modal相关的新CSS
old_video_modal_css = ".video-placeholder {"

new_modal_css = """.modal-gif-container {
            width: 100%;
            max-height: 400px;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            border-radius: 8px;
            margin-bottom: 20px;
        }
        .modal-gif {
            width: 100%;
            max-height: 400px;
            object-fit: contain;
        }
        .modal-info {
            padding: 0 10px;
        }
        .modal-info-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        .modal-label {
            color: #888;
        }
        .modal-value {
            color: #fff;
            font-weight: 500;
        }
        .modal-section {
            margin-top: 15px;
        }
        .modal-section h4 {
            color: #00d4ff;
            margin-bottom: 8px;
        }
        .modal-section p {
            color: #ccc;
            line-height: 1.6;
        }
        .video-placeholder {"""

if old_video_modal_css in html:
    html = html.replace(old_video_modal_css, new_modal_css)
    print("✓ 已添加modal CSS样式")
else:
    print("✗ 未找到video-modal CSS位置")

# 5. 更新exerciseDB - 为每个动作添加gif字段
# 找到exerciseDB的位置并处理
start_marker = "const exerciseDB = {"
end_marker = "};"

start_idx = html.find(start_marker)
end_idx = html.find(end_marker, start_idx)

if start_idx != -1 and end_idx != -1:
    print(f"找到exerciseDB: 位置 {start_idx} - {end_idx}")
    
    # 提取当前DB内容
    db_content = html[start_idx + len(start_marker):end_idx]
    
    # 为每个动作添加gif字段
    # 用正则匹配每个动作对象
    import re
    
    # 匹配 name: '动作名' 的模式
    def add_gif_to_exercise(match):
        full_match = match.group(0)
        name_match = re.search(r"name:\s*'([^']+)'", full_match)
        if name_match:
            name = name_match.group(1)
            gif_url = gif_map.get(name, '')
            # 在name后添加gif字段
            full_match = full_match.replace(f"name: '{name}'", f"name: '{name}', gif: '{gif_url}'")
        return full_match
    
    # 匹配每个动作对象 { name: 'xxx', ... }
    pattern = r"\{[^}]*name:\s*'[^']+'[^}]*\}"
    new_db_content = re.sub(pattern, add_gif_to_exercise, db_content)
    
    new_html = html[:start_idx + len(start_marker)] + new_db_content + html[end_idx:]
    
    html = new_html
    print("✓ 已为exerciseDB添加gif字段")
else:
    print("✗ 未找到exerciseDB")

# 保存
with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print(f"\n处理完成，HTML大小: {len(html)} 字节")
