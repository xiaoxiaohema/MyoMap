// ============================================================
//  MyoMap · 公共运行时 (common.js)
//  导航外壳 / 会话 / 公式 / API / 提示 / 动作库工具 / 食物库
// ============================================================
window.Common = (function () {

  // ---------- 导航配置 ----------
  // public: true 表示免登录可访问（SRS FR-01-04：首页与动作库游客可浏览）
  // icon 为 icons.js 中的图标名
  const NAV = [
    { group: '训练', items: [
      { key: 'home',    href: 'index.html',   icon: 'home',      label: '首页',     public: true },
      { key: 'library', href: 'library.html', icon: 'dumbbell',  label: '动作库',   public: true },
      { key: 'plan',    href: 'plan.html',    icon: 'clipboard', label: '训练计划' },
      { key: 'workout', href: 'workout.html', icon: 'timer',     label: '训练记录' }
    ]},
    { group: '健康', items: [
      { key: 'body',  href: 'body.html', icon: 'chart',     label: '身体数据' },
      { key: 'diet',  href: 'diet.html', icon: 'nutrition', label: '饮食规划' },
      { key: 'map',   href: 'map.html',  icon: 'map',       label: '地图行程' }
    ]},
    { group: '智能', items: [
      { key: 'ai',     href: 'ai.html',     icon: 'sparkles', label: 'AI 助手' },
      { key: 'device', href: 'device.html', icon: 'watch',    label: '智能设备' }
    ]},
    { group: '账户', items: [
      { key: 'profile', href: 'profile.html', icon: 'user', label: '我的档案' }
    ]}
  ];
  function isPublicKey(key) {
    for (const g of NAV) for (const it of g.items) if (it.key === key) return !!it.public;
    return false;
  }

  const API_DEFAULT = 'http://localhost:8081';

  // ---------- 小工具 ----------
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function round(v, n) { const p = Math.pow(10, n || 1); return Math.round(v * p) / p; }
  function debounce(fn, wait) {
    let t; return function () { const a = arguments, c = this; clearTimeout(t); t = setTimeout(() => fn.apply(c, a), wait || 250); };
  }
  function fmtDate(s) {
    if (!s) return '';
    const d = new Date(s.length <= 10 ? s + 'T00:00:00' : s);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function fmtDateTime(s) {
    const d = new Date(s);
    return fmtDate(s) + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }
  function ageFromBirth(birth) {
    if (!birth) return 25;
    const b = new Date(birth), n = new Date();
    let a = n.getFullYear() - b.getFullYear();
    const m = n.getMonth() - b.getMonth();
    if (m < 0 || (m === 0 && n.getDate() < b.getDate())) a--;
    return clamp(a, 10, 100);
  }

  // ---------- 公式 (SRS 附录 A/B/C) ----------
  const ACTIVITY = [
    { v: 1.2,   label: '久坐（几乎不运动）' },
    { v: 1.375, label: '轻度活动（每周 1-3 次）' },
    { v: 1.55,  label: '中度活动（每周 3-5 次）' },
    { v: 1.725, label: '重度活动（每周 6-7 次）' },
    { v: 1.9,   label: '极重度（体力劳动/一天两练）' }
  ];

  function calcBMI(weightKg, heightCm) {
    if (!weightKg || !heightCm) return null;
    const h = heightCm / 100;
    return round(weightKg / (h * h), 1);
  }
  function bmiCategory(bmi) {
    if (bmi == null) return { label: '—', cls: '' };
    if (bmi < 18.5) return { label: '偏瘦', cls: 'tag-blue' };
    if (bmi < 24)   return { label: '正常', cls: 'tag-green' };
    if (bmi < 28)   return { label: '超重', cls: 'tag-yellow' };
    return { label: '肥胖', cls: 'tag-red' };
  }
  // Mifflin-St Jeor
  function calcBMR(profile) {
    const w = Number(profile.weight), h = Number(profile.height), age = ageFromBirth(profile.birthdate);
    if (!w || !h) return null;
    const base = 10 * w + 6.25 * h - 5 * age;
    return Math.round(profile.gender === 'female' ? base - 161 : base + 5);
  }
  function calcTDEE(profile) {
    const bmr = calcBMR(profile);
    if (!bmr) return null;
    return Math.round(bmr * (Number(profile.activity) || 1.375));
  }
  // Epley: 1RM = w * (1 + reps/30)
  function calc1RM(weight, reps) {
    if (!weight || !reps) return null;
    return round(weight * (1 + reps / 30), 1);
  }
  // Brzycki: 1RM = w / (1.0278 - 0.0278*reps)
  function calc1RMBrzycki(weight, reps) {
    if (!weight || !reps || reps >= 37) return null;
    return round(weight / (1.0278 - 0.0278 * reps), 1);
  }
  // 营养目标 (FR-05-01/02)
  function macroTargets(profile) {
    const tdee = calcTDEE(profile) || 2200;
    const w = Number(profile.weight) || 70;
    let kcal, pRatio;
    if (profile.goal === '减脂') { kcal = tdee - 400; pRatio = 2.1; }
    else if (profile.goal === '增肌') { kcal = tdee + 250; pRatio = 1.8; }
    else { kcal = tdee; pRatio = 1.4; }
    const protein = Math.round(pRatio * w);
    const fat = Math.round((profile.goal === '减脂' ? 0.9 : 1.0) * w);
    const carb = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
    return { kcal: Math.round(kcal), protein, fat, carb };
  }

  // ---------- 会话 / 用户 ----------
  function ensureSession() {
    if (!localStorage.getItem(Store.KEYS.session)) Store.loginAsGuest();
    Store.seedDemo();
  }
  function userInitial() { return (Store.currentUser().username || '游').slice(0, 1).toUpperCase(); }
  function userLabel() { return Store.currentUser().username; }

  // ---------- 提示 ----------
  function toast(msg, type, ms) {
    let wrap = document.getElementById('toast-wrap');
    if (!wrap) { wrap = document.createElement('div'); wrap.id = 'toast-wrap'; document.body.appendChild(wrap); }
    const el = document.createElement('div');
    el.className = 'toast ' + (type || '');
    el.textContent = msg;
    wrap.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateX(40px)'; el.style.transition = 'all .3s'; }, (ms || 2600) - 300);
    setTimeout(() => el.remove(), ms || 2600);
  }

  function openModal(html, opts) {
    opts = opts || {};
    const overlay = document.createElement('div');
    overlay.className = 'overlay show';
    overlay.innerHTML = '<div class="modal ' + (opts.large ? 'modal-lg' : '') + '">' +
      '<button class="modal-close">×</button>' + html + '</div>';
    document.body.appendChild(overlay);
    const close = () => { overlay.classList.remove('show'); setTimeout(() => overlay.remove(), 280); };
    overlay.querySelector('.modal-close').onclick = close;
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    return { el: overlay, close };
  }
  function confirmModal(title, message, onOk, okText) {
    const m = openModal(
      '<div class="modal-title">' + esc(title) + '</div>' +
      '<div class="modal-sub">' + esc(message) + '</div>' +
      '<div class="flex gap-12" style="justify-content:flex-end;margin-top:8px;">' +
        '<button class="btn btn-ghost" data-x>取消</button>' +
        '<button class="btn btn-primary" data-ok>' + esc(okText || '确定') + '</button>' +
      '</div>');
    m.el.querySelector('[data-x]').onclick = m.close;
    m.el.querySelector('[data-ok]').onclick = () => { m.close(); onOk && onOk(); };
  }

  // ---------- API (后端可选，失败时本地降级) ----------
  function apiBase() {
    const saved = localStorage.getItem('myomap:api');
    if (saved) return saved;
    if (window.MYOMAP_API_BASE) return window.MYOMAP_API_BASE;
    const host = location.hostname;
    const port = location.port;
    // 本地访问：直连后端 8081
    if (host === 'localhost' || host === '127.0.0.1' || host === '') return API_DEFAULT;
    // 标准端口（80/443）视为反向代理部署 → 同源 /api
    if (port === '' || port === '80' || port === '443') return location.origin + '/api';
    // 局域网/外部设备访问（如 192.168.x.x:8799）→ 同主机的后端 8081
    return location.protocol + '//' + host + ':8081';
  }
  async function api(path, method, body) {
    const headers = { 'Content-Type': 'application/json' };
    const s = Store.currentUser();
    const tk = Store.token();
    if (tk) headers['Authorization'] = 'Bearer ' + tk;
    else if (s && s.id && s.id !== 'guest') headers['Authorization'] = s.id; // 兼容旧会话
    const opt = { method: method || 'GET', headers };
    if (body) opt.body = JSON.stringify(body);
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 4000);
    try {
      const res = await fetch(apiBase() + path, Object.assign(opt, { signal: ctrl.signal }));
      clearTimeout(timer);
      return await res.json();
    } catch (e) {
      clearTimeout(timer);
      throw e;
    }
  }
  // 优先后端，失败返回 null（调用方走本地逻辑）
  async function apiOrNull(path, method, body) {
    try { return await api(path, method, body); } catch (e) { return null; }
  }

  // ---------- 动作库工具 (FM-03.3) ----------
  function allExercises() {
    const base = window.MYOMAP_EXERCISES || [];
    const custom = Store.getCustomExercises();
    return base.concat(custom);
  }
  const MUSCLE_GROUPS = ['胸大肌','背阔肌','斜方肌','中背部','下背部','肩前束','肩后束','肱二头肌','肱三头肌','前臂肌群','腹直肌','腹外斜肌','股四头肌','腘绳肌','臀大肌','内收肌群','小腿肌群','头'];
  const EQUIPMENTS = ['无','杠铃','哑铃','绳索机','器械','单杠','弹力带','壶铃','史密斯机','其他'];
  const DIFFICULTIES = ['初级','中级','高级'];

  function searchExercises(opts) {
    opts = opts || {};
    const q = (opts.q || '').trim().toLowerCase();
    return allExercises().filter(ex => {
      if (opts.muscle && ex.muscle !== opts.muscle) return false;
      if (opts.difficulty && ex.difficulty !== opts.difficulty) return false;
      if (opts.bodyPart && ex.bodyPart !== opts.bodyPart) return false;
      if (opts.equipment && (ex.equipment || '').indexOf(opts.equipment) === -1) return false;
      if (q) {
        const hay = (ex.name + ' ' + (ex.en || '') + ' ' + (ex.muscle || '') + ' ' + (ex.equipment || '')).toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });
  }
  function exercisesByMuscle(muscle) { return allExercises().filter(e => e.muscle === muscle); }
  // 复合动作优先排序 (FR-02-07)
  const COMPOUND_TYPES = ['蹲', '拉', '推', '举'];
  function sortByCompound(list) {
    return list.slice().sort((a, b) => {
      const ca = COMPOUND_TYPES.indexOf(a.type) >= 0 ? 0 : 1;
      const cb = COMPOUND_TYPES.indexOf(b.type) >= 0 ? 0 : 1;
      return ca - cb;
    });
  }
  function findExercise(name) { return allExercises().find(e => e.name === name); }

  // ---------- 食物营养库 (FM-05，每 100g) ----------
  const FOOD_DB = {
    '鸡蛋': { kcal: 143, protein: 13, carb: 1.1, fat: 9.5, unit: '个(约50g)', per: 50 },
    '鸡胸肉': { kcal: 133, protein: 31, carb: 0, fat: 3.6 },
    '鸡腿': { kcal: 181, protein: 24, carb: 0, fat: 9 },
    '牛肉': { kcal: 125, protein: 20, carb: 0, fat: 4.2 },
    '猪里脊': { kcal: 155, protein: 20, carb: 1, fat: 8 },
    '三文鱼': { kcal: 208, protein: 20, carb: 0, fat: 13 },
    '虾': { kcal: 99, protein: 24, carb: 0.2, fat: 0.3 },
    '牛奶': { kcal: 54, protein: 3, carb: 3.4, fat: 3.2, unit: '杯(约250ml)', per: 250 },
    '酸奶': { kcal: 72, protein: 2.5, carb: 9.3, fat: 2.7 },
    '全麦面包': { kcal: 247, protein: 13, carb: 41, fat: 3.4, unit: '片(约35g)', per: 35 },
    '米饭': { kcal: 116, protein: 2.6, carb: 25.9, fat: 0.3 },
    '面条': { kcal: 138, protein: 4.5, carb: 28, fat: 0.5 },
    '燕麦': { kcal: 389, protein: 16.9, carb: 66, fat: 6.9 },
    '红薯': { kcal: 86, protein: 1.6, carb: 20, fat: 0.1 },
    '土豆': { kcal: 77, protein: 2, carb: 17, fat: 0.1 },
    '西兰花': { kcal: 34, protein: 2.8, carb: 7, fat: 0.4 },
    '菠菜': { kcal: 23, protein: 2.9, carb: 3.6, fat: 0.4 },
    '生菜': { kcal: 15, protein: 1.4, carb: 2.9, fat: 0.2 },
    '番茄': { kcal: 18, protein: 0.9, carb: 3.9, fat: 0.2 },
    '黄瓜': { kcal: 15, protein: 0.7, carb: 3.6, fat: 0.1 },
    '牛油果': { kcal: 160, protein: 2, carb: 9, fat: 15 },
    '香蕉': { kcal: 89, protein: 1.1, carb: 23, fat: 0.3, unit: '根(约120g)', per: 120 },
    '苹果': { kcal: 52, protein: 0.3, carb: 14, fat: 0.2, unit: '个(约200g)', per: 200 },
    '蓝莓': { kcal: 57, protein: 0.7, carb: 14, fat: 0.3 },
    '坚果': { kcal: 607, protein: 20, carb: 21, fat: 54 },
    '花生酱': { kcal: 588, protein: 25, carb: 20, fat: 50 },
    '橄榄油': { kcal: 884, protein: 0, carb: 0, fat: 100 },
    '豆腐': { kcal: 76, protein: 8, carb: 1.9, fat: 4.8 },
    '豆浆': { kcal: 33, protein: 3, carb: 1.2, fat: 1.6, unit: '杯(约250ml)', per: 250 },
    '蛋白粉': { kcal: 375, protein: 75, carb: 10, fat: 5, unit: '勺(约30g)', per: 30 },
    '白切鸡': { kcal: 167, protein: 19, carb: 1, fat: 9 },
    '拉面': { kcal: 138, protein: 4.5, carb: 28, fat: 0.5 },
    '披萨': { kcal: 266, protein: 11, carb: 33, fat: 10 },
    '汉堡': { kcal: 295, protein: 17, carb: 24, fat: 14 },
    '可乐': { kcal: 43, protein: 0, carb: 11, fat: 0, unit: '罐(约330ml)', per: 330 },
    '啤酒': { kcal: 43, protein: 0.5, carb: 3.6, fat: 0, unit: '罐(约330ml)', per: 330 }
  };
  function lookupFood(name) {
    if (!name) return null;
    const key = name.trim();
    if (FOOD_DB[key]) return { name: key, data: FOOD_DB[key] };
    const k = Object.keys(FOOD_DB).find(x => key.indexOf(x) >= 0 || x.indexOf(key) >= 0);
    return k ? { name: k, data: FOOD_DB[k] } : null;
  }

  // ---------- 本地 AI 兜底 (后端不可用时) ----------
  const AI_KB = [
    { k: ['增肌', '长肌肉', '变壮'], a: '增肌三要素：① 渐进超负荷——每周逐步增加重量或次数；② 热量盈余——每日比 TDEE 多摄入 200-300 kcal；③ 蛋白质充足——每公斤体重 1.6-2.2g。建议以复合动作（深蹲、硬拉、卧推、划船）为主，每周训练 3-5 次，保证 7-9 小时睡眠。' },
    { k: ['减脂', '减肥', '掉秤'], a: '减脂核心是热量缺口：每日比 TDEE 少 300-500 kcal，配合力量训练保住肌肉、有氧提升消耗。蛋白质保持每公斤体重 2.0-2.2g 以减少肌肉流失。每周减重 0.5-1% 体重是可持续的速度。' },
    { k: ['深蹲', '膝盖', '膝'], a: '深蹲膝盖疼常见原因：① 膝盖内扣——注意膝盖与脚尖同向；② 深度过大超出活动度；③ 重量过大导致代偿。建议先降低重量，做箱式深蹲控制深度，加强臀中肌（髋外展）与踝关节活动度训练。若持续疼痛请就医。' },
    { k: ['卧推', '瓶颈', '平台'], a: '突破卧推瓶颈：① 增加三头与肩前束的辅助训练（窄距卧推、推举）；② 采用周期化训练，安排减载周；③ 提升训练容量（每周 10-20 组胸部）；④ 注意肩胛稳定与腿部驱动。' },
    { k: ['硬拉', '腰', '背'], a: '硬拉护腰要点：① 起始时杠铃贴近小腿，背部中立不弓；② 用腿蹬地而非用腰拉起；③ 核心全程绷紧，可配合瓦式呼吸；④ 大重量使用腰带。腰背酸胀正常，刺痛需立即停止。' },
    { k: ['蛋白质', '吃多少'], a: '蛋白质建议：增肌 1.6-2.2g/kg 体重，减脂 2.0-2.2g/kg，维持 1.2-1.6g/kg。优质来源：鸡胸、牛肉、鱼虾、鸡蛋、牛奶、豆制品、蛋白粉。单次摄入 20-40g 吸收效率较佳，建议分 3-5 餐。' },
    { k: ['休息', '睡眠', '恢复'], a: '肌肉在休息时生长。建议每晚 7-9 小时睡眠，同一肌群训练间隔 48 小时。过度训练信号：静息心率升高、力量下降、情绪低落、睡眠变差——此时应安排减载周。' },
    { k: ['热身', '拉伸'], a: '训练前做 5-10 分钟动态热身（关节活动 + 轻重量热身组），训练后做静态拉伸 5-10 分钟。热身可提升表现并降低受伤风险。' },
    { k: ['有氧', '跑步', ' cardio'], a: '有氧建议：减脂期每周 3-5 次、每次 30-45 分钟中等强度（心率储备 60-70%），或 2-3 次 HIIT。力量训练后做有氧可减少干扰效应。' },
    { k: ['新手', '入门', '开始'], a: '新手建议从全身训练开始，每周 3 次，每次 6-8 个复合动作，每个动作 3 组 × 8-12 次。先掌握动作模式再增加重量，前 4-6 周以学习动作为主。' }
  ];
  function localAI(question) {
    const q = (question || '').toLowerCase();
    for (const item of AI_KB) {
      if (item.k.some(k => q.indexOf(k.toLowerCase()) >= 0)) return item.a;
    }
    return '这是一个很好的健身问题。一般来说，建议遵循「渐进超负荷 + 充足蛋白质 + 规律睡眠」三大原则。你可以问我关于增肌、减脂、具体动作（深蹲/卧推/硬拉）、营养分配或训练恢复的问题，我会给出更具体的建议。\n\n（提示：AI 建议仅供参考，请根据自身情况调整；如有伤病请咨询专业人士。）';
  }

  // ---------- 免责声明 (SRS C-05/C-06) ----------
  function ensureDisclaimer() {
    const s = Store.getSettings();
    if (s.disclaimerAccepted) return;
    const m = openModal(
      '<div class="modal-title">' + icon('alert', 18) + ' 免责声明</div>' +
      '<div class="modal-sub">使用本系统前请阅读</div>' +
      '<div style="font-size:13.5px;line-height:1.85;color:var(--text-dim);">' +
        '1. 本系统提供的训练计划、饮食建议均由算法/AI 生成，属于<b style="color:var(--text)">建议性内容</b>，请根据自身情况调整。<br>' +
        '2. 本系统<b style="color:var(--text)">不提供医疗建议</b>，所有健康数据仅供参考。<br>' +
        '3. 如患有疾病或有伤病史，请在专业人士指导下训练。<br>' +
        '4. 所有数据默认仅保存在本地浏览器，保护你的隐私。' +
      '</div>' +
      '<div style="margin-top:20px;text-align:right;">' +
        '<button class="btn btn-primary" data-ok>我已了解并同意</button>' +
      '</div>');
    m.el.querySelector('[data-ok]').onclick = () => { Store.saveSettings({ disclaimerAccepted: true }); m.close(); };
  }

  // ---------- 外观主题切换 ----------
  function themeModal() {
    const cur = window.MyTheme ? MyTheme.current() : 'dark';
    const list = window.MyTheme ? MyTheme.themes : [{ id: 'dark', name: '暗夜橙', desc: '默认' }];
    const items = list.map(function (t) {
      return '<button class="theme-opt' + (t.id === cur ? ' active' : '') + '" data-theme-id="' + t.id + '">' +
        '<span class="theme-dot" data-dot="' + t.id + '"></span>' +
        '<span class="theme-meta"><b>' + esc(t.name) + '</b><small>' + esc(t.desc) + '</small></span>' +
        (t.id === cur ? '<i class="ic" data-ic="check"></i>' : '') +
      '</button>';
    }).join('');
    const m = openModal(
      '<div class="modal-title">' + icon('palette', 18) + ' 外观主题</div>' +
      '<div class="modal-sub">选择界面配色，立即生效并自动保存</div>' +
      '<div class="theme-grid">' + items + '</div>'
    );
    m.el.querySelectorAll('.theme-opt').forEach(function (b) {
      b.onclick = function () {
        if (window.MyTheme) MyTheme.apply(b.dataset.themeId);
        m.close();
        toast('已切换主题：' + (window.MyTheme ? MyTheme.label(b.dataset.themeId) : ''), 'ok');
      };
    });
    hydrateIcons();
  }

  // ---------- 动作指导 ----------
  // 按动作类型给出的通用指导（与每个动作自身的说明/要点组合）
  const GUIDE = {
    setup: {
      '推': '仰卧或坐稳，肩胛后缩下沉，握距略宽于肩，核心收紧。',
      '拉': '躯干保持稳定，先下沉肩胛再收缩背部，避免耸肩。',
      '蹲': '双脚与肩同宽、脚尖略外展，核心收紧，背部保持中立。',
      '举': '身体直立、核心收紧，避免挺腰借力。',
      '弯举': '肘部固定于体侧，手腕保持中立。',
      '卷腹': '下背部贴紧地面，核心主动发力。',
      '拉伸': '动作缓慢、呼吸均匀，拉到有牵拉感即可，不追求疼痛。'
    },
    breath: {
      '推': '推起（发力）时呼气，下放时吸气。',
      '拉': '拉近身体时呼气，还原时吸气。',
      '蹲': '下蹲时吸气，站起时呼气。',
      '举': '上举时呼气，下放时吸气。',
      '弯举': '弯举时呼气，下放时吸气。',
      '卷腹': '卷起时呼气，还原时吸气。',
      '拉伸': '保持自然呼吸，呼气时略微加深拉伸。'
    },
    mistakes: {
      '推': ['肘部过度外展（约 45° 为宜）', '耸肩、肩胛未稳定', '下放过快失去控制'],
      '拉': ['用惯性摆动借力', '耸肩、只用手臂发力', '背部未收紧、弓背'],
      '蹲': ['膝盖内扣', '脚跟离地', '弓背或躯干过度前倾'],
      '举': ['身体摆动借力', '腰部代偿挺腰', '动作幅度不足'],
      '弯举': ['肘部前后移动', '身体后仰借力', '下放过快'],
      '卷腹': ['用手拉扯头部', '用惯性甩动身体', '下背离地'],
      '拉伸': ['弹震式拉伸', '用力过猛', '憋气']
    }
  };
  const DOSAGE = { '初级': '3 组 × 12-15 次（或 30-60 秒）', '中级': '4 组 × 8-12 次', '高级': '4-5 组 × 5-8 次' };

  function splitSteps(text) {
    if (!text) return [];
    let parts = text.split(/[。；;]+/).map(function (s) { return s.trim(); }).filter(Boolean);
    if (parts.length <= 1) parts = text.split(/[，,]+/).map(function (s) { return s.trim(); }).filter(Boolean);
    return parts;
  }

  // 单个动作的结构化指导
  function exerciseGuidance(ex) {
    if (!ex) return null;
    const t = ex.type || '';
    const steps = splitSteps(ex.instructions);
    return {
      setup: GUIDE.setup[t] || '调整好姿势与器械，核心收紧，保持身体稳定。',
      steps: steps.length ? steps : [ex.instructions || '按动作说明完成动作。'],
      breath: GUIDE.breath[t] || '发力时呼气，还原时吸气。',
      mistakes: GUIDE.mistakes[t] || ['动作过快、失去控制', '借力代偿', '幅度不足'],
      tips: ex.tips || '保持动作标准，循序渐进。',
      dosage: DOSAGE[ex.difficulty] || '3-4 组 × 8-12 次'
    };
  }

  // 动作库统计
  function muscleStats() {
    const all = allExercises();
    const byMuscle = {};
    MUSCLE_GROUPS.forEach(function (m) { byMuscle[m] = 0; });
    const byDiff = { '初级': 0, '中级': 0, '高级': 0 };
    all.forEach(function (e) {
      if (byMuscle[e.muscle] != null) byMuscle[e.muscle]++;
      if (byDiff[e.difficulty] != null) byDiff[e.difficulty]++;
    });
    return { total: all.length, byMuscle: byMuscle, byDiff: byDiff, muscles: MUSCLE_GROUPS.length };
  }

  // 新手入门指导
  function beginnerGuideModal() {
    const stats = muscleStats();
    const starters = [];
    MUSCLE_GROUPS.forEach(function (m) {
      const list = sortByCompound(exercisesByMuscle(m)).filter(function (e) { return e.difficulty === '初级'; });
      if (list.length) starters.push(list[0]);
    });
    const sec = function (ico, title, body) {
      return '<div class="card" style="background:rgba(255,255,255,0.03);padding:16px;margin-bottom:12px;">' +
        '<div class="card-title" style="font-size:13.5px;">' + icon(ico, 15) + ' ' + title + '</div>' +
        '<div style="font-size:13px;line-height:1.85;color:var(--text-dim);">' + body + '</div></div>';
    };
    const html =
      '<div class="modal-title">' + icon('sprout', 18) + ' 新手入门指导</div>' +
      '<div class="modal-sub">从零开始，安全高效地开启训练</div>' +
      '<div class="flex flex-wrap gap-8" style="margin-bottom:16px;">' +
        '<span class="tag tag-accent">动作库 ' + stats.total + ' 个动作</span>' +
        '<span class="tag">' + stats.muscles + ' 个肌群</span>' +
        '<span class="tag tag-green">初级 ' + stats.byDiff['初级'] + '</span>' +
        '<span class="tag tag-yellow">中级 ' + stats.byDiff['中级'] + '</span>' +
        '<span class="tag tag-red">高级 ' + stats.byDiff['高级'] + '</span>' +
      '</div>' +
      sec('bolt', '① 热身（5-10 分钟）', '关节活动（肩绕环、髋绕环、踝泵各 10 次）→ 5 分钟低强度有氧 → 用轻重量做 1-2 组热身组。') +
      sec('dumbbell', '② 训练原则', '复合动作优先（深蹲、硬拉、卧推、划船、推举）；每个动作 3 组 × 8-12 次；组间休息 60-90 秒；<b style="color:var(--text)">先掌握动作模式，再逐步加重</b>。') +
      sec('calendar', '③ 训练频率', '新手建议每周 3 次全身训练，同一肌群间隔 48 小时，保证 7-9 小时睡眠。') +
      sec('trendingUp', '④ 渐进超负荷', '每周在动作标准的前提下，增加一点重量或次数（如每周 +2.5kg 或 +1 次），这是持续进步的关键。') +
      sec('leaf', '⑤ 拉伸放松（5-10 分钟）', '训练后对目标肌群做静态拉伸，每处保持 20-30 秒，帮助恢复、缓解酸痛。') +
      '<div class="card" style="background:rgba(255,107,53,0.08);border-color:rgba(255,107,53,0.25);padding:16px;">' +
        '<div class="card-title" style="font-size:13.5px;">' + icon('target', 15) + ' 推荐入门动作（点击查看指导）</div>' +
        '<div class="flex flex-wrap gap-8" style="margin-top:8px;">' +
          starters.map(function (e) { return '<span class="chip" data-ex="' + esc(e.name) + '">' + esc(e.name) + '</span>'; }).join('') +
        '</div>' +
      '</div>' +
      '<div class="flex gap-12" style="justify-content:flex-end;margin-top:16px;">' +
        '<a class="btn btn-ghost" href="plan.html">去生成计划</a>' +
        '<button class="btn btn-primary" data-close>我知道了</button>' +
      '</div>';
    const m = openModal(html, { large: true });
    m.el.querySelector('[data-close]').onclick = m.close;
    m.el.querySelectorAll('[data-ex]').forEach(function (el) {
      el.onclick = function () { exerciseModal(findExercise(el.dataset.ex)); };
    });
  }

  // ---------- 动作详情弹窗 ----------
  function exerciseModal(ex) {
    if (!ex) return;
    const g = exerciseGuidance(ex);
    const img = ex.gif
      ? '<img src="' + esc(ex.gif) + '" alt="' + esc(ex.name) + '" style="width:100%;max-height:340px;object-fit:contain;border-radius:12px;background:#0f1420;" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'">' +
        '<div style="display:none;height:200px;align-items:center;justify-content:center;opacity:.3;background:#0f1420;border-radius:12px;color:var(--text-dim);">' + icon('dumbbell', 42) + '</div>'
      : '<div style="height:200px;display:flex;align-items:center;justify-content:center;opacity:.3;background:#0f1420;border-radius:12px;color:var(--text-dim);">' + icon('dumbbell', 42) + '</div>';
    const html =
      '<div class="modal-title">' + esc(ex.name) + '</div>' +
      '<div class="modal-sub">' + esc(ex.en || '') + '</div>' +
      '<div style="margin-bottom:16px;">' + img + '</div>' +
      '<div class="flex flex-wrap gap-8" style="margin-bottom:16px;">' +
        '<span class="tag tag-accent">' + esc(ex.muscle || '') + '</span>' +
        '<span class="tag">' + esc(ex.type || '') + '</span>' +
        '<span class="tag">' + esc(ex.difficulty || '') + '</span>' +
        '<span class="tag">' + esc(ex.equipment || '') + '</span>' +
      '</div>' +

      '<div class="card" style="background:rgba(255,107,53,0.07);border-color:rgba(255,107,53,0.22);padding:14px 16px;margin-bottom:14px;">' +
        '<div class="flex items-center gap-8" style="font-size:13.5px;">' +
          '<span style="color:var(--accent-2);">' + icon('target', 15) + '</span>' +
          '<b>建议组次</b><span class="mute" style="margin-left:auto;">' + esc(g.dosage) + '</span>' +
        '</div>' +
      '</div>' +

      '<div class="card" style="background:rgba(255,255,255,0.03);padding:16px;">' +
        '<div class="card-title" style="font-size:13.5px;">' + icon('note', 15) + ' 动作步骤</div>' +
        '<div style="font-size:13.5px;line-height:1.8;color:var(--text-dim);margin-bottom:10px;">' +
          '<b style="color:var(--text)">准备：</b>' + esc(g.setup) + '</div>' +
        '<ol style="margin:0 0 4px 18px;font-size:13.5px;line-height:1.85;color:var(--text-dim);">' +
          g.steps.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') +
        '</ol>' +
        '<div style="font-size:13.5px;line-height:1.8;color:var(--text-dim);margin-top:10px;">' +
          '<b style="color:var(--text)">' + icon('activity', 13) + ' 呼吸：</b>' + esc(g.breath) + '</div>' +
      '</div>' +

      '<div class="card" style="background:rgba(255,84,112,0.06);border-color:rgba(255,84,112,0.2);padding:16px;margin-top:12px;">' +
        '<div class="card-title" style="font-size:13.5px;">' + icon('alert', 15) + ' 常见错误</div>' +
        '<ul style="margin:0 0 0 18px;font-size:13px;line-height:1.85;color:var(--text-dim);">' +
          g.mistakes.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') +
        '</ul>' +
      '</div>' +

      '<div class="card" style="background:rgba(255,255,255,0.03);padding:16px;margin-top:12px;">' +
        '<div class="card-title" style="font-size:13.5px;">' + icon('bulb', 15) + ' 训练技巧</div>' +
        '<p style="font-size:13.5px;line-height:1.8;color:var(--accent-2);">' + esc(g.tips) + '</p>' +
      '</div>' +

      '<div class="flex gap-12" style="justify-content:flex-end;margin-top:18px;">' +
        '<button class="btn btn-ghost" data-add>加入计划</button>' +
        '<button class="btn btn-primary" data-workout>加入本次训练</button>' +
      '</div>';
    const m = openModal(html, { large: true });
    m.el.querySelector('[data-add]').onclick = () => {
      const sel = JSON.parse(localStorage.getItem('myomap:selection') || '[]');
      if (sel.indexOf(ex.muscle) === -1 && ex.muscle) sel.push(ex.muscle);
      localStorage.setItem('myomap:selection', JSON.stringify(sel));
      const draft = JSON.parse(localStorage.getItem('myomap:draftExercises') || '[]');
      if (draft.indexOf(ex.name) === -1) draft.push(ex.name);
      localStorage.setItem('myomap:draftExercises', JSON.stringify(draft));
      toast('已加入计划草稿：' + ex.name, 'ok');
      m.close();
    };
    m.el.querySelector('[data-workout]').onclick = () => {
      const list = JSON.parse(localStorage.getItem('myomap:workoutQueue') || '[]');
      if (list.indexOf(ex.name) === -1) list.push(ex.name);
      localStorage.setItem('myomap:workoutQueue', JSON.stringify(list));
      toast('已加入训练队列', 'ok');
      m.close();
    };
  }
  function showExerciseDetail(name) { exerciseModal(findExercise(name)); }

  // ---------- 外壳渲染 ----------
  // ---------- 图标 ----------
  function icon(name, size) { return window.MyIcon ? window.MyIcon(name, size) : ''; }
  function hydrateOne(el) {
    const size = Number(el.getAttribute('data-ic-size')) || 18;
    el.innerHTML = icon(el.getAttribute('data-ic'), size);
    el.classList.add('ic');
    el.removeAttribute('data-ic');
  }
  // 将 <i data-ic="name"></i> 替换为 SVG（静态 HTML 与动态渲染均可）
  function hydrateIcons(root) {
    const r = root || document;
    if (r.nodeType === 1 && r.hasAttribute && r.hasAttribute('data-ic')) hydrateOne(r);
    if (r.querySelectorAll) r.querySelectorAll('[data-ic]').forEach(hydrateOne);
  }
  let iconObserver = null;
  // 设置含图标的 HTML 并立即水合（替代 textContent 误用导致的源码外显）
  function setHTML(el, html) {
    if (!el) return;
    el.innerHTML = html;
    hydrateIcons(el);
  }
  function observeIcons() {
    if (iconObserver || !window.MutationObserver || !document.body) return;
    iconObserver = new MutationObserver(function (muts) {
      muts.forEach(function (m) {
        if (!m.addedNodes) return;
        m.addedNodes.forEach(function (n) {
          if (n.nodeType === 1) hydrateIcons(n);
        });
      });
    });
    iconObserver.observe(document.body, { childList: true, subtree: true });
  }

  function navHtml(active) {
    let h = '';
    const guest = Store.isGuest();
    NAV.forEach(g => {
      h += '<div class="nav-group-label">' + esc(g.group) + '</div>';
      g.items.forEach(it => {
        const locked = guest && !it.public;
        h += '<a class="nav-link' + (it.key === active ? ' active' : '') + '" href="' + it.href + '">' +
          '<span class="ni">' + icon(it.icon, 19) + '</span><span>' + esc(it.label) + '</span>' +
          (locked ? '<span class="nav-lock" title="需登录">' + icon('lock', 12) + '</span>' : '') + '</a>';
      });
    });
    return h;
  }

  // 需登录页面守卫：游客访问则跳转登录页（携带 next 回跳）
  function requireLogin() {
    if (Store.isLoggedIn()) return true;
    const here = location.pathname.split('/').pop() + location.search;
    location.href = 'login.html?next=' + encodeURIComponent(here || 'index.html');
    return false;
  }

  // 游客执行保存类操作时的提示（不跳转，弹窗引导）
  function guardLogin(actionLabel) {
    if (Store.isLoggedIn()) return true;
    const m = openModal(
      '<div class="modal-title">' + icon('lock', 18) + ' 需要登录</div>' +
      '<div class="modal-sub">游客模式可以浏览首页与动作库，但无法保存' + esc(actionLabel || '数据') + '。</div>' +
      '<div class="flex gap-12" style="justify-content:flex-end;margin-top:8px;">' +
        '<button class="btn btn-ghost" data-x>稍后</button>' +
        '<button class="btn btn-primary" data-go>去登录</button>' +
      '</div>');
    m.el.querySelector('[data-x]').onclick = m.close;
    m.el.querySelector('[data-go]').onclick = () => {
      const here = location.pathname.split('/').pop() + location.search;
      location.href = 'login.html?next=' + encodeURIComponent(here || 'index.html');
    };
    return false;
  }
  function shell(opts) {
    opts = opts || {};
    ensureSession();
    // 需登录页面守卫（首页/动作库为 public，无需登录）
    const isPublic = opts.public === true || isPublicKey(opts.active);
    if (!isPublic && !requireLogin()) return;
    const mount = document.getElementById('nav-mount');
    if (mount) {
      mount.outerHTML =
        '<aside class="sidebar">' +
          '<a class="brand" href="index.html">' +
            '<span class="brand-mark">' + icon('dumbbell', 20) + '</span>' +
            '<span><span class="brand-text">MyoMap</span><span class="brand-sub">FITNESS GUIDE</span></span>' +
          '</a>' +
          '<nav>' + navHtml(opts.active) + '</nav>' +
          '<div class="sidebar-foot">' +
            '<div class="sidebar-user" id="sidebar-user">' +
              '<span class="avatar">' + esc(userInitial()) + '</span>' +
              '<span class="su-info"><span class="su-name">' + esc(userLabel()) + '</span>' +
              '<span class="su-role">' + (Store.isGuest() ? '游客模式' : '已登录') + '</span></span>' +
            '</div>' +
          '</div>' +
        '</aside>';
      const su = document.getElementById('sidebar-user');
      if (su) su.onclick = () => { location.href = 'profile.html'; };
    }
    const pt = document.getElementById('page-title');
    if (pt) pt.innerHTML = esc(opts.title || '') + (opts.subtitle ? '<small>' + esc(opts.subtitle) + '</small>' : '');
    const ta = document.getElementById('topbar-actions');
    if (ta) {
      let actions = '<button class="btn btn-sm btn-ghost" id="btn-theme" title="切换外观主题" aria-label="切换外观主题"><i class="ic" data-ic="palette"></i></button>';
      if (Store.isGuest()) {
        actions += '<a class="btn btn-sm btn-primary" href="login.html">登录 / 注册</a>';
      } else {
        actions += '<a class="btn btn-sm btn-ghost" href="profile.html">' + esc(userLabel()) + '</a>';
      }
      ta.innerHTML = actions;
      const bt = document.getElementById('btn-theme');
      if (bt) bt.onclick = themeModal;
    }
    hydrateIcons();
    observeIcons();
  }

  // 简易 SVG 折线图
  function lineChart(el, series, opts) {
    opts = opts || {};
    if (!el) return;
    const W = opts.width || 640, H = opts.height || 200, pad = 34;
    const vals = series.map(s => s.data).flat().filter(v => v != null);
    if (!vals.length) { el.innerHTML = '<div class="empty"><div class="empty-ico" style="color:var(--text-mute);">' + icon('trendingDown', 44) + '</div><div class="empty-title">暂无数据</div></div>'; return; }
    let min = Math.min.apply(null, vals), max = Math.max.apply(null, vals);
    const span = (max - min) || 1; min -= span * 0.15; max += span * 0.15;
    const n = series[0].data.length;
    const x = i => pad + (n <= 1 ? (W - pad * 2) / 2 : (W - pad * 2) * i / (n - 1));
    const y = v => H - pad - (H - pad * 2) * (v - min) / (max - min);
    let svg = '<svg class="chart-svg" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none">';
    for (let g = 0; g <= 4; g++) {
      const gy = pad + (H - pad * 2) * g / 4;
      svg += '<line x1="' + pad + '" y1="' + gy + '" x2="' + (W - pad) + '" y2="' + gy + '" stroke="rgba(255,255,255,0.06)"/>';
    }
    series.forEach(s => {
      const color = s.color || '#ff6b35';
      let d = '', area = '';
      s.data.forEach((v, i) => {
        if (v == null) return;
        d += (d ? ' L' : 'M') + x(i) + ' ' + y(v);
      });
      if (d) {
        area = d + ' L' + x(n - 1) + ' ' + (H - pad) + ' L' + x(0) + ' ' + (H - pad) + ' Z';
        svg += '<path d="' + area + '" fill="' + color + '" opacity="0.10"/>';
        svg += '<path d="' + d + '" fill="none" stroke="' + color + '" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>';
        s.data.forEach((v, i) => { if (v != null) svg += '<circle cx="' + x(i) + '" cy="' + y(v) + '" r="3" fill="' + color + '"/>'; });
      }
    });
    svg += '</svg>';
    el.innerHTML = svg;
  }

  return {
    NAV, $, $$, esc, clamp, round, debounce, fmtDate, fmtDateTime, ageFromBirth,
    ACTIVITY, calcBMI, bmiCategory, calcBMR, calcTDEE, calc1RM, calc1RMBrzycki, macroTargets,
    ensureSession, userInitial, userLabel, requireLogin, guardLogin, isPublicKey,
    icon, hydrateIcons, observeIcons, setHTML,
    toast, openModal, confirmModal, exerciseModal, showExerciseDetail,
    exerciseGuidance, muscleStats, beginnerGuideModal,
    api, apiOrNull, apiBase,
    allExercises, searchExercises, exercisesByMuscle, sortByCompound, findExercise,
    MUSCLE_GROUPS, EQUIPMENTS, DIFFICULTIES, COMPOUND_TYPES,
    FOOD_DB, lookupFood, localAI, ensureDisclaimer, themeModal, shell, lineChart
  };
})();
