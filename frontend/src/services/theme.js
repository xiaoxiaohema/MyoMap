// 主题：与原项目 theme.js 一致的 6 套配色，作用于 <html data-theme>
const KEY = 'myomap:settings'

export const THEMES = [
  { id: 'dark', name: '暗夜橙', desc: '深色背景 + 活力橙（默认）' },
  { id: 'light', name: '纯白明亮', desc: '白色背景 + 橙色点缀' },
  { id: 'sand', name: '暖沙', desc: '米色浅底 + 陶土橙' },
  { id: 'ocean', name: '深海蓝', desc: '深色背景 + 科技蓝' },
  { id: 'forest', name: '森林绿', desc: '深色背景 + 自然绿' },
  { id: 'violet', name: '星夜紫', desc: '深色背景 + 霓虹紫' }
]

export function readTheme() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || '{}')
    return s.theme || 'dark'
  } catch (e) { return 'dark' }
}

export function applyTheme(id) {
  const el = document.documentElement
  if (!id || id === 'dark') el.removeAttribute('data-theme')
  else el.setAttribute('data-theme', id)
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || '{}')
    s.theme = id
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch (e) {}
}

export function themeLabel(id) {
  const t = THEMES.find((x) => x.id === id)
  return t ? t.name : '暗夜橙'
}

export function initTheme() {
  applyTheme(readTheme())
}
