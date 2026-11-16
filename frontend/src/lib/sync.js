// ============================================================
//  MyoMap · 云端同步层 (sync.js)
//  设计前提：本地优先不变 —— localStorage 始终是唯一真相源与离线兜底。
//  仅当"后端账号已登录（会话里带 JWT）"时，才把业务数据镜像到后端 MySQL。
//
//  三类能力：
//   1) claimLocalData()  数据认领：登录后端账号后，把本地账号/游客时期的数据
//                        复制到后端账号的命名空间（目标已有数据则不覆盖）
//   2) onLocalWrite()    写穿透：本地写成功后登记待同步任务，并异步推送后端
//   3) flush()/syncAll() 补推与全量同步：后端不可用时保留队列，恢复后自动补推
//
//  与后端约定：POST /profile、/bodydata、/plan/save、/workout/log、/food/log
//  统一响应 { code, msg, data }，code = 1 表示成功。
// ============================================================
window.Sync = (function () {
  const JK = 'myomap:sync';      // 同步日志：{ pushed:{kind:localId->remoteId}, pending:[], lastAt, lastMsg }
  const CK = 'myomap:claimed';   // 认领标记：{ [后端账号id]: true }
  const BASE_KEYS = ['profile', 'body', 'plans', 'logs', 'diet', 'chat', 'device', 'custom']
    .map(function (x) { return 'myomap:' + x; });

  const EP = {
    profile: '/profile',
    body: '/bodydata',
    plan: '/plan/save',
    log: '/workout/log',
    diet: '/food/log'
  };
  const APPEND_ONLY = { log: 1, diet: 1 };   // 后端为 insert 语义，推送成功后不再重复推

  // ---------- 基础 ----------
  function read(k, d) {
    try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d } catch (e) { return d }
  }
  function write(k, v) {
    try { localStorage.setItem(k, JSON.stringify(v)); return true } catch (e) { return false }
  }
  function jrn() {
    const l = read(JK, null);
    return (l && typeof l === 'object') ? l : { pushed: {}, pending: [], lastAt: 0, lastMsg: '' };
  }
  function saveJrn(l) { write(JK, l) }
  function num(v) {
    if (v === null || v === undefined || v === '') return null;
    const n = Number(v); return isNaN(n) ? null : n;
  }
  function jsonText(v) { return v === null || v === undefined ? null : JSON.stringify(v) }
  function dt(v) {   // ISO → 后端 LocalDateTime 需要的 'yyyy-MM-ddTHH:mm:ss'（本地时间，无时区）
    if (!v) return null;
    const d = new Date(v); if (isNaN(d.getTime())) return null;
    const p = function (n) { return String(n).padStart(2, '0') };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + 'T' +
      p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
  }

  function token() {
    try { return (window.Store && Store.token && Store.token()) || '' } catch (e) { return '' }
  }
  function currentUser() {
    try { return (window.Store && Store.currentUser && Store.currentUser()) || {} } catch (e) { return {} }
  }
  /** 是否后端账号：会话里带 JWT 才算（本地账号/游客没有 token） */
  function isBackendUser() { return !!token() }
  function backendKey() { const u = currentUser(); return u && !u.guest ? (u.id || '') : '' }

  function api(path, method, body) {
    if (!window.Common || !Common.apiOrNull) return Promise.resolve(null);
    return Common.apiOrNull(path, method || 'POST', body);
  }

  // ---------- 1) 数据认领 ----------
  /** 把本地账号/游客/历史无后缀的数据复制到后端账号命名空间（目标非空则跳过） */
  function claimLocalData() {
    const uid = backendKey();
    if (!uid) return { moved: 0 };
    const flags = read(CK, {});
    if (flags[uid]) return { moved: 0 };

    const sufs = { '': 1 };
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      const m = /^myomap:(profile|body|plans|logs|diet|chat|device|custom):(.+)$/.exec(k || '');
      if (m) sufs[':' + m[2]] = 1;
    }
    let moved = 0;
    Object.keys(sufs).forEach(function (suf) {
      if (suf === ':' + uid) return;                       // 自己不动
      BASE_KEYS.forEach(function (b) {
        const from = b + suf, to = b + ':' + uid;
        const v = localStorage.getItem(from);
        if (v != null && localStorage.getItem(to) == null) {   // 只补空，不覆盖
          localStorage.setItem(to, v); moved++;
        }
      });
    });
    flags[uid] = true; write(CK, flags);
    return { moved: moved };
  }

  // ---------- 2) 写穿透 ----------
  function enqueue(kind, localId, payload) {
    const l = jrn();
    l.pending = (l.pending || []).filter(function (x) { return !(x.kind === kind && x.id === localId) });
    l.pending.push({ kind: kind, id: localId, data: payload, at: Date.now() });
    if (l.pending.length > 300) l.pending = l.pending.slice(-300);
    saveJrn(l);
  }

  /** 本地写成功后由 store.js 调用 */
  function onLocalWrite(kind, payload) {
    if (!payload || !EP[kind]) return;
    const id = String(payload.id || (kind === 'profile' ? 'me' : payload.date) || (kind + '_' + Date.now()));
    enqueue(kind, id, payload);
    if (isBackendUser()) schedule();
  }

  let timer = null;
  function schedule() {
    if (timer) return;
    timer = setTimeout(function () { timer = null; flush(); }, 1200);   // 合并 1.2s 内的连续写
  }

  // ---------- 3) 推送与补推 ----------
  function mapProfile(p) {
    return {
      gender: p.gender || 'male', birthdate: p.birthdate || null,
      height: num(p.height), weight: num(p.weight), goal: p.goal || '增肌',
      experience: p.experience || '新手', activity: num(p.activity)
    };
  }
  function mapBody(m) {
    return {
      date: m.date, weight: num(m.weight), bodyFat: num(m.bodyFat), chest: num(m.chest),
      waist: num(m.waist), hip: num(m.hip), arm: num(m.arm), thigh: num(m.thigh),
      calf: num(m.calf), note: m.note || ''
    };
  }
  function mapPlan(p, remoteId) {
    const o = {
      name: p.name || '训练计划', goal: p.goal || '增肌', difficulty: num(p.difficulty),
      frequency: num(p.frequency), weeks: num(p.weeks),
      muscles: jsonText(p.muscles || []), days: jsonText(p.days || []), source: p.source || 'local'
    };
    if (remoteId) o.id = remoteId;
    return o;
  }
  function mapLog(g, remoteId) {
    const o = {
      planName: g.planName || '自由训练', startedAt: dt(g.startedAt), endedAt: dt(g.endedAt),
      durationSec: num(g.durationSec), totalVolume: num(g.totalVolume), totalSets: num(g.totalSets),
      calories: num(g.calories), exercises: jsonText(g.exercises || [])
    };
    if (remoteId) o.id = remoteId;
    return o;
  }
  function mapDiet(d, remoteId) {
    const o = {
      date: d.date, meal: d.meal || '加餐', foodName: d.foodName || d.name || '食物',
      grams: num(d.grams), kcal: num(d.kcal), protein: num(d.protein),
      carb: num(d.carb), fat: num(d.fat), raw: d.raw || ''
    };
    if (remoteId) o.id = remoteId;
    return o;
  }

  async function pushOne(job, l) {
    const remoteId = l.pushed[job.kind + ':' + job.id];
    if (APPEND_ONLY[job.kind] && remoteId) return true;      // 追加型已推送过
    let body;
    if (job.kind === 'profile') body = mapProfile(job.data);
    else if (job.kind === 'body') body = mapBody(job.data);
    else if (job.kind === 'plan') body = mapPlan(job.data, remoteId);
    else if (job.kind === 'log') body = mapLog(job.data, remoteId);
    else if (job.kind === 'diet') body = mapDiet(job.data, remoteId);
    else return true;

    const r = await api(EP[job.kind], 'POST', body);
    if (!r || r.code !== 1) return false;                    // 后端不可用 / 校验失败 → 保留队列
    const data = r.data || {};
    if (data.id && job.kind !== 'profile' && job.kind !== 'body') {
      l.pushed[job.kind + ':' + job.id] = data.id;           // 记住远端 id，后续走更新
    }
    return true;
  }

  let running = false;
  /** 按顺序补推待同步队列；后端不可用时立刻停止并保留队列 */
  async function flush() {
    if (!isBackendUser()) return { ok: false, pending: (jrn().pending || []).length, msg: '未登录后端账号' };
    if (running) return { ok: false, pending: (jrn().pending || []).length, msg: '同步进行中' };
    running = true;
    const l = jrn();
    const queue = (l.pending || []).slice(0, 60);
    let done = 0;
    for (let i = 0; i < queue.length; i++) {
      const job = queue[i];
      let ok = false;
      try { ok = await pushOne(job, l) } catch (e) { ok = false }
      if (!ok) break;
      done++;
      l.pending = (l.pending || []).filter(function (x) { return !(x.kind === job.kind && x.id === job.id) });
    }
    l.lastAt = Date.now();
    l.lastMsg = done ? ('已同步 ' + done + ' 条' + ((l.pending || []).length ? '，剩余 ' + l.pending.length + ' 条待重试' : ''))
      : ((l.pending || []).length ? '后端不可用，已保留待同步队列' : '已是最新');
    saveJrn(l);
    running = false;
    return { ok: !(l.pending || []).length, pending: (l.pending || []).length, done: done, msg: l.lastMsg };
  }

  /** 全量同步：把当前命名空间下的档案 / 身体 / 计划 / 训练 / 饮食全部登记并推送 */
  function syncAll() {
    const S = window.Store;
    if (!S || !isBackendUser()) return Promise.resolve({ ok: false, pending: 0, msg: '未登录后端账号' });
    onLocalWrite('profile', Object.assign({}, S.getProfile(), { id: 'me' }));
    (S.getMetrics() || []).forEach(function (m) { onLocalWrite('body', m) });
    (S.getPlans() || []).forEach(function (x) { onLocalWrite('plan', x) });
    (S.getLogs() || []).forEach(function (x) { onLocalWrite('log', x) });
    (S.getDiet() || []).forEach(function (x) { onLocalWrite('diet', x) });
    return flush();
  }

  function status() {
    const l = jrn();
    return {
      backend: isBackendUser(),
      user: currentUser().username || '',
      pending: (l.pending || []).length,
      lastAt: l.lastAt || 0,
      lastMsg: l.lastMsg || ''
    };
  }

  function clearJournal() { write(JK, { pushed: {}, pending: [], lastAt: 0, lastMsg: '' }) }

  return {
    isBackendUser: isBackendUser,
    claimLocalData: claimLocalData,
    onLocalWrite: onLocalWrite,
    flush: flush,
    syncAll: syncAll,
    status: status,
    clearJournal: clearJournal
  };
})();
