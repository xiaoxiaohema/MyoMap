<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import Icon from '@/components/Icon.vue'
import BodyViewer from '@/components/BodyViewer.vue'

const C = window.Common
const S = window.Store
const D = window.MyDevice
const router = useRouter()

const MUSCLE_SET = {}
C.MUSCLE_GROUPS.forEach((m) => (MUSCLE_SET[m] = 1))

const selected = ref([])
const guest = S.isGuest()

function sync() {
  if (typeof window.setGLBSelection === 'function') window.setGLBSelection(selected.value)
}
function toggleMuscle(name) {
  if (!name || !MUSCLE_SET[name]) return
  const i = selected.value.indexOf(name)
  if (i >= 0) selected.value.splice(i, 1)
  else selected.value.push(name)
  sync()
}
window.selectMuscleByName = toggleMuscle
window.selectMuscle = function (name) {
  if (!name) { selected.value = []; sync() } else toggleMuscle(name)
}
onMounted(sync)

const stats = computed(() => C.muscleStats())
const picks = computed(() => {
  if (!selected.value.length) return []
  let p = []
  selected.value.forEach((m) => { p = p.concat(C.sortByCompound(C.exercisesByMuscle(m)).slice(0, 3)) })
  return p.slice(0, 10)
})
const perMuscle = computed(() => selected.value.map((m) => ({ m, total: C.exercisesByMuscle(m).length })))
const compoundN = computed(() => picks.value.filter((e) => C.COMPOUND_TYPES.indexOf(e.type) >= 0).length)
const totalSelected = computed(() => perMuscle.value.reduce((s, x) => s + x.total, 0))

function openDetail(name) { C.showExerciseDetail(name) }

const dash = computed(() => {
  const profile = S.getProfile()
  const metrics = S.getMetrics()
  const latest = metrics[0] || {}
  const weight = latest.weight || profile.weight
  const bmi = C.calcBMI(weight, profile.height)
  const ds = D.dailyStats()
  const diet = S.getDiet(S.todayStr())
  const kcal = diet.reduce((s, d) => s + (Number(d.kcal) || 0), 0)
  const weekLogs = S.getLogs().filter((l) => (Date.now() - new Date(l.startedAt).getTime()) < 7 * 86400000).length
  const steps = D.isConnected() ? ds.steps : null
  return [
    { icon: 'scale', val: weight, unit: 'kg', label: '当前体重', to: 'body' },
    { icon: 'ruler', val: bmi || '—', unit: '', label: 'BMI ' + (C.bmiCategory(bmi).label), to: 'body' },
    { icon: 'activity', val: steps ? steps.toLocaleString() : '未连接', unit: steps ? '步' : '', label: '今日步数', to: 'device' },
    { icon: 'nutrition', val: kcal, unit: 'kcal', label: '今日摄入', to: 'diet' },
    { icon: 'dumbbell', val: weekLogs, unit: '次', label: '本周训练', to: 'workout' },
    { icon: 'moon', val: D.isConnected() ? ds.sleep.total : '—', unit: 'h', label: '昨夜睡眠', to: 'device' }
  ]
})
function goDash(it) {
  if (S.isLoggedIn()) router.push({ name: it.to })
  else router.push({ name: 'login', query: { next: it.to } })
}

const FULL_MAP = {
  增肌: ['胸大肌', '背阔肌', '股四头肌', '肩前束', '肱三头肌'],
  减脂: ['胸大肌', '背阔肌', '股四头肌', '腹直肌', '臀大肌'],
  塑形: ['臀大肌', '腹直肌', '背阔肌', '肩后束', '小腿肌群'],
  耐力: ['股四头肌', '腘绳肌', '背阔肌', '腹直肌', '小腿肌群']
}
function fullBody() {
  const goal = S.getProfile().goal
  selected.value = (FULL_MAP[goal] || FULL_MAP['增肌']).slice()
  sync()
  C.toast('已根据「' + goal + '」目标分配全身部位', 'ok')
}
function clearSel() { selected.value = []; sync() }
function beginner() { C.beginnerGuideModal() }
function resetView() {
  if (typeof window.resetGLBView === 'function') window.resetGLBView()
  else C.toast('3D 模型加载中…', 'warn')
}
function genPlan() {
  if (!selected.value.length) { C.toast('请先选择训练部位', 'warn'); return }
  if (!S.isLoggedIn()) { router.push({ name: 'login', query: { next: 'plan' } }); return }
  localStorage.setItem('myomap:selection', JSON.stringify(selected.value))
  router.push({ name: 'plan' })
}
const goLogin = () => router.push({ name: 'login', query: { next: 'home' } })
</script>

<template>
  <div>
    <div v-if="guest" class="guest-bar">
      <Icon name="user" /> 你正处于 <b>游客模式</b>，可以自由浏览首页与动作库；登录后即可保存计划、记录训练与身体数据。
      <a class="btn btn-sm btn-primary" href="#" @click.prevent="goLogin">立即登录</a>
    </div>

    <div class="hero-grid">
      <div class="card">
        <div class="card-title">
          <span class="ct-ico"><Icon name="cube" /></span> 选择训练部位
          <span class="ct-sub">拖动旋转 · 滚轮缩放 · 点击肌肉选择（可多选）</span>
        </div>
        <BodyViewer />
        <div class="chip-group" style="margin-top:14px;">
          <span v-if="!selected.length" class="mute" style="font-size:12.5px;">尚未选择部位，点击 3D 模型上的肌肉开始</span>
          <span v-for="m in selected" :key="m" class="chip active" @click="toggleMuscle(m)">{{ m }} ✕</span>
        </div>
        <div class="flex flex-wrap gap-8" style="margin-top:12px;">
          <button class="btn btn-sm btn-ghost" @click="resetView"><Icon name="target" /> 重置视角</button>
          <button class="btn btn-sm btn-ghost" @click="clearSel">清空</button>
          <button class="btn btn-sm btn-ghost" @click="fullBody"><Icon name="bolt" /> 一键全身</button>
          <button class="btn btn-sm btn-primary" style="margin-left:auto;" @click="genPlan"><Icon name="clipboard" /> 生成计划</button>
        </div>
      </div>

      <div>
        <div class="card">
          <div class="card-title">
            <span class="ct-ico"><Icon name="target" /></span> 推荐动作
            <span class="ct-sub">{{ selected.length ? selected.join(' · ') : '请选择部位' }}</span>
          </div>
          <div class="flex flex-wrap items-center gap-8" style="margin-bottom:12px;">
            <template v-if="!selected.length">
              <span class="tag tag-accent">动作库共 {{ stats.total }} 个动作</span>
              <span class="tag">{{ stats.muscles }} 个肌群</span>
              <span class="tag tag-green">初级 {{ stats.byDiff['初级'] }}</span>
              <span class="tag tag-yellow">中级 {{ stats.byDiff['中级'] }}</span>
              <span class="tag tag-red">高级 {{ stats.byDiff['高级'] }}</span>
            </template>
            <template v-else>
              <span class="tag tag-accent">该部位共 {{ totalSelected }} 个动作</span>
              <span class="tag">推荐 {{ picks.length }} 个</span>
              <span class="tag tag-blue">复合动作 {{ compoundN }}</span>
              <span v-for="x in perMuscle" :key="x.m" class="tag">{{ x.m }} {{ x.total }}</span>
            </template>
          </div>

          <div v-if="!selected.length" class="empty">
            <div class="empty-ico"><Icon name="dumbbell" :size="44" /></div>
            <div class="empty-title">选择肌肉部位后显示推荐动作</div>
            <div class="empty-hint">推荐按「复合动作优先」排序，点击动作查看分步指导</div>
          </div>
          <div v-else>
            <div v-for="(ex, i) in picks" :key="ex.name" class="rec-item" style="margin-bottom:8px;" @click="openDetail(ex.name)">
              <span class="rec-idx">{{ i + 1 }}</span>
              <span><span class="rec-name">{{ ex.name }}</span><span class="rec-muscle">{{ ex.muscle }} · {{ ex.equipment }}</span></span>
              <span class="rec-tags"><span class="tag tag-accent">{{ ex.type }}</span><span class="tag">{{ ex.difficulty }}</span></span>
            </div>
          </div>

          <div class="divider" style="margin:14px 0;"></div>
          <div class="flex items-center gap-8">
            <span class="mute" style="font-size:12.5px;">不确定怎么练？</span>
            <button class="btn btn-sm btn-ghost" @click="beginner"><Icon name="sprout" :size="14" /> 新手入门指导</button>
          </div>
        </div>

        <div class="card">
          <div class="card-title"><span class="ct-ico"><Icon name="calendar" /></span> 今日健康仪表盘 <span class="ct-sub">数据来源：智能手环 · 手动录入</span></div>
          <div class="grid grid-3">
            <div v-for="it in dash" :key="it.label" class="stat" style="cursor:pointer;" @click="goDash(it)">
              <span class="stat-ico"><Icon :name="it.icon" /></span>
              <span class="stat-val">{{ it.val }}<small v-if="it.unit">{{ it.unit }}</small></span>
              <span class="stat-label">{{ it.label }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
