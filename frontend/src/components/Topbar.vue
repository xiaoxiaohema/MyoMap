<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import Icon from './Icon.vue'

defineProps({ title: { type: String, default: '' }, subtitle: { type: String, default: '' } })
const emit = defineEmits(['theme'])
const router = useRouter()
const S = window.Store
const isLogged = S.isLoggedIn()
const label = S.isGuest() ? '' : ((S.currentUser() || {}).username || '用户')

// 可选后端同步状态（仅后端账号显示）
const sync = ref({ backend: false, pending: 0, lastMsg: '' })
function refreshSync() { sync.value = window.Sync ? window.Sync.status() : { backend: false, pending: 0, lastMsg: '' } }
function doSync() {
  if (!window.Sync) return
  window.Sync.syncAll().then((r) => { refreshSync(); if (r && r.msg) window.Common.toast(r.msg, r.ok ? 'ok' : 'warn') })
}
let t = null
onMounted(() => { refreshSync(); t = setInterval(refreshSync, 3000) })
onBeforeUnmount(() => { if (t) clearInterval(t) })
</script>

<template>
  <header class="topbar">
    <div class="page-title" v-html="title + (subtitle ? '<small>' + subtitle + '</small>' : '')" />
    <div class="topbar-spacer" />
    <div class="topbar-actions">
      <span v-if="sync.backend" class="tag" :class="sync.pending ? 'tag-yellow' : 'tag-green'"
            style="cursor:pointer;" :title="sync.lastMsg || '点击立即同步'" @click="doSync">
        {{ sync.pending ? '待同步 ' + sync.pending : '已同步' }}
      </span>
      <button class="btn btn-sm btn-ghost" title="切换外观主题" aria-label="切换外观主题" @click="emit('theme')">
        <Icon name="palette" :size="16" />
      </button>
      <a v-if="!isLogged" class="btn btn-sm btn-primary" @click.prevent="router.push({ name: 'login' })" href="#">登录 / 注册</a>
      <a v-else class="btn btn-sm btn-ghost" @click.prevent="router.push({ name: 'profile' })" href="#">{{ label }}</a>
    </div>
  </header>
</template>
