// ============================================================
//  MyoMap · AI 客户端 (ai-client.js)
//  接入 OpenAI 兼容协议的对话大模型（支持流式输出）
//  兼容：OpenAI / DeepSeek / 通义千问 / Moonshot / 智谱 GLM / 本地 Ollama 等
// ============================================================
window.MyAI = (function () {
  const KEY = 'myomap:ai';

  const PRESETS = {
    zhipu:    { label: '智谱 GLM-4-Flash（免费）', baseUrl: 'https://open.bigmodel.cn/api/paas/v4', model: 'glm-4-flash', visionModel: 'glm-4v-flash', free: true, register: 'https://open.bigmodel.cn/' },
    ollama:   { label: '本地 Ollama（免费·无需Key）', baseUrl: 'http://localhost:11434/v1',            model: 'qwen2.5',     visionModel: 'llava', free: true },
    deepseek: { label: 'DeepSeek',                baseUrl: 'https://api.deepseek.com/v1',                        model: 'deepseek-chat',   visionModel: '' },
    qwen:     { label: '通义千问',                 baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'qwen-plus',       visionModel: 'qwen-vl-plus' },
    openai:   { label: 'OpenAI',                  baseUrl: 'https://api.openai.com/v1',                          model: 'gpt-4o-mini',     visionModel: 'gpt-4o' },
    moonshot: { label: 'Moonshot',                baseUrl: 'https://api.moonshot.cn/v1',                         model: 'moonshot-v1-8k',  visionModel: 'moonshot-v1-8k-vision-preview' },
    custom:   { label: '自定义',                   baseUrl: '',                                                   model: '',                visionModel: '' }
  };
  const DEFAULT_PROVIDER = 'zhipu';

  const DEFAULT_SYSTEM = '你是 MyoMap 的专业健身助手，擅长训练方法、动作纠正、营养知识与伤病预防。回答要专业、简洁、可执行，用中文，适当分点。涉及医疗问题时提醒用户咨询专业人士。';
  const VISION_SYSTEM = '你是专业的营养师。用户会提供一张食物照片，请识别其中的食物种类与大致分量，估算热量与三大营养素。只输出 JSON，不要输出多余文字或代码块标记。';

  function getConfig() {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; }
  }
  function setConfig(c) {
    localStorage.setItem(KEY, JSON.stringify(c || {}));
    return getConfig();
  }
  function isConfigured() {
    const c = getConfig();
    return !!(c.baseUrl && c.model);
  }
  function isLocalBase(baseUrl) {
    return /localhost|127\.0\.0\.1|0\.0\.0\.0/i.test(baseUrl || '');
  }
  // 云端服务需要 API Key；本地 Ollama 可留空
  function needsKey() {
    const c = getConfig();
    return !!c.baseUrl && !isLocalBase(c.baseUrl);
  }
  function hasKey() {
    return !!getConfig().apiKey;
  }
  function providerLabel() {
    const c = getConfig();
    if (!c.baseUrl || !c.model) return '本地知识库';
    const p = PRESETS[c.provider];
    return (p ? p.label : '自定义') + ' · ' + c.model;
  }

  // 非流式 / 流式对话
  // messages: [{role, content}]
  // onDelta(piece, full): 流式回调（传入则启用 stream）
  // override: 临时配置（用于「测试连接」，不写入本地）
  async function chat(messages, onDelta, override) {
    const c = Object.assign(getConfig(), override || {});
    if (!c.baseUrl || !c.model) throw new Error('未配置 AI（请在「AI 设置」中填写）');
    if (!c.apiKey && !isLocalBase(c.baseUrl)) {
      throw new Error('未填写 API Key：该服务需要鉴权，请在「AI 设置」中填写 API Key');
    }
    const url = c.baseUrl.replace(/\/+$/, '') + '/chat/completions';
    const headers = { 'Content-Type': 'application/json' };
    if (c.apiKey) headers['Authorization'] = 'Bearer ' + c.apiKey;

    const sys = c.systemPrompt || DEFAULT_SYSTEM;
    const body = {
      model: c.model,
      messages: [{ role: 'system', content: sys }].concat(messages),
      temperature: typeof c.temperature === 'number' ? c.temperature : 0.7,
      stream: !!onDelta
    };

    let res;
    try {
      res = await fetch(url, { method: 'POST', headers: headers, body: JSON.stringify(body) });
    } catch (e) {
      throw new Error('网络请求失败：' + e.message + '（请检查 Base URL / 是否联网 / 是否跨域）');
    }
    if (!res.ok) {
      let t = '';
      try { t = await res.text(); } catch (e) {}
      throw new Error('HTTP ' + res.status + (t ? '：' + t.slice(0, 300) : ''));
    }

    if (!onDelta) {
      const j = await res.json();
      return (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || '';
    }

    // 流式解析 SSE
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = '', full = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop();
      for (let i = 0; i < lines.length; i++) {
        const s = lines[i].trim();
        if (!s || s.indexOf('data:') !== 0) continue;
        const data = s.slice(5).trim();
        if (data === '[DONE]') continue;
        try {
          const j = JSON.parse(data);
          const ch = j.choices && j.choices[0];
          const piece = ch && ((ch.delta && ch.delta.content) || (ch.message && ch.message.content));
          if (piece) { full += piece; onDelta(piece, full); }
        } catch (e) {}
      }
    }
    return full;
  }

  // 图片理解（多模态）：imageDataUrl 为 data:image/...;base64,... 或图片 URL
  async function vision(imageDataUrl, prompt, override) {
    const c = Object.assign(getConfig(), override || {});
    if (!c.baseUrl) throw new Error('未配置 AI（请在「AI 设置」中填写）');
    if (!c.apiKey && !isLocalBase(c.baseUrl)) {
      throw new Error('未填写 API Key：该服务需要鉴权，请在「AI 设置」中填写 API Key');
    }
    const model = c.visionModel || c.model;
    if (!model) throw new Error('未配置视觉模型（请在「AI 设置」中填写视觉模型）');
    const url = c.baseUrl.replace(/\/+$/, '') + '/chat/completions';
    const headers = { 'Content-Type': 'application/json' };
    if (c.apiKey) headers['Authorization'] = 'Bearer ' + c.apiKey;
    const body = {
      model: model,
      messages: [
        { role: 'system', content: VISION_SYSTEM },
        { role: 'user', content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: imageDataUrl } }
        ] }
      ],
      temperature: 0.2,
      stream: false
    };
    let res;
    try {
      res = await fetch(url, { method: 'POST', headers: headers, body: JSON.stringify(body) });
    } catch (e) {
      throw new Error('网络请求失败：' + e.message + '（请检查 Base URL / 是否联网 / 是否跨域）');
    }
    if (!res.ok) {
      let t = '';
      try { t = await res.text(); } catch (e) {}
      throw new Error('HTTP ' + res.status + (t ? '：' + t.slice(0, 300) : ''));
    }
    const j = await res.json();
    return (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || '';
  }

  // ====== 共享的「AI 设置」面板（供 ai.html / diet.html 等复用）======
  function openSetup(onSaved) {
    const C = window.Common;
    if (!C || !C.openModal) { alert('Common 未加载'); return; }
    const c = getConfig();
    const curProvider = c.provider || DEFAULT_PROVIDER;
    const def = PRESETS[curProvider] || PRESETS[DEFAULT_PROVIDER];
    const curBase = c.baseUrl || (def ? def.baseUrl : '');
    const curModel = c.model || (def ? def.model : '');
    const curVision = c.visionModel || (def ? def.visionModel : '');
    const presetOpts = Object.keys(PRESETS).map(function (k) {
      return '<option value="' + k + '"' + (k === curProvider ? ' selected' : '') + '>' + PRESETS[k].label + '</option>';
    }).join('');

    const m = C.openModal(
      '<div class="modal-title"><i class="ic" data-ic="sparkles"></i> AI 设置</div>' +
      '<div class="modal-sub">接入真实大模型（OpenAI 兼容协议）· 推荐免费的智谱 GLM</div>' +
      '<div class="field"><label class="label">服务商</label><select class="select" id="ai-provider">' + presetOpts + '</select></div>' +
      '<div class="field"><label class="label">Base URL</label><input class="input" id="ai-base" placeholder="https://open.bigmodel.cn/api/paas/v4" value="' + C.esc(curBase) + '"></div>' +
      '<div class="field"><label class="label">对话模型</label>' +
        '<div class="flex gap-8"><input class="input" id="ai-model" placeholder="glm-4-flash" value="' + C.esc(curModel) + '">' +
        '<button class="btn btn-ghost" id="ai-detect" style="white-space:nowrap;">检测本地模型</button></div>' +
        '<div class="mute" id="ai-detect-msg" style="font-size:11.5px;margin-top:6px;"></div>' +
      '</div>' +
      '<div class="field"><label class="label">视觉模型（饮食拍照识别用）</label><input class="input" id="ai-vision" placeholder="glm-4v-flash" value="' + C.esc(curVision) + '"></div>' +
      '<div class="field"><label class="label">API Key（本地 Ollama 可留空）</label><input class="input" id="ai-key" type="password" placeholder="智谱格式：xxxxx.yyyyy" value="' + C.esc(c.apiKey || '') + '"></div>' +
      '<div class="flex gap-8 items-center">' +
        '<button class="btn btn-ghost" id="ai-test">测试连接</button>' +
        '<span class="mute" id="ai-test-msg" style="font-size:12px;"></span>' +
      '</div>' +
      '<div class="card" style="background:rgba(46,204,113,0.07);border-color:rgba(46,204,113,0.22);padding:12px 14px;margin-top:14px;">' +
        '<div style="font-size:12.5px;line-height:1.85;color:var(--text-dim);">' +
          '<b style="color:#5fe08e;">推荐 · 免费方案</b><br>' +
          '① <b>智谱 GLM</b>：注册 <a href="https://open.bigmodel.cn/" target="_blank" style="color:var(--accent-2);">open.bigmodel.cn</a> 免费领取 API Key，' +
          '对话 <code style="background:rgba(255,255,255,.08);padding:1px 6px;border-radius:5px;">glm-4-flash</code>，' +
          '视觉 <code style="background:rgba(255,255,255,.08);padding:1px 6px;border-radius:5px;">glm-4v-flash</code>。<br>' +
          '② <b>本地 Ollama</b>：<code style="background:rgba(255,255,255,.08);padding:1px 6px;border-radius:5px;">ollama pull qwen2.5</code>，Base URL <code style="background:rgba(255,255,255,.08);padding:1px 6px;border-radius:5px;">http://localhost:11434/v1</code>，Key 留空。' +
        '</div>' +
      '</div>' +
      '<div class="flex gap-12" style="justify-content:space-between;margin-top:16px;">' +
        '<button class="btn btn-ghost" id="ai-reset">清除配置</button>' +
        '<span><button class="btn btn-ghost" id="ai-cancel">取消</button> <button class="btn btn-primary" id="ai-save">保存</button></span>' +
      '</div>', { large: true });

    const $ = function (id) { return m.el.querySelector('#' + id); };
    $('ai-provider').onchange = function () {
      const p = PRESETS[this.value];
      if (p) { $('ai-base').value = p.baseUrl; $('ai-model').value = p.model; $('ai-vision').value = p.visionModel || ''; }
    };
    $('ai-detect').onclick = async function () {
      const base = ($('ai-base').value || 'http://localhost:11434/v1').replace(/\/+$/, '');
      const root = base.replace(/\/v1$/, '');
      $('ai-detect-msg').textContent = '正在检测…';
      try {
        const res = await fetch(root + '/api/tags');
        const j = await res.json();
        const models = (j.models || []).map(function (x) { return x.name; });
        if (!models.length) { $('ai-detect-msg').textContent = '未发现本地模型，请先执行 ollama pull <模型>'; return; }
        $('ai-model').value = models[0];
        $('ai-detect-msg').innerHTML = '检测到 ' + models.length + ' 个模型：' +
          models.map(function (x) { return '<a href="javascript:;" data-mm="' + C.esc(x) + '" style="color:var(--accent-2);margin-right:8px;">' + C.esc(x) + '</a>'; }).join('');
        $('ai-detect-msg').querySelectorAll('[data-mm]').forEach(function (a) {
          a.onclick = function () { $('ai-model').value = a.dataset.mm; };
        });
      } catch (e) {
        $('ai-detect-msg').textContent = '检测失败：' + e.message + '（请确认 Ollama 已启动，或设置 OLLAMA_ORIGINS=*）';
      }
    };
    $('ai-test').onclick = async function () {
      const msg = $('ai-test-msg');
      msg.textContent = '测试中…';
      try {
        const ans = await chat([{ role: 'user', content: '请只回复“连接成功”四个字' }], null, {
          provider: $('ai-provider').value,
          baseUrl: $('ai-base').value.trim(),
          model: $('ai-model').value.trim(),
          apiKey: $('ai-key').value.trim()
        });
        msg.innerHTML = '<span style="color:#5fe08e;">✓ 连接成功：' + C.esc(String(ans).slice(0, 40)) + '</span>';
      } catch (e) {
        msg.innerHTML = '<span style="color:#ff8fa3;">✕ ' + C.esc(String(e.message).slice(0, 120)) + '</span>';
      }
    };
    $('ai-cancel').onclick = m.close;
    $('ai-reset').onclick = function () { setConfig({}); if (onSaved) onSaved(); m.close(); C.toast('已清除 AI 配置', 'ok'); };
    $('ai-save').onclick = function () {
      const provider = $('ai-provider').value;
      const baseUrl = $('ai-base').value.trim();
      const model = $('ai-model').value.trim();
      const visionModel = $('ai-vision').value.trim();
      const apiKey = $('ai-key').value.trim();
      if (!baseUrl || !model) { C.toast('请填写 Base URL 与对话模型', 'warn'); return; }
      const doSave = function () {
        setConfig({ provider: provider, baseUrl: baseUrl, model: model, visionModel: visionModel, apiKey: apiKey, systemPrompt: c.systemPrompt || '' });
        if (onSaved) onSaved();
        m.close();
        C.toast('AI 配置已保存', 'ok');
      };
      if (!apiKey && !isLocalBase(baseUrl)) {
        C.confirmModal('未填写 API Key', '该服务（如智谱 GLM）需要 API Key 才能调用。确定要在没有 Key 的情况下保存吗？', doSave, '仍要保存');
        return;
      }
      doSave();
    };
  }

  return { PRESETS, DEFAULT_PROVIDER, DEFAULT_SYSTEM, VISION_SYSTEM, getConfig, setConfig, isConfigured, isLocalBase, needsKey, hasKey, providerLabel, chat, vision, openSetup };
})();
