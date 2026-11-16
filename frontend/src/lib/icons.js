// ============================================================
//  MyoMap · 线性图标库 (icons.js)
//  统一的 24x24 线性图标，stroke=currentColor，风格成熟克制
//  用法：Common.icon('dumbbell', 18)
//        或静态 HTML 占位 <i class="ic" data-ic="dumbbell"></i>
// ============================================================
(function () {
  const P = {
    // ---------- 导航 ----------
    home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5.5 9.6V20a1 1 0 0 0 1 1H10v-5.5h4V21h3.5a1 1 0 0 0 1-1V9.6"/>',
    dumbbell: '<path d="M6.5 6.5v11M4 9v6M17.5 6.5v11M20 9v6M6.5 12h11"/>',
    clipboard: '<rect x="5.5" y="4" width="13" height="17" rx="2"/><path d="M9 4V3.2A1.2 1.2 0 0 1 10.2 2h3.6A1.2 1.2 0 0 1 15 3.2V4"/><path d="M9 10h6M9 14h6M9 18h4"/>',
    timer: '<circle cx="12" cy="13.5" r="7.5"/><path d="M12 9.8v3.7l2.4 1.9"/><path d="M9.5 2.5h5"/>',
    chart: '<path d="M4 20h16"/><path d="M6.5 20v-5M11 20V8.5M15.5 20v-8M20 20V5"/>',
    nutrition: '<path d="M12 7c-1.5-2-4-2.2-5.3-.6C5.2 8.2 5.5 12 7.3 15.2c1 1.8 2.2 3.3 3.4 3.3.6 0 1-.3 1.3-.3s.7.3 1.3.3c1.2 0 2.4-1.5 3.4-3.3C18.5 12 18.8 8.2 17.3 6.4 16 4.8 13.5 5 12 7Z"/><path d="M12 7c0-1.7.8-3.3 2.5-4"/>',
    map: '<path d="M9 4 3 6.5v13L9 17l6 2.5 6-2.5v-13L15 6.5 9 4Z"/><path d="M9 4v13M15 6.5v13"/>',
    sparkles: '<path d="M12 3.5l1.7 4.3 4.3 1.7-4.3 1.7L12 15.5l-1.7-4.3L6 9.5l4.3-1.7L12 3.5Z"/><path d="M18.5 15.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7.7-1.8Z"/>',
    watch: '<rect x="7" y="6.5" width="10" height="11" rx="3"/><path d="M9.2 6.5 9 3.5h6l-.2 3M9.2 17.5 9 20.5h6l-.2-3"/><path d="M12 10v2.2l1.5 1.1"/>',
    user: '<circle cx="12" cy="8" r="3.6"/><path d="M5 20c0-3.3 3.1-5.6 7-5.6s7 2.3 7 5.6"/>',

    // ---------- 通用 ----------
    search: '<circle cx="11" cy="11" r="6.2"/><path d="M20 20l-4-4"/>',
    bolt: '<path d="M13 2.5 4.5 13.5H10l-1 8 8.5-11H12l1-8Z"/>',
    flame: '<path d="M12 21a6 6 0 0 0 6-6c0-4-3-6-3-6 .2 2-1 3-2 3 0 0 .5-4-3-7 .5 3-4 5-4 10a6 6 0 0 0 6 6Z"/>',
    weight: '<path d="M6.5 8h11l1.7 12H4.8L6.5 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
    target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.6"/><circle cx="12" cy="12" r="1"/>',
    utensils: '<path d="M6 3v7.5M4 3v4.5a2 2 0 0 0 4 0V3M6 10.5V21"/><path d="M16.5 3c-1.3 1.2-1.8 2.9-1.8 4.8 0 1.9.6 3 1.8 3.4V21"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
    video: '<rect x="3" y="6" width="13" height="12" rx="2.2"/><path d="M16 10.2l5-2.7v9l-5-2.7"/>',
    bulb: '<path d="M9.2 18h5.6M10.2 21h3.6"/><path d="M12 3a6 6 0 0 0-3.8 10.6c.6.5.9 1.2.9 2.1h5.8c0-.9.3-1.6.9-2.1A6 6 0 0 0 12 3Z"/>',
    ruler: '<rect x="3" y="9" width="18" height="6" rx="1.4"/><path d="M7 9v3M11 9v3M15 9v3M19 9v3"/>',
    moon: '<path d="M20 14.6A8 8 0 0 1 9.4 4 8 8 0 1 0 20 14.6Z"/>',
    palette: '<path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.9-.8 1.9-1.7 0-.5-.2-.9-.5-1.2-.3-.3-.5-.7-.5-1.1 0-.9.8-1.7 1.7-1.7H16a5 5 0 0 0 5-5c0-4.4-4-7.3-9-7.3Z"/><circle cx="7.6" cy="11.6" r="1"/><circle cx="10" cy="7.9" r="1"/><circle cx="14.5" cy="7.9" r="1"/><circle cx="16.8" cy="11.6" r="1"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    hourglass: '<path d="M7 3h10v2.5L13 12l4 6.5V21H7v-2.5L11 12 7 5.5V3Z"/>',
    thumbsUp: '<path d="M7 10v10H4.5V10H7Z"/><path d="M7 10l3.8-6.6c1.2 0 2 .9 2 2V8h5.4a1.9 1.9 0 0 1 1.9 2.3l-1.1 5.6A2 2 0 0 1 17 18H7"/>',
    signal: '<path d="M4.5 9.5a11 11 0 0 1 15 0M7.5 12.8a7 7 0 0 1 9 0M10.2 16a3.6 3.6 0 0 1 3.6 0"/><circle cx="12" cy="19" r="1"/>',
    activity: '<path d="M3 12h3.5l2.5 6 4-13 2.5 7H21"/>',
    calendar: '<rect x="3.5" y="5" width="17" height="16" rx="2"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/>',
    body: '<circle cx="12" cy="4.6" r="2"/><path d="M12 6.8v7M12 9l-4 1M12 9l4 1M12 13.8 9 21M12 13.8 15 21"/>',
    award: '<circle cx="12" cy="9" r="5"/><path d="M9 13.5 8 21l4-2 4 2-1-7.5"/>',
    rocket: '<path d="M12 3c3 1.6 5 5.1 5 9l-5 4-5-4c0-3.9 2-7.4 5-9Z"/><circle cx="12" cy="9" r="1.8"/><path d="M8.2 15.6 6 21l3.6-1.6M15.8 15.6 18 21l-3.6-1.6"/>',
    pause: '<rect x="7" y="5" width="3.4" height="14" rx="1.1"/><rect x="13.6" y="5" width="3.4" height="14" rx="1.1"/>',
    play: '<path d="M8 5.6v12.8L18.5 12 8 5.6Z"/>',
    stop: '<rect x="6" y="6" width="12" height="12" rx="2.2"/>',
    lock: '<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>',
    chat: '<path d="M20 15a2 2 0 0 1-2 2H8.5L4 21V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v9Z"/>',
    upload: '<path d="M12 16V4.5M7.8 8.7 12 4.5l4.2 4.2"/><path d="M5 20h14"/>',
    download: '<path d="M12 4.5V16M7.8 11.8 12 16l4.2-4.2"/><path d="M5 20h14"/>',
    pencil: '<path d="M4 20h4L20 8l-4-4L4 16v4Z"/><path d="M14.5 5.5 18.5 9.5"/>',
    radar: '<path d="M12 3l7.5 4.4v8.2L12 20l-7.5-4.4V7.4L12 3Z"/><path d="M12 3v9l7.5 4.4M12 12 4.5 16.4"/>',
    history: '<path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4.5V8h3.5"/><path d="M12 8v4.2l3 1.8"/>',
    arrowUp: '<path d="M12 19V5M6 11l6-6 6 6"/>',
    arrowDown: '<path d="M12 5v14M6 13l6 6 6-6"/>',
    arrowRight: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    refresh: '<path d="M20 12a8 8 0 1 1-2.4-5.7"/><path d="M20 4.5V8h-3.5"/>',
    heart: '<path d="M12 20s-7-4.3-7-9.2A4 4 0 0 1 12 8a4 4 0 0 1 7 2.8C19 15.7 12 20 12 20Z"/>',
    droplet: '<path d="M12 3s6 6.6 6 11a6 6 0 0 1-12 0c0-4.4 6-11 6-11Z"/>',
    sunrise: '<path d="M12 3v3M5.8 5.8l2 2M3 12h3M18 12h3M16.2 7.8l2-2"/><path d="M8 15.5a4 4 0 0 1 8 0"/><path d="M4 19.5h16"/>',
    leaf: '<path d="M20 4C10.5 4 4.5 9 4.5 16c0 2 1 4 1 4s6-1 9-4 5.5-8 5.5-12Z"/><path d="M8 16c2-3 5-5 8-6"/>',
    book: '<path d="M4.5 5a2 2 0 0 1 2-2H19v15H6.5a2 2 0 0 0-2 2V5Z"/><path d="M4.5 19.5a2 2 0 0 0 2 2H19"/>',
    cube: '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3Z"/><path d="M12 12l8-4.5M12 12v9M12 12 4 7.5"/>',
    mouse: '<rect x="7" y="3" width="10" height="18" rx="5"/><path d="M12 7v3"/>',
    mapPin: '<path d="M12 21s7-5.6 7-11a7 7 0 0 0-14 0c0 5.4 7 11 7 11Z"/><circle cx="12" cy="10" r="2.5"/>',
    route: '<circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8.5 6H14a4 4 0 0 1 0 8h-4a4 4 0 0 0 0 8h5.5"/>',
    sprout: '<path d="M12 21v-7"/><path d="M12 14c0-3-2-5-5.2-5C6.8 12 8.8 14 12 14Z"/><path d="M12 14c0-3 2-5 5.2-5C17.2 12 15.2 14 12 14Z"/>',
    inbox: '<path d="M4 13h4l1.4 2.8h5.2L16 13h4"/><path d="M5.6 5h12.8l1.6 8v5.5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V13l1.6-8Z"/>',
    calculator: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8"/><circle cx="8.5" cy="11.5" r=".9"/><circle cx="12" cy="11.5" r=".9"/><circle cx="15.5" cy="11.5" r=".9"/><circle cx="8.5" cy="15" r=".9"/><circle cx="12" cy="15" r=".9"/><path d="M15.5 14.5V18M8.5 18h4"/>',
    trash: '<path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/><path d="M6.2 7l.9 13a1 1 0 0 0 1 1h7.8a1 1 0 0 0 1-1l.9-13"/>',
    trendingUp: '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
    trendingDown: '<path d="M3 7l6 6 4-4 8 8"/><path d="M21 17h-6v-6"/>',
    image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.8"/><path d="M21 16l-5-5-6 6-3-3-4 4"/>',
    box: '<path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5v-9Z"/><path d="M3.5 7.5 12 12l8.5-4.5M12 12v9"/>',
    note: '<path d="M5 4h9l5 5v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z"/><path d="M14 4v5h5M8 13h7M8 17h5"/>',
    tag: '<path d="M11 3H5a2 2 0 0 0-2 2v6l9 9 9-9-9-9Z"/><circle cx="8" cy="8" r="1.4"/>',
    alert: '<path d="M12 3 2.6 20h18.8L12 3Z"/><path d="M12 10v4M12 17.4h.01"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    checkCircle: '<circle cx="12" cy="12" r="9"/><path d="M8 12.4l3 3 5-6"/>',
    xCircle: '<circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    save: '<path d="M5 3h11l3 3v15a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"/><path d="M8 3v6h7V3M8 21v-6h8v6"/>',
    shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3Z"/>',
    scale: '<path d="M5 20h14a2 2 0 0 0 2-2.2l-1.1-7.4A2 2 0 0 0 17.9 8.6H6.1a2 2 0 0 0-2 1.8L3 17.8A2 2 0 0 0 5 20Z"/><path d="M12 8.6V6.4a2 2 0 0 1 4 0v2.2"/><path d="M9 14.6a3 3 0 0 1 6 0"/>',
    brain: '<path d="M9.5 4.5A2.5 2.5 0 0 0 7 7a2.5 2.5 0 0 0-1.5 4.5A2.5 2.5 0 0 0 7 16a2.5 2.5 0 0 0 2.5 2.5V4.5Z"/><path d="M14.5 4.5A2.5 2.5 0 0 1 17 7a2.5 2.5 0 0 1 1.5 4.5A2.5 2.5 0 0 1 17 16a2.5 2.5 0 0 1-2.5 2.5V4.5Z"/><path d="M12 4.5v15"/>',
    link: '<path d="M9.5 14.5 14.5 9.5"/><path d="M7.6 10.4 5.9 12.1a3.5 3.5 0 0 0 5 5l1.7-1.7"/><path d="M16.4 13.6l1.7-1.7a3.5 3.5 0 0 0-5-5l-1.7 1.7"/>'
  };

  function icon(name, size) {
    const p = P[name];
    if (!p) return '';
    const s = size || 18;
    return '<svg class="ic-svg" width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" ' +
      'stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>';
  }

  window.MyIcons = P;
  window.MyIcon = icon;
})();
