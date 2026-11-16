<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Icon from '@/components/Icon.vue'
import ExerciseCard from '@/components/ExerciseCard.vue'

const C = window.Common
const S = window.Store
const route = useRoute()
const router = useRouter()

const lvl = computed(() => String(route.query.lvl || '初级'))
const isMidHigh = computed(() => lvl.value === 'midhigh')
const title = computed(() => (isMidHigh.value ? '中 / 高级动作' : lvl.value + '动作'))

const actions = computed(() => {
  const all = C.allExercises()
  if (isMidHigh.value) return all.filter((e) => e.difficulty === '中级' || e.difficulty === '高级')
  return all.filter((e) => e.difficulty === lvl.value)
})

const groups = computed(() => {
  const map = {}
  actions.value.forEach((e) => { (map[e.muscle] = map[e.muscle] || []).push(e) })
  return C.MUSCLE_GROUPS.filter((m) => map[m] && map[m].length).map((m) => ({ muscle: m, list: map[m] }))
})

function open(name) { C.showExerciseDetail(name) }
function requireLogin() {
  if (S.isLoggedIn()) return true
  router.push({ name: 'login', query: { next: 'library' } }); return false
}
function addToPlan(name) {
  if (!requireLogin()) return
  const ex = C.findExercise(name)
  const sel = JSON.parse(localStorage.getItem('myomap:selection') || '[]')
  if (ex && ex.muscle && sel.indexOf(ex.muscle) === -1) sel.push(ex.muscle)
  localStorage.setItem('myomap:selection', JSON.stringify(sel))
  const d = JSON.parse(localStorage.getItem('myomap:draftExercises') || '[]')
  if (d.indexOf(name) === -1) d.push(name)
  localStorage.setItem('myomap:draftExercises', JSON.stringify(d))
  C.toast('已加入计划草稿：' + name, 'ok')
}
function addToWorkout(name) {
  if (!requireLogin()) return
  const l = JSON.parse(localStorage.getItem('myomap:workoutQueue') || '[]')
  if (l.indexOf(name) === -1) l.push(name)
  localStorage.setItem('myomap:workoutQueue', JSON.stringify(l))
  C.toast('已加入训练队列（' + l.length + ' 个动作）', 'ok')
}
function goMuscle(m) { router.push({ name: 'library', query: { muscle: m } }) }
function goLibrary() { router.push({ name: 'library' }) }
</script>

<template>
  <div>
    <div class="card" style="margin-bottom:16px;">
      <div class="card-title">
        <span class="ct-ico"><Icon name="award" /></span> {{ title }}
        <span class="ct-sub">共 {{ actions.length }} 个动作 · 按肌群分类</span>
      </div>
      <div class="mute" style="font-size:12.5px;line-height:1.7;">
        按肌群分组展示：点击<b style="color:var(--text-dim)">肌群标题</b>进入该肌群动作库，点击<b style="color:var(--text-dim)">动作卡片</b>查看分步指导 / 加入计划 / 加入训练。
      </div>
      <div style="margin-top:12px;display:flex;flex-wrap:wrap;gap:8px;">
        <button class="btn btn-sm btn-ghost" @click="goLibrary"><Icon name="dumbbell" :size="14" /> 查看全部动作</button>
        <button class="btn btn-sm" :class="!isMidHigh ? 'btn-primary' : 'btn-ghost'" @click="router.replace({ name: 'level', query: { lvl: '初级' } })">初级动作</button>
        <button class="btn btn-sm" :class="isMidHigh ? 'btn-primary' : 'btn-ghost'" @click="router.replace({ name: 'level', query: { lvl: 'midhigh' } })">中 / 高级动作</button>
      </div>
    </div>

    <div v-for="g in groups" :key="g.muscle" style="margin-bottom:22px;">
      <div class="flex items-center" style="gap:8px;margin-bottom:10px;">
        <a href="#" @click.prevent="goMuscle(g.muscle)" style="font-weight:800;font-size:15px;color:var(--text);">{{ g.muscle }}</a>
        <span class="tag">{{ g.list.length }}</span>
      </div>
      <div class="ex-grid">
        <ExerciseCard v-for="ex in g.list" :key="ex.name" :ex="ex" @open="open" @plan="addToPlan" @workout="addToWorkout" />
      </div>
    </div>
  </div>
</template>
