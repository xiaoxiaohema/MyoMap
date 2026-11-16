// ============================================================
//  MyoMap · 本地数据层 (store.js)
//  本地优先 (Local-First)：所有数据存储于浏览器 localStorage
//  对应 SRS §6.1 核心实体：User / Profile / BodyMetric /
//  WorkoutPlan / WorkoutLog / DietLog / Exercise / Device
// ============================================================
window.Store = (function () {
  const K = {
    users: 'myomap:users',
    session: 'myomap:session',
    profile: 'myomap:profile',
    body: 'myomap:body',
    plans: 'myomap:plans',
    logs: 'myomap:logs',
    diet: 'myomap:diet',
    chat: 'myomap:chat',
    device: 'myomap:device',
    custom: 'myomap:custom',
    settings: 'myomap:settings'
  };

  function read(key, def) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : def;
    } catch (e) { return def; }
  }
  // 可选后端镜像：本地写成功后通知同步层（后端账号才会真正推送，失败不影响本地）
  function hook(kind, payload) {
    try { if (window.Sync && window.Sync.onLocalWrite) window.Sync.onLocalWrite(kind, payload); } catch (e) { }
  }
  function write(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); return true; }
    catch (e) { return false; }
  }
  function nowISO() { return new Date().toISOString(); }
  function uid(prefix) { return (prefix || 'id') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  // ---- 会话 ----
  function currentUser() {
    const s = read(K.session, null);
    if (s && s.username) return s;
    return { id: 'guest', username: '游客', guest: true, email: '' };
  }
  function setSession(s) { return write(K.session, s); }
  function token() { const s = currentUser(); return (s && s.token) ? s.token : ''; }
  function isGuest() { return !!currentUser().guest; }
  function isLoggedIn() { return !isGuest(); }

  // 以用户命名空间存取数据
  function ukey(base) { return base + ':' + currentUser().id; }
  function uget(base, def) { return read(ukey(base), def); }
  function uset(base, val) { return write(ukey(base), val); }

  // ---- 密码哈希 (SHA-256 + 随机 salt，演示用；生产环境应使用 bcrypt) ----
  async function hashPassword(pw, salt) {
    const data = (salt || '') + '::' + pw;
    if (window.crypto && window.crypto.subtle && window.TextEncoder) {
      try {
        const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data));
        return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
      } catch (e) { /* fallthrough */ }
    }
    let h = 5381;
    for (let i = 0; i < data.length; i++) h = ((h << 5) + h + data.charCodeAt(i)) >>> 0;
    return 'fallback_' + h.toString(16);
  }
  function makeSalt() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }

  function getUsers() { return read(K.users, []); }
  function saveUsers(list) { return write(K.users, list); }

  async function register(username, password, email) {
    username = (username || '').trim();
    email = (email || '').trim();
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) return { ok: false, msg: '用户名需为 3-20 位字母、数字或下划线' };
    if ((password || '').length < 8 || (password || '').length > 64) return { ok: false, msg: '密码长度需在 8-64 位' };
    if (!/[A-Za-z]/.test(password || '') || !/\d/.test(password || '')) return { ok: false, msg: '密码需同时包含字母和数字' };
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, msg: '邮箱格式不正确' };
    const users = getUsers();
    if (users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
      return { ok: false, msg: '用户名已存在' };
    }
    const salt = makeSalt();
    const hash = await hashPassword(password, salt);
    const user = {
      id: uid('u'), username, email: email || '',
      salt, hash, createdAt: nowISO()
    };
    users.push(user);
    saveUsers(users);
    write(K.session, { id: user.id, username: user.username, email: user.email, guest: false, loginAt: nowISO() });
    // 初始化默认档案
    if (!uget(K.profile, null)) uset(K.profile, defaultProfile());
    return { ok: true, user };
  }

  async function login(username, password) {
    username = (username || '').trim();
    const users = getUsers();
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (!user) return { ok: false, msg: '用户不存在' };
    const hash = await hashPassword(password, user.salt);
    if (hash !== user.hash) return { ok: false, msg: '密码错误' };
    write(K.session, { id: user.id, username: user.username, email: user.email, guest: false, loginAt: nowISO() });
    return { ok: true, user };
  }

  function loginAsGuest() {
    write(K.session, { id: 'guest', username: '游客', guest: true, loginAt: nowISO() });
  }
  function logout() {
    localStorage.removeItem(K.session);
  }

  // ---- 档案 (FM-01) ----
  function defaultProfile() {
    return {
      gender: 'male', birthdate: '2000-01-01', height: 175, weight: 70,
      goal: '增肌', experience: '新手', activity: 1.375, updatedAt: nowISO()
    };
  }
  function getProfile() {
    const p = uget(K.profile, null);
    return p ? Object.assign(defaultProfile(), p) : defaultProfile();
  }
  function saveProfile(obj) {
    const p = Object.assign(getProfile(), obj, { updatedAt: nowISO() });
    uset(K.profile, p);
    hook('profile', p);
    // 同步一条体重记录
    if (obj && obj.weight) addMetric({ weight: Number(obj.weight), date: todayStr(), note: '档案更新' }, true);
    return p;
  }

  // ---- 身体数据 (FM-04) ----
  function getMetrics() {
    const list = uget(K.body, []);
    return list.slice().sort((a, b) => (a.date < b.date ? 1 : -1));
  }
  function addMetric(m, silent) {
    const list = uget(K.body, []);
    const date = m.date || todayStr();
    const idx = list.findIndex(x => x.date === date);
    const rec = Object.assign({ id: uid('bm'), date, weight: null, bodyFat: null, chest: null, waist: null, hip: null, arm: null, thigh: null, calf: null, note: '' }, m, { date });
    if (idx >= 0) list[idx] = Object.assign(list[idx], rec);
    else list.push(rec);
    uset(K.body, list);
    hook('body', rec);
    if (!silent) return rec;
    return rec;
  }
  function deleteMetric(id) {
    uset(K.body, uget(K.body, []).filter(x => x.id !== id));
  }

  // ---- 训练计划 (FM-03.1) ----
  function getPlans() { return uget(K.plans, []); }
  function getPlan(id) { return getPlans().find(p => p.id === id) || null; }
  function savePlan(plan) {
    const list = getPlans();
    if (plan.id) {
      const i = list.findIndex(p => p.id === plan.id);
      if (i >= 0) list[i] = Object.assign(list[i], plan);
      else list.push(plan);
    } else {
      plan.id = uid('plan');
      plan.createdAt = nowISO();
      list.push(plan);
    }
    uset(K.plans, list);
    hook('plan', plan);
    return plan;
  }
  function deletePlan(id) { uset(K.plans, getPlans().filter(p => p.id !== id)); }

  // ---- 训练记录 (FM-03.2) ----
  function getLogs() {
    return uget(K.logs, []).slice().sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1));
  }
  function addLog(log) {
    const list = uget(K.logs, []);
    log.id = log.id || uid('log');
    log.createdAt = nowISO();
    list.push(log);
    uset(K.logs, list);
    hook('log', log);
    return log;
  }
  function deleteLog(id) { uset(K.logs, uget(K.logs, []).filter(l => l.id !== id)); }

  // ---- 饮食记录 (FM-05) ----
  function getDiet(date) {
    const list = uget(K.diet, []);
    return date ? list.filter(d => d.date === date) : list;
  }
  function addDiet(rec) {
    const list = uget(K.diet, []);
    rec.id = rec.id || uid('diet');
    rec.date = rec.date || todayStr();
    rec.createdAt = nowISO();
    list.push(rec);
    uset(K.diet, list);
    hook('diet', rec);
    return rec;
  }
  function deleteDiet(id) { uset(K.diet, uget(K.diet, []).filter(d => d.id !== id)); }

  // ---- AI 对话 (FM-07) ----
  function getChats() { return uget(K.chat, []); }
  function addChat(msg) {
    const list = uget(K.chat, []);
    msg.id = msg.id || uid('msg');
    msg.time = msg.time || nowISO();
    list.push(msg);
    uset(K.chat, list);
    return msg;
  }
  function clearChats() { uset(K.chat, []); }

  // ---- 设备 (FM-08) ----
  function getDevice() { return uget(K.device, { connected: false }); }
  function setDevice(d) { uset(K.device, d); return d; }

  // ---- 自定义动作 (FM-03.3) ----
  function getCustomExercises() { return uget(K.custom, []); }
  function addCustomExercise(ex) {
    const list = getCustomExercises();
    ex.id = ex.id || uid('cus');
    ex.custom = true;
    list.push(ex);
    uset(K.custom, list);
    return ex;
  }
  function deleteCustomExercise(id) { uset(K.custom, getCustomExercises().filter(e => e.id !== id)); }

  // ---- 设置 ----
  function getSettings() { return read(K.settings, { disclaimerAccepted: false, nutrition: null }); }
  function saveSettings(s) { const cur = getSettings(); write(K.settings, Object.assign(cur, s)); return getSettings(); }

  // ---- 工具 ----
  function todayStr(d) {
    const dt = d ? new Date(d) : new Date();
    const tz = dt.getTimezoneOffset() * 60000;
    return new Date(dt.getTime() - tz).toISOString().slice(0, 10);
  }
  function daysAgoStr(n) { return todayStr(Date.now() - n * 86400000); }

  // ---- 初始化演示数据 ----
  async function ensureDemoAccount() {
    const users = getUsers();
    if (users.some(u => u.username === 'admin')) return;
    const salt = makeSalt();
    const hash = await hashPassword('123456', salt);
    users.push({ id: 'u_demo_admin', username: 'admin', email: 'admin@myomap.local', salt, hash, createdAt: nowISO() });
    saveUsers(users);
  }

  function seedDemo() {
    // 演示账号 admin / 123456
    const users = getUsers();
    if (!users.some(u => u.username === 'admin')) {
      // 同步占位，登录时按需生成（此处直接写入已知 hash）
      // 为避免异步，这里不写 hash，交给 ensureDemoAccount()
    }
    if (isGuest()) {
      // 游客：初始化示例身体数据，便于展示图表
      const metrics = uget(K.body, []);
      if (!metrics.length) {
        const demo = [];
        for (let i = 13; i >= 0; i--) {
          const w = 72 + Math.sin(i / 2) * 1.2 - i * 0.12;
          demo.push({
            id: 'bm_seed_' + i, date: daysAgoStr(i * 7),
            weight: Math.round(w * 10) / 10, bodyFat: Math.round((18 + i * 0.15) * 10) / 10,
            waist: 82 - Math.round(i * 0.2), chest: 100, hip: 95, arm: 36, thigh: 56, calf: 38,
            note: ''
          });
        }
        uset(K.body, demo);
      }
    }
  }

  return {
    KEYS: K,
    currentUser, setSession, token, isGuest, isLoggedIn, register, login, loginAsGuest, logout,
    getProfile, saveProfile, defaultProfile,
    getMetrics, addMetric, deleteMetric,
    getPlans, getPlan, savePlan, deletePlan,
    getLogs, addLog, deleteLog,
    getDiet, addDiet, deleteDiet,
    getChats, addChat, clearChats,
    getDevice, setDevice,
    getCustomExercises, addCustomExercise, deleteCustomExercise,
    getSettings, saveSettings,
    todayStr, daysAgoStr, uid, hashPassword, makeSalt,
    getUsers, saveUsers, seedDemo, ensureDemoAccount
  };
})();
