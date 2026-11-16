// ============================================================
//  MyoMap · 训练计划生成器 (FM-02.3 / FM-03.1)
//  根据选中部位 + 目标 + 难度 + 频率 生成周期化训练计划
// ============================================================
window.MyPlanner = (function () {
  const DAY_NAMES = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

  function chunk(arr, k) {
    const out = [];
    const per = Math.ceil(arr.length / k);
    for (let i = 0; i < arr.length; i += per) out.push(arr.slice(i, i + per));
    while (out.length < k) out.push(arr.slice());
    return out.slice(0, k);
  }

  function focusFor(muscles, freq) {
    if (!muscles.length) muscles = ['胸大肌', '背阔肌', '股四头肌', '腹直肌'];
    if (freq <= 3) return chunk(muscles, freq);
    // 高频：每个训练日专注 1 个部位，循环分配
    let seq = [];
    while (seq.length < freq) seq = seq.concat(muscles);
    return seq.slice(0, freq).map(m => [m]);
  }

  function scheme(goal, difficulty) {
    const reps = { '增肌': '8-12', '减脂': '12-15', '塑形': '12-15', '耐力': '15-20' }[goal] || '8-12';
    const restBase = { '增肌': 90, '减脂': 60, '塑形': 60, '耐力': 45 }[goal] || 90;
    const sets = [3, 4, 5][Math.max(0, Math.min(2, difficulty - 1))] || 4;
    return { sets, reps, rest: Math.max(30, restBase - (difficulty - 1) * 15) };
  }

  function pickExercises(focus, count) {
    let pool = [];
    focus.forEach(m => { pool = pool.concat(Common.exercisesByMuscle(m)); });
    pool = Common.sortByCompound(pool);
    // 去重
    const seen = {}, out = [];
    pool.forEach(e => { if (!seen[e.name]) { seen[e.name] = 1; out.push(e); } });
    return out.slice(0, count);
  }

  function generate(opts) {
    const muscles = opts.muscles && opts.muscles.length ? opts.muscles.slice() : [];
    const goal = opts.goal || '增肌';
    const difficulty = Number(opts.difficulty) || 2;
    const frequency = Number(opts.frequency) || 3;
    const weeks = Number(opts.weeks) || 4;
    const sch = scheme(goal, difficulty);
    const focus = focusFor(muscles, frequency);
    const perDay = difficulty >= 3 ? 6 : difficulty === 2 ? 5 : 4;

    const days = focus.map((f, i) => {
      const exs = pickExercises(f, perDay);
      return {
        day: DAY_NAMES[i % 7],
        name: f.join(' + ') + '日',
        focus: f,
        exercises: exs.map(e => ({
          name: e.name, muscle: e.muscle, type: e.type, equipment: e.equipment,
          sets: sch.sets, reps: sch.reps, rest: sch.rest
        }))
      };
    });

    const goalLabel = goal;
    return {
      name: (muscles.length ? muscles.slice(0, 2).join('·') + ' ' : '') + goalLabel + '计划',
      goal, difficulty, frequency, weeks,
      muscles,
      days,
      scheme: sch,
      source: 'generated'
    };
  }

  /** 把后端（AI/算法）返回的数据适配成前端统一的 plan 结构 */
  function fromBackend(data, opts) {
    opts = opts || {};
    const days = (data.days || []).map(function (d) {
      return {
        day: d.day, name: d.name, focus: d.focus || [],
        exercises: (d.exercises || []).map(function (e) {
          return {
            name: e.name, muscle: e.muscle || '',
            type: e.type || '', equipment: e.equipment || '',
            sets: e.sets, reps: e.reps, rest: e.rest, note: e.note || ''
          };
        })
      };
    });
    return {
      name: data.planName || '训练计划',
      goal: data.goal || opts.goal || '增肌',
      difficulty: data.difficulty || opts.difficulty || 2,
      frequency: data.frequency || opts.frequency || days.length,
      weeks: data.weeks || opts.weeks || 4,
      muscles: opts.muscles || [],
      description: data.description || '',
      tips: data.tips || [],
      days: days,
      source: data.source || 'ai'
    };
  }

  /**
   * 异步生成：优先调用后端（服务端 AI 生成，失败自动回退算法）；
   * 未登录或后端不可用时，退回本地算法。
   * 返回 { plan, source }，source ∈ 'ai' | 'algorithm' | 'local'
   */
  async function generateAsync(opts) {
    opts = opts || {};
    const token = (window.Store && Store.token) ? Store.token() : '';
    if (token && window.Common && Common.apiBase) {
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(function () { ctrl.abort(); }, 120000);
        const res = await fetch(Common.apiBase() + '/plan/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
          body: JSON.stringify({
            muscles: opts.muscles || [], goal: opts.goal,
            difficulty: opts.difficulty, frequency: opts.frequency, duration: opts.weeks
          }),
          signal: ctrl.signal
        });
        clearTimeout(timer);
        const resp = await res.json();
        if (resp && resp.code === 1 && resp.data && resp.data.days && resp.data.days.length) {
          const plan = fromBackend(resp.data, opts);
          return { plan: plan, source: plan.source };
        }
      } catch (e) { /* 网络/超时 → 回退 */ }
    }
    const plan = generate(opts);
    plan.source = 'local';
    return { plan: plan, source: 'local' };
  }

  // 预设计划模板 (FR-03-03)
  function templates() {    return [
      { key: 'beginner', name: '新手全身计划', desc: '每周 3 次，掌握基础动作模式', frequency: 3, goal: '增肌', difficulty: 1,
        muscles: ['胸大肌', '背阔肌', '股四头肌', '腹直肌'] },
      { key: 'ppl', name: '推拉腿分化', desc: '每周 6 次，经典高容量分化', frequency: 6, goal: '增肌', difficulty: 3,
        muscles: ['胸大肌', '背阔肌', '股四头肌', '肩前束', '腘绳肌'] },
      { key: 'upper-lower', name: '上下肢分化', desc: '每周 4 次，力量与围度兼顾', frequency: 4, goal: '增肌', difficulty: 2,
        muscles: ['胸大肌', '背阔肌', '股四头肌', '腘绳肌'] },
      { key: 'fat-loss', name: '减脂有氧计划', desc: '每周 5 次，力量 + 有氧组合', frequency: 5, goal: '减脂', difficulty: 1,
        muscles: ['股四头肌', '腹直肌', '背阔肌', '臀大肌'] }
    ];
  }

  function fromTemplate(t) {
    const plan = generate({
      muscles: t.muscles, goal: t.goal, difficulty: t.difficulty, frequency: t.frequency, weeks: 4
    });
    plan.name = t.name;
    plan.source = 'template';
    plan.templateKey = t.key;
    return plan;
  }

  return { generate, generateAsync, fromBackend, templates, fromTemplate, DAY_NAMES };
})();
