<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import Icon from '@/components/Icon.vue'

const C = window.Common
const S = window.Store
const router = useRouter()

const mode = ref('setup')
const queue = ref([])
const planName = ref('自由训练')
const logs = ref([])

const session = ref(null)
const cur = ref(0)
const paused = ref(false)
const elapsed = ref(0)
const restLeft = ref(60)
const restShow = ref(false)

let timerHandle = null
let restHandle = null

function queueFromStorage() {
  let q = []
  try { q = JSON.parse(localStorage.getItem('myomap:workoutQueue') || '[]') } catch (e) { q = [] }
  return q.map((item) => (typeof item === 'string' ? { name: item } : item))
}

function syncQueue() {
  queue.value = queueFromStorage()
  planName.value = localStorage.getItem('myomap:workoutPlanName') || '自由训练'
}

function refreshLogs() {
  logs.value = S.getLogs().slice(0, 5)
}

function findMeta(name) {
  return C.findExercise(name)
}

function fmtDur(s) {
  const m = Math.floor(s / 60)
  const ss = s % 60
  return m + ':' + String(ss).padStart(2, '0')
}

const stats = computed(() => {
  let volume = 0
  let setsDone = 0
  const byMuscle = {}
  if (session.value) {
    session.value.exercises.forEach((ex) => {
      ex.sets.forEach((s) => {
        if (s.done) {
          const v = (Number(s.weight) || 0) * (Number(s.reps) || 0)
          volume += v
          setsDone++
          byMuscle[ex.muscle] = (byMuscle[ex.muscle] || 0) + v
        }
      })
    })
  }
  return { volume: Math.round(volume), setsDone, byMuscle }
})

const currentEx = computed(() => (session.value ? session.value.exercises[cur.value] : null))

const lastEx = computed(() => {
  if (!currentEx.value) return null
  return findLastLog(currentEx.value.name)
})

function openPicker() {
  const all = C.sortByCompound(C.allExercises())
  const m = C.openModal(
    '<div class="modal-title">＋ 添加训练动作</div>' +
    '<input class="input" id="pk-q" placeholder=" 搜索动作…" style="margin:12px 0;">' +
    '<div id="pk-list" style="max-height:46vh;overflow-y:auto;display:flex;flex-direction:column;gap:6px;"></div>', { large: true })
  const listEl = m.el.querySelector('#pk-list')
  function paint(q) {
    q = (q || '').toLowerCase()
    const list = all.filter((e) => !q || e.name.toLowerCase().indexOf(q) >= 0).slice(0, 80)
    listEl.innerHTML = list.map((e) =>
      '<div class="ex-row" data-name="' + C.esc(e.name) + '" style="cursor:pointer;">' +
        '<span class="ex-nm">' + C.esc(e.name) + '</span>' +
        '<span class="tag tag-accent">' + C.esc(e.muscle) + '</span></div>').join('')
    listEl.querySelectorAll('[data-name]').forEach((r) => {
      r.onclick = () => {
        const q2 = queueFromStorage()
        if (!q2.some((x) => x.name === r.dataset.name)) q2.push({ name: r.dataset.name, sets: 3, reps: '10', rest: 60 })
        localStorage.setItem('myomap:workoutQueue', JSON.stringify(q2))
        m.close()
        syncQueue()
        C.toast('已添加：' + r.dataset.name, 'ok')
      }
    })
  }
  paint('')
  m.el.querySelector('#pk-q').addEventListener('input', C.debounce((e) => paint(e.target.value), 160))
}

function quickFullBody() {
  const quick = ['杠铃卧推', '杠铃深蹲', '杠铃俯身划船', '哑铃推举', '平板支撑']
  localStorage.setItem('myomap:workoutQueue', JSON.stringify(quick.map((n) => ({ name: n, sets: 3, reps: '10', rest: 60 }))))
  localStorage.setItem('myomap:workoutPlanName', '快速全身')
  syncQueue()
}

function startTimer() {
  clearInterval(timerHandle)
  timerHandle = setInterval(() => {
    if (!paused.value && session.value) {
      elapsed.value = Math.floor((Date.now() - session.value.startedAt) / 1000)
    }
  }, 1000)
}

function startSession() {
  const q = queue.value
  if (!q.length) return
  session.value = {
    planName: planName.value,
    startedAt: Date.now(),
    exercises: q.map((item) => {
      const meta = C.findExercise(item.name) || {}
      const targetSets = item.sets || 3
      const rows = []
      for (let i = 0; i < targetSets; i++) {
        rows.push({ weight: '', reps: item.reps && !isNaN(parseInt(item.reps)) ? parseInt(item.reps) : '', toFailure: false, done: false })
      }
      return { name: item.name, muscle: meta.muscle || '', rest: item.rest || 60, targetSets, targetReps: item.reps || '10', gif: meta.gif || '', sets: rows }
    })
  }
  cur.value = 0
  paused.value = false
  elapsed.value = 0
  mode.value = 'training'
  startTimer()
  C.toast('训练开始，加油！', 'ok')
}

function togglePause() {
  paused.value = !paused.value
  if (paused.value) {
    clearInterval(timerHandle)
    timerHandle = null
    C.toast('已暂停', 'warn')
  } else {
    startTimer()
    C.toast('继续训练', 'ok')
  }
}

function startRest(sec) {
  clearInterval(restHandle)
  restLeft.value = sec
  restShow.value = true
  restHandle = setInterval(() => {
    restLeft.value--
    if (restLeft.value <= 0) {
      clearInterval(restHandle)
      restShow.value = false
      C.toast('休息结束，开始下一组！', 'ok')
    }
  }, 1000)
}

function skipRest() {
  clearInterval(restHandle)
  restShow.value = false
}

function toggleFailure(si) {
  const s = session.value.exercises[cur.value].sets[si]
  s.toFailure = !s.toFailure
}

function toggleDone(si) {
  const ex = session.value.exercises[cur.value]
  const s = ex.sets[si]
  if (!s.done && (s.weight === '' || s.reps === '')) {
    C.toast('请先填写重量和次数', 'warn')
    return
  }
  s.done = !s.done
  if (s.done) startRest(ex.rest)
}

function adjustWeight(si, delta) {
  const s = session.value.exercises[cur.value].sets[si]
  const next = Math.max(0, (Number(s.weight) || 0) + delta * 10)
  s.weight = next === 0 ? '' : String(next)
}

function addSet() {
  session.value.exercises[cur.value].sets.push({ weight: '', reps: '', toFailure: false, done: false })
}

function delSet() {
  const sets = session.value.exercises[cur.value].sets
  if (sets.length > 1) sets.pop()
}

function prevExercise() {
  if (cur.value > 0) cur.value--
}

function nextExercise() {
  if (cur.value < session.value.exercises.length - 1) cur.value++
  else finishSession()
}

function findLastLog(name) {
  const list = S.getLogs()
  for (const l of list) {
    const ex = (l.exercises || []).find((e) => e.name === name)
    if (ex && ex.sets && ex.sets.length) {
      let best1RM = 0
      let bestSet = ''
      ex.sets.forEach((s) => {
        const orm = C.calc1RM(Number(s.weight), Number(s.reps))
        if (orm && orm > best1RM) { best1RM = orm; bestSet = s.weight + 'kg × ' + s.reps }
      })
      if (best1RM) return { best1RM, bestSet, date: l.startedAt }
    }
  }
  return null
}

function finishSession() {
  if (!session.value) return
  clearInterval(timerHandle)
  clearInterval(restHandle)
  restShow.value = false
  const st = stats.value
  const durationSec = Math.floor((Date.now() - session.value.startedAt) / 1000)
  const profile = S.getProfile()
  const weight = Number(profile.weight) || 70
  const calories = Math.round(6 * weight * (durationSec / 3600))

  const log = {
    planName: session.value.planName,
    startedAt: new Date(session.value.startedAt).toISOString(),
    endedAt: new Date().toISOString(),
    durationSec,
    totalVolume: st.volume,
    totalSets: st.setsDone,
    calories,
    exercises: session.value.exercises.map((e) => ({
      name: e.name,
      muscle: e.muscle,
      sets: e.sets.filter((s) => s.done).map((s) => ({ weight: Number(s.weight) || 0, reps: Number(s.reps) || 0, toFailure: !!s.toFailure }))
    })).filter((e) => e.sets.length)
  }
  S.addLog(log)
  localStorage.removeItem('myomap:workoutQueue')
  localStorage.removeItem('myomap:workoutPlanName')
  showReport(log)
  session.value = null
  mode.value = 'setup'
  syncQueue()
  refreshLogs()
}

function showReport(log) {
  const muscleDist = {}
  log.exercises.forEach((e) => {
    const v = e.sets.reduce((s, x) => s + x.weight * x.reps, 0)
    muscleDist[e.muscle || '其他'] = (muscleDist[e.muscle || '其他'] || 0) + v
  })
  const totalV = Object.values(muscleDist).reduce((a, b) => a + b, 0) || 1
  const distHtml = Object.entries(muscleDist).sort((a, b) => b[1] - a[1]).map(([muscle, v]) =>
    '<div style="margin-bottom:10px;">' +
      '<div class="flex justify-between" style="font-size:12.5px;margin-bottom:4px;"><span>' + C.esc(muscle) + '</span><span class="mute">' + Math.round(v) + 'kg · ' + Math.round(v / totalV * 100) + '%</span></div>' +
      '<div class="progress"><i style="width:' + (v / totalV * 100) + '%"></i></div>' +
    '</div>').join('')

  const m = C.openModal(
    '<div class="modal-title">' + C.icon('award') + ' 训练报告</div>' +
    '<div class="modal-sub">' + C.esc(log.planName) + ' · ' + C.fmtDateTime(log.startedAt) + '</div>' +
    '<div class="grid grid-4" style="margin-bottom:20px;">' +
      '<div class="stat"><span class="stat-ico">' + C.icon('timer') + '</span><span class="stat-val">' + fmtDur(log.durationSec) + '</span><span class="stat-label">总时长</span></div>' +
      '<div class="stat"><span class="stat-ico">' + C.icon('dumbbell') + '</span><span class="stat-val">' + log.totalSets + '<small>组</small></span><span class="stat-label">完成组数</span></div>' +
      '<div class="stat"><span class="stat-ico">' + C.icon('box') + '</span><span class="stat-val">' + log.totalVolume + '<small>kg</small></span><span class="stat-label">总容量</span></div>' +
      '<div class="stat"><span class="stat-ico">' + C.icon('flame') + '</span><span class="stat-val">' + log.calories + '<small>kcal</small></span><span class="stat-label">消耗热量</span></div>' +
    '</div>' +
    '<div class="card-title" style="font-size:13.5px;">各部位训练占比</div>' +
    (distHtml || '<div class="mute">无数据</div>') +
    '<div class="flex gap-12" style="justify-content:flex-end;margin-top:20px;">' +
      '<button class="btn btn-ghost" data-close>返回</button>' +
      '<button class="btn btn-primary" data-history>查看历史</button>' +
    '</div>', { large: true })
  m.el.querySelector('[data-close]').onclick = () => m.close()
  m.el.querySelector('[data-history]').onclick = () => { m.close(); router.push({ name: 'workout' }) }
}

function onGifError(e) {
  e.target.style.display = 'none'
}

onMounted(() => {
  syncQueue()
  refreshLogs()
})

onBeforeUnmount(() => {
  clearInterval(timerHandle)
  clearInterval(restHandle)
})
</script>

<template>
  <div>
    <!-- 准备训练 -->
    <div v-if="mode === 'setup'" class="grid grid-2" style="align-items:start;">
      <div class="card">
        <div class="card-title">
          <span class="ct-ico"><Icon name="clipboard" /></span> 本次训练动作 <span class="ct-sub">{{ planName }}</span>
        </div>
        <div v-if="queue.length" style="display:flex;flex-direction:column;gap:8px;">
          <div v-for="(e, i) in queue" :key="i" class="ex-row">
            <span class="ex-idx">{{ i + 1 }}</span>
            <span class="ex-nm">{{ e.name }}</span>
            <span class="ex-sr">{{ findMeta(e.name) ? findMeta(e.name).muscle : '' }}</span>
            <span class="ex-sr">{{ e.sets || 3 }}组 × {{ e.reps || '10' }}</span>
          </div>
        </div>
        <div v-else class="empty">
          <div class="empty-ico"><Icon name="dumbbell" /></div>
          <div class="empty-title">训练队列为空</div>
          <div class="empty-hint">从动作库或训练计划添加动作，或直接快速开始</div>
        </div>
        <div class="flex gap-8" style="margin-top:16px;">
          <button class="btn btn-ghost" @click="openPicker">＋ 添加动作</button>
          <button class="btn btn-ghost" @click="quickFullBody"><Icon name="bolt" /> 快速全身</button>
          <button class="btn btn-primary" style="margin-left:auto;" :disabled="!queue.length" @click="startSession">▶ 开始训练</button>
        </div>
      </div>
      <div class="card">
        <div class="card-title"><span class="ct-ico"><Icon name="trendingUp" /></span> 最近训练</div>
        <div>
          <div v-if="!logs.length" class="mute" style="font-size:13px;padding:10px 0;">暂无训练记录</div>
          <div v-for="l in logs" :key="l.id" class="kv">
            <span class="k">{{ C.fmtDate(l.startedAt) }} · {{ l.planName || '训练' }}</span>
            <span class="v">{{ l.totalSets }}组 · {{ Math.round(l.totalVolume) }}kg</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 训练模式 -->
    <template v-else-if="mode === 'training' && currentEx">
      <div class="card" style="position:sticky;top:70px;z-index:20;">
        <div class="timer-bar">
          <div class="timer-item"><div class="tv">{{ fmtDur(elapsed) }}</div><div class="tl">训练时长</div></div>
          <div class="timer-item"><div class="tv">{{ stats.setsDone }}</div><div class="tl">已完成组数</div></div>
          <div class="timer-item"><div class="tv">{{ stats.volume }}<small style="font-size:12px;">kg</small></div><div class="tl">总容量</div></div>
          <div class="timer-item"><div class="tv">{{ cur + 1 }}/{{ session.exercises.length }}</div><div class="tl">动作进度</div></div>
          <div style="margin-left:auto;" class="flex gap-8">
            <button class="btn btn-sm btn-ghost" @click="togglePause">
              <Icon :name="paused ? 'play' : 'pause'" /> {{ paused ? '继续' : '暂停' }}
            </button>
            <button class="btn btn-sm btn-danger" @click="finishSession">结束训练</button>
          </div>
        </div>
      </div>

      <div class="flex flex-wrap gap-8" style="margin:18px 0;">
        <span
          v-for="(e, i) in session.exercises"
          :key="i"
          class="ex-tab"
          :class="{ active: i === cur, done: e.sets.every((s) => s.done) }"
          @click="cur = i"
        >{{ e.sets.every((s) => s.done) ? '✓ ' : '' }}{{ e.name }}</span>
      </div>

      <div class="grid two-col" style="grid-template-columns:minmax(0,1fr) minmax(280px,360px);align-items:start;">
        <div class="card">
          <div class="flex items-center justify-between flex-wrap gap-8">
            <div>
              <div style="font-size:19px;font-weight:800;">{{ currentEx.name }}</div>
              <div class="mute" style="font-size:12.5px;margin-top:4px;">
                目标：{{ currentEx.targetSets }} 组 × {{ currentEx.targetReps }} 次 · 组间休息 {{ currentEx.rest }}s
              </div>
            </div>
            <span class="tag tag-accent">{{ currentEx.muscle }}</span>
          </div>
          <div class="divider"></div>
          <div class="table-scroll">
            <table class="set-table">
              <thead>
                <tr><th>组</th><th>重量 (kg)</th><th>次数</th><th>力竭</th><th>1RM</th><th>完成</th></tr>
              </thead>
              <tbody>
                <tr v-for="(s, si) in currentEx.sets" :key="si" :class="{ done: s.done }">
                  <td><b>{{ si + 1 }}</b></td>
                  <td>
                    <div class="wt-cell">
                      <button type="button" class="wt-btn" @click="adjustWeight(si, -1)">−</button>
                      <input type="number" inputmode="decimal" step="10" min="0" v-model="s.weight" placeholder="0">
                      <button type="button" class="wt-btn" @click="adjustWeight(si, 1)">+</button>
                    </div>
                  </td>
                  <td><input type="number" inputmode="numeric" v-model="s.reps" placeholder="0"></td>
                  <td><button class="set-check" :class="{ on: s.toFailure }" @click="toggleFailure(si)">{{ s.toFailure ? '✓' : '' }}</button></td>
                  <td class="highlight-num">{{ C.calc1RM(Number(s.weight), Number(s.reps)) || '—' }}</td>
                  <td><button class="set-check" :class="{ on: s.done }" @click="toggleDone(si)">{{ s.done ? '✓' : '' }}</button></td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="flex gap-8" style="margin-top:14px;">
            <button class="btn btn-sm btn-ghost" @click="addSet">＋ 加一组</button>
            <button class="btn btn-sm btn-ghost" @click="delSet">－ 减一组</button>
            <span v-if="lastEx" class="mute" style="font-size:12px;margin-left:auto;">上次最佳：{{ lastEx.best1RM }}kg 1RM · {{ lastEx.bestSet }}</span>
          </div>
          <div class="flex gap-8" style="margin-top:16px;">
            <button class="btn btn-ghost" :disabled="cur === 0" @click="prevExercise">‹ 上一个</button>
            <button class="btn btn-primary" style="margin-left:auto;" @click="nextExercise">
              {{ cur === session.exercises.length - 1 ? '完成训练 ✓' : '下一个动作 ›' }}
            </button>
          </div>
        </div>

        <div class="card">
          <div class="card-title" style="font-size:13.5px;"><Icon name="image" /> 动作示意</div>
          <img
            v-if="currentEx.gif"
            :src="currentEx.gif"
            style="width:100%;border-radius:12px;background:var(--viewer-bg);"
            @error="onGifError"
          >
          <div v-else class="mute" style="font-size:12.5px;">暂无演示图</div>
          <div class="card-title" style="font-size:13.5px;margin-top:16px;"><Icon name="bulb" /> 要点</div>
          <div class="mute" style="font-size:12.5px;line-height:1.7;">{{ (C.findExercise(currentEx.name) || {}).tips || '保持动作标准，控制离心阶段。' }}</div>
        </div>
      </div>
    </template>

    <!-- 组间休息悬浮 -->
    <div class="rest-fab" :class="{ show: restShow }">
      <div class="rv">{{ restLeft }}</div>
      <div class="mute" style="font-size:11px;">组间休息</div>
      <button class="btn btn-sm btn-ghost" style="margin-top:8px;" @click="skipRest">跳过</button>
    </div>
  </div>
</template>
