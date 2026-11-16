<script setup>
import { ref } from 'vue'
import Icon from '@/components/Icon.vue'

const props = defineProps({ ex: { type: Object, required: true } })
const emit = defineEmits(['open', 'plan', 'workout'])
const imgError = ref(false)
</script>

<template>
  <div class="ex-card">
    <div class="ex-thumb" @click="emit('open', ex.name)">
      <img v-if="ex.gif && !imgError" :src="ex.gif" :alt="ex.name" loading="lazy" @error="imgError = true">
      <span v-else class="ex-ph"><Icon name="dumbbell" /></span>
    </div>
    <div class="ex-body">
      <div class="ex-name" @click="emit('open', ex.name)">{{ ex.name }}</div>
      <div class="ex-meta">
        <span class="tag tag-accent">{{ ex.muscle }}</span>
        <span class="tag">{{ ex.type }}</span>
        <span class="tag">{{ ex.difficulty }}</span>
      </div>
      <div class="ex-actions">
        <button class="btn btn-sm btn-ghost" style="flex:1;" @click.stop="emit('open', ex.name)"><Icon name="note" :size="13" /> 指导</button>
        <button class="btn btn-sm btn-ghost" style="flex:1;" @click.stop="emit('plan', ex.name)">加入计划</button>
        <button class="btn btn-sm btn-primary" style="flex:1;" @click.stop="emit('workout', ex.name)">去训练</button>
      </div>
    </div>
  </div>
</template>
