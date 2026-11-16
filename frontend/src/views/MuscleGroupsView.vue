<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import Icon from '@/components/Icon.vue'

const C = window.Common
const router = useRouter()

const stats = computed(() => C.muscleStats())
const groups = computed(() =>
  C.MUSCLE_GROUPS.map((m) => ({ m, count: stats.value.byMuscle[m] || 0 }))
)

function open(m) { router.push({ name: 'library', query: { muscle: m } }) }
function all() { router.push({ name: 'library' }) }
</script>

<template>
  <div>
    <div class="card" style="margin-bottom:16px;">
      <div class="card-title">
        <span class="ct-ico"><Icon name="target" /></span> 肌群分类
        <span class="ct-sub">共 {{ groups.length }} 个肌群 · {{ stats.total }} 个动作</span>
      </div>
      <div class="mute" style="font-size:12.5px;line-height:1.7;">
        点击任意肌群进入该肌群的动作列表；列表中的动作同样可点击查看分步指导、加入计划或加入训练。
      </div>
      <div style="margin-top:12px;">
        <button class="btn btn-sm btn-ghost" @click="all"><Icon name="dumbbell" :size="14" /> 查看全部动作</button>
      </div>
    </div>

    <div class="grid grid-3">
      <div v-for="g in groups" :key="g.m" class="card muscle-card" @click="open(g.m)">
        <div class="mc-top">
          <span class="mc-ico"><Icon name="dumbbell" :size="18" /></span>
          <span class="mc-name">{{ g.m }}</span>
          <Icon name="arrowRight" :size="16" class="mc-go" />
        </div>
        <div class="mc-count">{{ g.count }}<small> 个动作</small></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.muscle-card { display: flex; flex-direction: column; gap: 8px; margin: 0; cursor: pointer; transition: transform .2s, border-color .2s, box-shadow .25s; }
.muscle-card:hover { transform: translateY(-3px); border-color: var(--accent); box-shadow: var(--shadow-hover); }
.mc-top { display: flex; align-items: center; gap: 8px; }
.mc-ico { color: var(--accent-2); display: inline-flex; }
.mc-name { font-weight: 700; font-size: 14.5px; }
.mc-go { margin-left: auto; color: var(--text-mute); }
.mc-count { font-size: 22px; font-weight: 800; letter-spacing: -0.3px; }
.mc-count small { font-size: 12px; font-weight: 500; color: var(--text-mute); margin-left: 2px; }
</style>
