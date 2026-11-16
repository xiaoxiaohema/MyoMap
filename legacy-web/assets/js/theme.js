// ============================================================
//  MyoMap · 外观主题引导 (theme.js)
//  在 <head> 中同步执行，尽早设置 <html data-theme>，避免首屏闪烁。
//  主题持久化于 localStorage['myomap:settings'].theme（与 store.js 共享）。
// ============================================================
(function () {
  var KEY = 'myomap:settings';
  var THEMES = [
    { id: 'dark',   name: '暗夜橙',   desc: '深色背景 + 活力橙（默认）' },
    { id: 'light',  name: '纯白明亮', desc: '白色背景 + 橙色点缀' },
    { id: 'sand',   name: '暖沙',     desc: '米色浅底 + 陶土橙' },
    { id: 'ocean',  name: '深海蓝',   desc: '深色背景 + 科技蓝' },
    { id: 'forest', name: '森林绿',   desc: '深色背景 + 自然绿' },
    { id: 'violet', name: '星夜紫',   desc: '深色背景 + 霓虹紫' }
  ];

  function read() {
    try {
      var s = JSON.parse(localStorage.getItem(KEY) || '{}');
      return s.theme || 'dark';
    } catch (e) { return 'dark'; }
  }

  function applyAttr(id) {
    var el = document.documentElement;
    if (!id || id === 'dark') el.removeAttribute('data-theme');
    else el.setAttribute('data-theme', id);
  }

  function write(id) {
    try {
      var s = JSON.parse(localStorage.getItem(KEY) || '{}');
      s.theme = id;
      localStorage.setItem(KEY, JSON.stringify(s));
    } catch (e) {}
  }

  window.MyTheme = {
    themes: THEMES,
    current: read,
    valid: function (id) { return THEMES.some(function (t) { return t.id === id; }); },
    apply: function (id) {
      if (!this.valid(id)) id = 'dark';
      applyAttr(id);
      write(id);
      window.dispatchEvent(new CustomEvent('theme-change', { detail: id }));
      return id;
    },
    label: function (id) {
      var t = THEMES.filter(function (x) { return x.id === id; })[0];
      return t ? t.name : '暗夜橙';
    }
  };

  // 首屏立即应用（同步，body 尚未渲染）
  applyAttr(read());
})();
