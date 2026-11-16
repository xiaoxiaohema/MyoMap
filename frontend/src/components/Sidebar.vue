<script setup>
import { useRouter } from 'vue-router'
import Icon from './Icon.vue'

const props = defineProps({ active: { type: String, default: 'home' } })
const router = useRouter()
const S = window.Store

const NAV = [
  { group: '训练', items: [
    { key: 'home', route: 'home', icon: 'home', label: '首页', public: true },
    { key: 'library', route: 'library', icon: 'dumbbell', label: '动作库', public: true },
    { key: 'plan', route: 'plan', icon: 'clipboard', label: '训练计划' },
    { key: 'workout', route: 'workout', icon: 'timer', label: '训练记录' }
  ] },
  { group: '健康', items: [
    { key: 'body', route: 'body', icon: 'chart', label: '身体数据' },
    { key: 'diet', route: 'diet', icon: 'nutrition', label: '饮食规划' },
    { key: 'map', route: 'map', icon: 'map', label: '地图行程' }
  ] },
  { group: '智能', items: [
    { key: 'ai', route: 'ai', icon: 'sparkles', label: 'AI 助手' },
    { key: 'device', route: 'device', icon: 'watch', label: '智能设备' }
  ] },
  { group: '账户', items: [
    { key: 'profile', route: 'profile', icon: 'user', label: '我的档案' }
  ] }
]

const guest = S.isGuest()
const initial = (() => {
  const u = S.currentUser()
  const name = (u && (u.username || u.name)) || '游'
  return name.slice(0, 1).toUpperCase()
})()
const label = S.isGuest() ? '游客' : ((S.currentUser() || {}).username || '用户')

function go(item) {
  if (!item.public && !S.isLoggedIn()) { router.push({ name: 'login', query: { next: item.route } }); return }
  router.push({ name: item.route })
}
function goProfile() { router.push({ name: 'profile' }) }
</script>

<template>
  <aside class="sidebar">
    <a class="brand" @click.prevent="router.push({ name: 'home' })" href="#">
      <span class="brand-mark"><Icon name="dumbbell" :size="20" /></span>
      <span><span class="brand-text">MyoMap</span><span class="brand-sub">FITNESS GUIDE</span></span>
    </a>
    <nav>
      <template v-for="g in NAV" :key="g.group">
        <div class="nav-group-label">{{ g.group }}</div>
        <a v-for="it in g.items" :key="it.key" href="#"
           class="nav-link" :class="{ active: it.key === active }" @click.prevent="go(it)">
          <span class="ni"><Icon :name="it.icon" :size="18" /></span>
          <span>{{ it.label }}</span>
        </a>
      </template>
    </nav>
    <div class="sidebar-foot">
      <div class="sidebar-user" @click="goProfile">
        <span class="avatar">{{ initial }}</span>
        <span class="su-info">
          <span class="su-name">{{ label }}</span>
          <span class="su-role">{{ guest ? '游客模式' : '已登录' }}</span>
        </span>
      </div>
    </div>
  </aside>
</template>
