<script setup>
import { ref } from 'vue'
import Modal from './Modal.vue'
import Icon from './Icon.vue'
import { THEMES, readTheme, applyTheme, themeLabel } from '@/services/theme'

const props = defineProps({ modelValue: Boolean })
const emit = defineEmits(['update:modelValue'])
const current = ref(readTheme())

function pick(id) {
  applyTheme(id)
  current.value = id
  if (window.Common && Common.toast) Common.toast('已切换主题：' + themeLabel(id), 'ok')
  emit('update:modelValue', false)
}
</script>

<template>
  <Modal :model-value="modelValue" @update:model-value="emit('update:modelValue', $event)">
    <div class="modal-title" style="display:flex;align-items:center;gap:8px;">
      <Icon name="palette" :size="18" /> 外观主题
    </div>
    <div class="modal-sub">选择界面配色，立即生效并自动保存</div>
    <div class="theme-grid">
      <button v-for="t in THEMES" :key="t.id" class="theme-opt" :class="{ active: t.id === current }" @click="pick(t.id)">
        <span class="theme-dot" :data-dot="t.id" />
        <span class="theme-meta"><b>{{ t.name }}</b><small>{{ t.desc }}</small></span>
        <Icon v-if="t.id === current" name="check" :size="16" />
      </button>
    </div>
  </Modal>
</template>
