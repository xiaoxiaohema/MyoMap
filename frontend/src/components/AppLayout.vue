<script setup>
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import Sidebar from './Sidebar.vue'
import Topbar from './Topbar.vue'
import ThemeModal from './ThemeModal.vue'
import Modal from './Modal.vue'

const route = useRoute()
const title = computed(() => route.meta.title || '')
const subtitle = computed(() => route.meta.subtitle || '')
const active = computed(() => route.meta.nav || route.name || 'home')

const showTheme = ref(false)

// 免责声明：仅进入首页时弹出一次
const S = window.Store
const showDisclaimer = ref(route.name === 'home' && !S.getSettings().disclaimerAccepted)
function acceptDisclaimer() {
  S.saveSettings({ disclaimerAccepted: true })
  showDisclaimer.value = false
}
</script>

<template>
  <div class="app">
    <Sidebar :active="active" />
    <div class="main">
      <Topbar :title="title" :subtitle="subtitle" @theme="showTheme = true" />
      <div class="content">
        <router-view />
      </div>
    </div>

    <ThemeModal v-model="showTheme" />

    <Modal v-model="showDisclaimer">
      <div class="modal-title">免责声明</div>
      <div class="modal-sub">使用本系统前请阅读</div>
      <div style="font-size:13.5px;line-height:1.85;color:var(--text-dim);">
        1. 本系统提供的训练计划、饮食建议均由算法/AI 生成，属于<b style="color:var(--text)">建议性内容</b>，请根据自身情况调整。<br>
        2. 本系统<b style="color:var(--text)">不提供医疗建议</b>，所有健康数据仅供参考。<br>
        3. 如患有疾病或有伤病史，请在专业人士指导下训练。<br>
        4. 所有数据默认仅保存在本地浏览器，保护你的隐私。
      </div>
      <div style="margin-top:20px;text-align:right;">
        <button class="btn btn-primary" @click="acceptDisclaimer">我已了解并同意</button>
      </div>
    </Modal>
  </div>
</template>
