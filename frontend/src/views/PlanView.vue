<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import Icon from '@/components/Icon.vue'

const C = window.Common
const S = window.Store
const P = window.MyPlanner
const D = window.MyDevice
const router = useRouter()

const tab = ref('gen')
const muscles = ref(JSON.parse(localStorage.getItem('myomap:selection') || '[]'))
const opts = reactive({
  goal: S.getProfile().goal || '增肌',
  difficulty: 2,
  frequency: 3,
  weeks: 4
})

const currentPlan = ref(null)
const generating = ref(false)
const myPlans = ref([])
const templates = computed(() => P.templates())

const goalOpts = [
  { v: '增肌', ic: 'dumbbell', label: '增肌' },
  { v: '减脂', ic: 'flame', label: '减脂' },
  { v: '塑形', ic: 'sparkles', label: '塑形' },
  { v: '耐力', ic: 'activity', label: '耐力' }
]
const diffOpts = [
  { v: 1, ic: 'sprout', label: '入门' },
  { v: 2, ic: 'flame', label: '进阶' },
  { v: 3, ic: 'award', label: '专业' }
]
const freqOpts = [2, 3, 4, 5, 6]
const weeksOpts = [1, 4, 8, 12]

const deviceConnected = ref(D.isConnected())
const connecting = ref(false)
const deviceInfo = ref('')

const planSub = computed(() =>
  currentPlan.value
    ? currentPlan.value.goal + ' · ' + currentPlan.value.frequency + '天/周 · ' + currentPlan.value.weeks + '周'
    : ''
)
const totalEx = computed(() =>
  currentPlan.value ? currentPlan.value.days.reduce((s, d) => s + d.exercises.length, 0) : 0
)

function requireLogin() {
  if (S.isLoggedIn()) return true
  router.push({ name: 'login', query: { next: 'plan' } })
  return false
}

function goHome() { router.push({ name: 'home' }) }

function removeMuscle(m) {
  muscles.value = muscles.value.filter((x) => x !== m)
  localStorage.setItem('myomap:selection', JSON.stringify(muscles.value))
}

function switchTab(t) {
  tab.value = t
  if (t === 'mine') refreshMyPlans()
}

async function generate() {
  generating.value = true
  try {
    const r = await P.generateAsync({
      muscles: muscles.value,
      goal: opts.goal,
      difficulty: opts.difficulty,
      frequency: opts.frequency,
      weeks: opts.weeks
    })
    const plan = r.plan
    if (D.isConnected()) {
      const ds = D.dailyStats()
      plan.deviceAdjusted = true
      plan.deviceNote = '已结合手环数据：静息心率 ' + ds.heartRate.resting + 'bpm · 睡眠评分 ' + ds.sleep.score
      if (ds.heartRate.resting > 70) plan.intensityNote = '静息心率偏高，建议首周降低强度 10%'
    }
    currentPlan.value = plan
    const label = r.source === 'ai' ? 'AI ' : (r.source === 'local' ? '本地 ' : '')
    C.toast(label + '计划已生成：' + plan.days.length + ' 个训练日', 'ok')
  } catch (e) {
    C.toast('生成失败：' + ((e && e.message) || '未知错误'), 'err')
  } finally {
    generating.value = false
  }
}

function removeExercise(di, ei) {
  currentPlan.value.days[di].exercises.splice(ei, 1)
}

function addExerciseToDay(di) {
  const plan = currentPlan.value
  const day = plan.days[di]
  const pool = C.sortByCompound(
    C.allExercises().filter((e) => day.focus.indexOf(e.muscle) >= 0 && !day.exercises.some((x) => x.name === e.name))
  ).slice(0, 60)
  const m = C.openModal(
    '<div class="modal-title">＋ 添加动作到 ' + C.esc(day.name) + '</div>' +
    '<div class="modal-sub">从动作库中选择（已按复合动作优先）</div>' +
    '<input class="input" id="pick-q" placeholder=" 搜索…" style="margin-bottom:12px;">' +
    '<div id="pick-list" style="max-height:46vh;overflow-y:auto;display:flex;flex-direction:column;gap:6px;"></div>')
  const listEl = m.el.querySelector('#pick-list')
  const sch = plan.scheme || {}
  function paint(q) {
    q = (q || '').toLowerCase()
    const list = pool.filter((e) => !q || e.name.toLowerCase().indexOf(q) >= 0 || (e.en || '').toLowerCase().indexOf(q) >= 0)
    listEl.innerHTML = list.length
      ? list.map((e) =>
        '<div class="ex-row" data-name="' + C.esc(e.name) + '" style="cursor:pointer;">' +
          '<span class="ex-nm">' + C.esc(e.name) + '</span>' +
          '<span class="tag tag-accent">' + C.esc(e.muscle) + '</span>' +
          '<span class="ex-sr">' + C.esc(e.difficulty) + '</span></div>').join('')
      : '<div class="mute" style="padding:20px;text-align:center;">无匹配动作</div>'
    listEl.querySelectorAll('[data-name]').forEach((r) => {
      r.onclick = () => {
        day.exercises.push({
          name: r.dataset.name,
          muscle: C.findExercise(r.dataset.name).muscle,
          sets: sch.sets || 3,
          reps: sch.reps || '10',
          rest: sch.rest || 60
        })
        m.close()
      }
    })
  }
  paint('')
  m.el.querySelector('#pick-q').addEventListener('input', C.debounce((e) => paint(e.target.value), 180))
}

function savePlan() {
  if (!requireLogin()) return
  const plan = currentPlan.value
  S.savePlan({
    id: plan.id,
    name: plan.name,
    goal: plan.goal,
    difficulty: plan.difficulty,
    frequency: plan.frequency,
    weeks: plan.weeks,
    muscles: plan.muscles,
    days: plan.days,
    source: plan.source
  })
  C.toast('计划已保存到「我的计划」', 'ok')
}

function startPlan(plan) {
  if (!requireLogin()) return
  const day = plan.days[0]
  const queue = day.exercises.map((e) => ({ name: e.name, sets: e.sets, reps: e.reps, rest: e.rest }))
  localStorage.setItem('myomap:workoutQueue', JSON.stringify(queue))
  localStorage.setItem('myomap:workoutPlanName', plan.name + ' · ' + day.name)
  router.push({ name: 'workout' })
}

function refreshMyPlans() {
  myPlans.value = S.getPlans()
}

function viewPlan(p) {
  const full = S.getPlan(p.id) || p
  C.openModal(
    '<div class="modal-title">' + C.esc(full.name) + '</div>' +
    '<div class="modal-sub">' + C.esc(full.goal) + ' · ' + full.frequency + '天/周 · ' + full.weeks + '周</div>' +
    (full.days || []).map((d) =>
      '<div class="day-card" style="margin-bottom:12px;"><div class="day-head"><span class="day-badge">' + C.esc(d.day) + '</span><span style="font-weight:700;">' + C.esc(d.name) + '</span></div>' +
      d.exercises.map((e, i) =>
        '<div class="ex-row"><span class="ex-idx">' + (i + 1) + '</span><span class="ex-nm">' + C.esc(e.name) + '</span><span class="ex-sr">' + e.sets + '组 × ' + e.reps + '</span></div>').join('') +
      '</div>').join(''), { large: true })
}

function startSaved(p) {
  const full = S.getPlan(p.id)
  if (full) startPlan(full)
}

function deletePlan(p) {
  C.confirmModal('删除计划', '确定删除该训练计划吗？此操作不可恢复。', () => {
    S.deletePlan(p.id)
    refreshMyPlans()
    C.toast('已删除', 'ok')
  }, '删除')
}

function useTemplate(t) {
  if (!requireLogin()) return
  const plan = P.fromTemplate(t)
  S.savePlan({
    name: plan.name,
    goal: plan.goal,
    difficulty: plan.difficulty,
    frequency: plan.frequency,
    weeks: plan.weeks,
    muscles: plan.muscles,
    days: plan.days,
    source: 'template'
  })
  C.toast('已应用模板：' + t.name, 'ok')
  switchTab('mine')
}

async function connectDevice() {
  if (D.isConnected()) {
    const ds = D.dailyStats()
    deviceInfo.value = '已连接 · 静息心率 ' + ds.heartRate.resting + 'bpm · 睡眠评分 ' + ds.sleep.score + ' · 今日步数 ' + ds.steps.toLocaleString()
    deviceConnected.value = true
    C.toast('设备已连接', 'ok')
    return
  }
  connecting.value = true
  await D.connect()
  connecting.value = false
  deviceConnected.value = true
  const ds = D.dailyStats()
  deviceInfo.value = '已连接 · 静息心率 ' + ds.heartRate.resting + 'bpm · 睡眠评分 ' + ds.sleep.score + ' · 今日步数 ' + ds.steps.toLocaleString()
  C.toast('设备连接成功', 'ok')
}

function initDevice() {
  if (D.isConnected()) {
    const ds = D.dailyStats()
    deviceInfo.value = '已连接 · 静息心率 ' + ds.heartRate.resting + 'bpm · 睡眠评分 ' + ds.sleep.score
  } else {
    deviceInfo.value = '连接后计划将结合你的静息心率与睡眠评分自动调整强度'
  }
}

onMounted(() => {
  initDevice()
  const draft = JSON.parse(localStorage.getItem('myomap:draftExercises') || '[]')
  if (draft.length && !currentPlan.value) {
    C.toast('已载入 ' + draft.length + ' 个草稿动作，点击「生成训练计划」', 'warn')
  }
})
</script>

<template>
  <div>
    <div class="tabs">
      <button class="tab" :class="{ active: tab === 'gen' }" @click="switchTab('gen')">生成计划</button>
      <button class="tab" :class="{ active: tab === 'mine' }" @click="switchTab('mine')">我的计划</button>
      <button class="tab" :class="{ active: tab === 'tpl' }" @click="switchTab('tpl')">计划模板</button>
    </div>

    <!-- 生成计划 -->
    <section v-show="tab === 'gen'">
      <div class="grid grid-2" style="align-items:start;">
        <div class="card">
          <div class="card-title">
            <span class="ct-ico"><Icon name="body" /></span> 训练部位
            <a class="ct-sub" href="#" style="color:var(--accent-2);" @click.prevent="goHome">去首页选择 ›</a>
          </div>
          <div class="chip-group">
            <template v-if="muscles.length">
              <span v-for="m in muscles" :key="m" class="chip active" @click="removeMuscle(m)">{{ m }} ✕</span>
            </template>
            <span v-else class="mute" style="font-size:12.5px;">未选择部位，将默认生成全身计划</span>
          </div>
          <div class="divider"></div>

          <div class="field">
            <label class="label"><Icon name="target" /> 训练目标</label>
            <div class="chip-group">
              <span
                v-for="g in goalOpts"
                :key="g.v"
                class="chip"
                :class="{ active: opts.goal === g.v }"
                @click="opts.goal = g.v"
              ><Icon :name="g.ic" /> {{ g.label }}</span>
            </div>
          </div>
          <div class="field">
            <label class="label"><Icon name="bolt" /> 难度等级</label>
            <div class="chip-group">
              <span
                v-for="d in diffOpts"
                :key="d.v"
                class="chip"
                :class="{ active: opts.difficulty === d.v }"
                @click="opts.difficulty = d.v"
              ><Icon :name="d.ic" /> {{ d.label }}</span>
            </div>
          </div>
          <div class="field">
            <label class="label"><Icon name="calendar" /> 每周训练天数</label>
            <div class="chip-group">
              <span
                v-for="n in freqOpts"
                :key="n"
                class="chip"
                :class="{ active: opts.frequency === n }"
                @click="opts.frequency = n"
              >{{ n }} 天</span>
            </div>
          </div>
          <div class="field">
            <label class="label"><Icon name="calendar" /> 计划周期</label>
            <div class="chip-group">
              <span
                v-for="n in weeksOpts"
                :key="n"
                class="chip"
                :class="{ active: opts.weeks === n }"
                @click="opts.weeks = n"
              >{{ n }} 周</span>
            </div>
          </div>

          <div class="card" style="background:rgba(46,204,113,0.06);border-color:rgba(46,204,113,0.2);margin-top:6px;">
            <div class="flex items-center justify-between">
              <span style="font-size:13px;font-weight:600;"><Icon name="watch" /> 智能设备数据</span>
              <button class="btn btn-sm btn-ghost" @click="connectDevice">
                {{ deviceConnected ? '已连接 ✓' : (connecting ? '连接中…' : '连接设备') }}
              </button>
            </div>
            <div class="mute" style="font-size:12px;margin-top:8px;">{{ deviceInfo }}</div>
          </div>

          <button class="btn btn-primary btn-block btn-lg" style="margin-top:18px;" :disabled="generating" @click="generate">
            <Icon :name="generating ? 'hourglass' : 'rocket'" />
            {{ generating ? 'AI 正在生成（约 10-60 秒）…' : '生成训练计划' }}
          </button>
        </div>

        <div class="card">
          <div class="card-title">
            <span class="ct-ico"><Icon name="clipboard" /></span> 计划预览 <span class="ct-sub">{{ planSub }}</span>
          </div>

          <div v-if="!currentPlan">
            <div class="empty">
              <div class="empty-ico"><Icon name="clipboard" :size="44" /></div>
              <div class="empty-title">配置参数后点击生成</div>
              <div class="empty-hint">系统将按「复合动作优先」自动编排</div>
            </div>
          </div>

          <template v-else>
            <div class="card" style="background:linear-gradient(135deg,rgba(255,107,53,0.12),rgba(255,140,66,0.04));border-color:rgba(255,107,53,0.3);">
              <div class="flex items-center justify-between flex-wrap gap-8">
                <div>
                  <div style="font-size:17px;font-weight:800;display:flex;align-items:center;gap:8px;">
                    {{ currentPlan.name }}
                    <span v-if="currentPlan.source === 'ai'" class="tag tag-accent">AI 生成</span>
                    <span v-else-if="currentPlan.source === 'template'" class="tag">模板</span>
                  </div>
                  <div class="mute" style="font-size:12px;margin-top:4px;">
                    {{ currentPlan.days.length }} 个训练日 · 共 {{ totalEx }} 个动作 · {{ currentPlan.weeks }} 周
                  </div>
                </div>
                <div class="flex gap-8">
                  <button class="btn btn-sm btn-ghost" @click="savePlan"><Icon name="save" /> 保存计划</button>
                  <button class="btn btn-sm btn-primary" @click="startPlan(currentPlan)">▶ 开始训练</button>
                </div>
              </div>
              <div v-if="currentPlan.deviceNote" style="margin-top:12px;font-size:12px;color:var(--green-ink);">
                <Icon name="watch" /> {{ currentPlan.deviceNote }}
                <template v-if="currentPlan.intensityNote"> · {{ currentPlan.intensityNote }}</template>
              </div>
            </div>

            <div class="grid grid-2" style="margin-top:16px;">
              <div v-for="(d, di) in currentPlan.days" :key="di" class="day-card">
                <div class="day-head">
                  <span class="day-badge">{{ d.day }}</span>
                  <span style="font-weight:700;font-size:14px;">{{ d.name }}</span>
                  <span class="mute" style="margin-left:auto;font-size:12px;">{{ d.exercises.length }} 动作</span>
                  <button class="btn btn-sm btn-ghost" @click="addExerciseToDay(di)">＋</button>
                </div>
                <div v-for="(e, ei) in d.exercises" :key="ei" class="ex-row">
                  <span class="ex-idx">{{ ei + 1 }}</span>
                  <span class="ex-nm">{{ e.name }}</span>
                  <span class="ex-sr">{{ e.sets }}组 × {{ e.reps }} · 休息{{ e.rest }}s</span>
                  <span class="ex-del" @click="removeExercise(di, ei)">✕</span>
                </div>
              </div>
            </div>

            <div v-if="currentPlan.tips && currentPlan.tips.length" class="card" style="margin-top:16px;">
              <div class="card-title" style="font-size:13.5px;"><Icon name="bulb" /> 训练建议</div>
              <div style="font-size:13px;line-height:1.9;color:var(--text-dim);">
                <template v-for="(t, i) in currentPlan.tips" :key="i">· {{ t }}<br></template>
              </div>
            </div>
          </template>
        </div>
      </div>
    </section>

    <!-- 我的计划 -->
    <section v-show="tab === 'mine'">
      <div v-if="!myPlans.length">
        <div class="empty">
          <div class="empty-ico"><Icon name="inbox" :size="44" /></div>
          <div class="empty-title">还没有保存的计划</div>
          <div class="empty-hint">在「生成计划」中生成并保存，或使用计划模板</div>
        </div>
      </div>
      <div v-else>
        <div v-for="p in myPlans" :key="p.id" class="card" style="margin-bottom:16px;">
          <div class="flex items-center justify-between flex-wrap gap-12">
            <div>
              <div style="font-size:16px;font-weight:700;">{{ p.name }}</div>
              <div class="flex flex-wrap gap-8" style="margin-top:8px;">
                <span class="tag tag-accent">{{ p.goal }}</span>
                <span class="tag">{{ p.frequency }}天/周</span>
                <span class="tag">{{ p.weeks }}周</span>
                <span class="tag">{{ p.days ? p.days.length : 0 }} 个训练日</span>
              </div>
            </div>
            <div class="flex gap-8">
              <button class="btn btn-sm btn-ghost" @click="viewPlan(p)">查看</button>
              <button class="btn btn-sm btn-primary" @click="startSaved(p)">开始</button>
              <button class="btn btn-sm btn-danger" @click="deletePlan(p)">删除</button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 计划模板 -->
    <section v-show="tab === 'tpl'">
      <div class="grid grid-2">
        <div v-for="t in templates" :key="t.key" class="tpl-card">
          <div style="font-size:16px;font-weight:700;">{{ t.name }}</div>
          <div class="mute" style="font-size:12.5px;margin:6px 0 12px;">{{ t.desc }}</div>
          <div class="flex flex-wrap gap-8" style="margin-bottom:14px;">
            <span class="tag tag-accent">{{ t.goal }}</span>
            <span class="tag">{{ t.frequency }}天/周</span>
            <span class="tag">{{ t.difficulty === 1 ? '入门' : t.difficulty === 2 ? '进阶' : '专业' }}</span>
          </div>
          <div class="mute" style="font-size:12px;margin-bottom:14px;">目标部位：{{ t.muscles.join(' · ') }}</div>
          <button class="btn btn-primary btn-block" @click="useTemplate(t)">使用此模板</button>
        </div>
      </div>
    </section>
  </div>
</template>
