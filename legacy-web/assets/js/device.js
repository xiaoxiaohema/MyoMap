// ============================================================
//  MyoMap · 智能设备数据接入 (FM-08)
//  小米手环 / 手表数据模拟层
//  真实接入时替换为 BLE / HealthKit / 开放平台 API 即可
// ============================================================
window.MyDevice = (function () {
  // 以日期为种子生成稳定的伪随机数，保证同一天数据一致
  function seedRand(seed) {
    let s = 0;
    for (let i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) >>> 0;
    return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }
  function today() { return Store.todayStr(); }

  function isConnected() { return !!Store.getDevice().connected; }

  async function connect() {
    if (isConnected()) return Store.getDevice();
    await new Promise(r => setTimeout(r, 900));
    const info = {
      connected: true,
      model: 'Mi Band 8',
      firmware: '2.0.1',
      battery: 87,
      userId: 'mi_' + Math.random().toString(36).slice(2, 8),
      boundAt: new Date().toISOString()
    };
    Store.setDevice(info);
    return info;
  }
  function disconnect() { Store.setDevice({ connected: false }); }

  function dailyStats(dateStr) {
    const d = dateStr || today();
    const r = seedRand('stats' + d);
    const steps = Math.round(5000 + r() * 8000);
    return {
      date: d,
      steps: steps,
      calories: Math.round(250 + steps * 0.04),
      distance: Math.round(steps * 0.00072 * 10) / 10,
      exerciseMinutes: Math.round(20 + r() * 60),
      heartRate: {
        current: Math.round(62 + r() * 26),
        resting: Math.round(54 + r() * 12),
        max: Math.round(130 + r() * 40),
        avg: Math.round(70 + r() * 16)
      },
      sleep: {
        total: Math.round((6 + r() * 2.4) * 10) / 10,
        deep: Math.round((1.2 + r() * 1.2) * 10) / 10,
        light: Math.round((3 + r() * 2) * 10) / 10,
        rem: Math.round((0.8 + r() * 1.2) * 10) / 10,
        score: Math.round(68 + r() * 26)
      },
      stress: Math.round(20 + r() * 40),
      spo2: Math.round(95 + r() * 4)
    };
  }

  function heartRateHistory(dateStr) {
    const r = seedRand('hr' + (dateStr || today()));
    const arr = [];
    for (let i = 0; i < 24; i++) {
      const base = (i >= 6 && i <= 8) || (i >= 18 && i <= 20) ? 88 : i < 6 ? 58 : 70;
      arr.push({ hour: i, value: Math.round(base + r() * 26) });
    }
    return arr;
  }

  function exerciseRecords(days) {
    days = days || 7;
    const out = [];
    const types = ['跑步', '骑行', '游泳', '力量训练', '瑜伽', '快走'];
    for (let i = 0; i < days; i++) {
      const d = Store.daysAgoStr(i);
      const r = seedRand('ex' + d);
      if (r() > 0.35) {
        out.push({
          date: d,
          type: types[Math.floor(r() * types.length)],
          duration: Math.round(20 + r() * 60),
          calories: Math.round(150 + r() * 400),
          distance: Math.round(r() * 90) / 10,
          avgHeartRate: Math.round(105 + r() * 55)
        });
      }
    }
    return out;
  }

  return { isConnected, connect, disconnect, dailyStats, heartRateHistory, exerciseRecords };
})();
