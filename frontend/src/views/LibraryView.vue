<script setup>
import { ref, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import Icon from '@/components/Icon.vue'

const C = window.Common
const S = window.Store
const router = useRouter()
const route = useRoute()

const PAGE_SIZE = 48
const CUSTOM_TYPES = ['推', '拉', '蹲', '举', '弯举', '卷腹', '拉伸']

const guest = ref(S.isGuest())
const q = ref('')
const muscle = ref('')
const diffMode = ref('')   // '' | 初级 | 中级 | 高级 | midhigh(中级+高级)
const equipment = ref('')
const sort = ref('default')
const shown = ref(PAGE_SIZE)
const customVersion = ref(0)
const imgErrors = ref({})

const stats = computed(() => C.muscleStats())

const statCards = computed(() => [
  { key: 'all', icon: 'dumbbell', val: stats.value.total, label: '动作总数' },
  { key: 'muscles', icon: 'target', val: stats.value.muscles, label: '覆盖肌群' },
  { key: '初级', icon: 'sprout', val: stats.value.byDiff['初级'], label: '初级动作' },
  { key: 'midhigh', icon: 'award', val: stats.value.byDiff['中级'] + stats.value.byDiff['高级'], label: '中 / 高级动作' }
])

const filtered = computed(() => {
  void customVersion.value
  let list = C.searchExercises({
    q: q.value,
    muscle: muscle.value,
    equipment: equipment.value
  })
  if (diffMode.value === 'midhigh') {
    list = list.filter((e) => e.difficulty === '中级' || e.difficulty === '高级')
  } else if (diffMode.value) {
    list = list.filter((e) => e.difficulty === diffMode.value)
  }
  if (sort.value === 'compound') list = C.sortByCompound(list)
  else if (sort.value === 'name') list = list.slice().sort((a, b) => a.name.localeCompare(b.name, 'zh'))
  return list
})

const byDiff = computed(() => {
  const d = { '初级': 0, '中级': 0, '高级': 0 }
  filtered.value.forEach((e) => { if (d[e.difficulty] != null) d[e.difficulty]++ })
  return d
})

const visible = computed(() => filtered.value.slice(0, shown.value))
const remaining = computed(() => filtered.value.length - shown.value)

watch(filtered, () => { shown.value = PAGE_SIZE })

function reset() {
  q.value = ''
  muscle.value = ''
  diffMode.value = ''
  equipment.value = ''
  sort.value = 'default'
}

// 依据 URL 参数初始化筛选（供统计卡 / 肌群页 / 首页跳转）
function applyQuery() {
  const rq = route.query
  muscle.value = rq.muscle ? String(rq.muscle) : ''
  diffMode.value = rq.diff ? String(rq.diff) : ''
  equipment.value = rq.equipment ? String(rq.equipment) : ''
  q.value = rq.q ? String(rq.q) : ''
}
applyQuery()
watch(() => route.query, applyQuery)

// 统计卡 → 跳转具体分类页
function goStat(key) {
  if (key === 'muscles') { router.push({ name: 'muscles' }); return }
  if (key === 'all') { router.push({ name: 'library' }); return }
  // 初级 / midhigh → 难度分类页
  router.push({ name: 'level', query: { lvl: key } })
}

function openDetail(name) { C.showExerciseDetail(name) }
function beginner() { C.beginnerGuideModal() }
function loadMore() { shown.value += PAGE_SIZE }
function onImgError(name) { imgErrors.value = { ...imgErrors.value, [name]: true } }

function requireLogin() {
  if (S.isLoggedIn()) return true
  router.push({ name: 'login', query: { next: 'library' } })
  return false
}

function addToPlan(name) {
  if (!requireLogin()) return
  const ex = C.findExercise(name)
  const sel = JSON.parse(localStorage.getItem('myomap:selection') || '[]')
  if (ex && ex.muscle && sel.indexOf(ex.muscle) === -1) sel.push(ex.muscle)
  localStorage.setItem('myomap:selection', JSON.stringify(sel))
  const draft = JSON.parse(localStorage.getItem('myomap:draftExercises') || '[]')
  if (draft.indexOf(name) === -1) draft.push(name)
  localStorage.setItem('myomap:draftExercises', JSON.stringify(draft))
  C.toast('已加入计划草稿：' + name, 'ok')
}

function addToWorkout(name) {
  if (!requireLogin()) return
  const list = JSON.parse(localStorage.getItem('myomap:workoutQueue') || '[]')
  if (list.indexOf(name) === -1) list.push(name)
  localStorage.setItem('myomap:workoutQueue', JSON.stringify(list))
  C.toast('已加入训练队列（' + list.length + ' 个动作）', 'ok')
}

function addCustom() {
  if (!requireLogin()) return
  const m = C.openModal(
    '<div class="modal-title">＋ 新增自定义动作</div>' +
    '<div class="modal-sub">创建属于你的训练动作</div>' +
    '<div class="field"><label class="label">动作名称</label><input class="input" id="ce-name" placeholder="如：地雷管推举"></div>' +
    '<div class="input-row">' +
      '<div class="field"><label class="label">目标肌群</label><select class="select" id="ce-muscle">' +
        C.MUSCLE_GROUPS.map((x) => '<option>' + C.esc(x) + '</option>').join('') + '</select></div>' +
      '<div class="field"><label class="label">动作类型</label><select class="select" id="ce-type">' +
        CUSTOM_TYPES.map((x) => '<option>' + x + '</option>').join('') + '</select></div>' +
    '</div>' +
    '<div class="input-row">' +
      '<div class="field"><label class="label">难度</label><select class="select" id="ce-diff">' +
        C.DIFFICULTIES.map((x) => '<option>' + x + '</option>').join('') + '</select></div>' +
      '<div class="field"><label class="label">器械</label><input class="input" id="ce-equip" placeholder="如：杠铃"></div>' +
    '</div>' +
    '<div class="field"><label class="label">备注 / 动作说明</label><textarea class="textarea" id="ce-note" placeholder="动作要点…"></textarea></div>' +
    '<div class="flex gap-12" style="justify-content:flex-end;">' +
      '<button class="btn btn-ghost" data-x>取消</button><button class="btn btn-primary" data-ok>保存动作</button></div>')
  m.el.querySelector('[data-x]').onclick = m.close
  m.el.querySelector('[data-ok]').onclick = () => {
    const name = m.el.querySelector('#ce-name').value.trim()
    if (!name) { C.toast('请填写动作名称', 'warn'); return }
    S.addCustomExercise({
      name: name,
      en: '',
      muscle: m.el.querySelector('#ce-muscle').value,
      bodyPart: '',
      type: m.el.querySelector('#ce-type').value,
      difficulty: m.el.querySelector('#ce-diff').value,
      equipment: m.el.querySelector('#ce-equip').value || '其他',
      instructions: m.el.querySelector('#ce-note').value || '自定义动作',
      tips: '',
      gif: ''
    })
    m.close()
    C.toast('自定义动作已保存', 'ok')
    customVersion.value++
  }
}

function goLogin() { router.push({ name: 'login', query: { next: 'library' } }) }
</script>

<template>
  <div>
    <div v-if="guest" class="guest-bar">
      <Icon name="user" /> <b>游客模式</b>：可自由浏览与搜索动作库；登录后可创建自定义动作并加入训练计划。
      <a class="btn btn-sm btn-primary" href="#" @click.prevent="goLogin">立即登录</a>
    </div>

    <div class="grid grid-4" style="margin-bottom:18px;">
      <div v-for="it in statCards" :key="it.label" class="stat stat-linkable" @click="goStat(it.key)">
        <span class="stat-ico"><Icon :name="it.icon" :size="20" /></span>
        <span class="stat-val">{{ it.val }}</span>
        <span class="stat-label">{{ it.label }}</span>
        <span class="stat-go">查看 <Icon name="arrowRight" :size="12" /></span>
      </div>
    </div>

    <div class="card">
      <div class="flex flex-wrap gap-12 items-center">
        <input v-model="q" class="input" placeholder="搜索动作名称 / 肌群 / 器械…" style="flex:1;min-width:220px;">
        <select v-model="diffMode" class="select" aria-label="按难度筛选" style="width:150px;">
          <option value="">全部难度</option>
          <option v-for="d in C.DIFFICULTIES" :key="d" :value="d">{{ d }}</option>
          <option value="midhigh">中 / 高级</option>
        </select>
        <select v-model="equipment" class="select" aria-label="按器械筛选" style="width:150px;">
          <option value="">全部器械</option>
          <option v-for="e in C.EQUIPMENTS" :key="e" :value="e">{{ e }}</option>
        </select>
        <button class="btn btn-ghost" @click="reset">重置</button>
        <button class="btn btn-ghost" @click="beginner"><Icon name="sprout" :size="14" /> 新手入门指导</button>
        <button class="btn btn-primary" @click="addCustom">＋ 自定义动作</button>
      </div>
      <div class="divider"></div>
      <div class="tabs" style="margin-bottom:0;">
        <button class="tab" :class="{ active: muscle === '' }" @click="muscle = ''">全部肌群 {{ stats.total }}</button>
        <button
          v-for="m in C.MUSCLE_GROUPS"
          :key="m"
          class="tab"
          :class="{ active: muscle === m }"
          @click="muscle = m"
        >{{ m }} <span class="mute">{{ stats.byMuscle[m] || 0 }}</span></button>
      </div>
    </div>

    <div class="flex items-center justify-between" style="margin:18px 2px 12px;">
      <div class="muted" style="font-size:13px;">
        共 <b class="highlight-num">{{ filtered.length }}</b> 个动作<span v-if="muscle"> · {{ muscle }}</span>
        · 初级 {{ byDiff['初级'] }} / 中级 {{ byDiff['中级'] }} / 高级 {{ byDiff['高级'] }}
        · <span class="mute">点击卡片查看分步指导</span>
      </div>
      <select v-model="sort" class="select" aria-label="排序方式" style="width:170px;">
        <option value="default">默认排序</option>
        <option value="compound">复合动作优先</option>
        <option value="name">按名称</option>
      </select>
    </div>

    <div class="ex-grid">
      <div v-if="!filtered.length" class="empty" style="grid-column:1/-1;">
        <div class="empty-ico"><Icon name="search" :size="44" /></div>
        <div class="empty-title">没有找到匹配的动作</div>
        <div class="empty-hint">试试更换筛选条件</div>
      </div>
      <div v-for="ex in visible" :key="ex.name" class="ex-card">
        <div class="ex-thumb" @click="openDetail(ex.name)">
          <img
            v-if="ex.gif && !imgErrors[ex.name]"
            :src="ex.gif"
            :alt="ex.name"
            loading="lazy"
            @error="onImgError(ex.name)"
          >
          <span v-else class="ex-ph"><Icon name="dumbbell" /></span>
        </div>
        <div class="ex-body">
          <div class="ex-name" @click="openDetail(ex.name)">{{ ex.name }}</div>
          <div class="ex-meta">
            <span class="tag tag-accent">{{ ex.muscle }}</span>
            <span class="tag">{{ ex.type }}</span>
            <span class="tag">{{ ex.difficulty }}</span>
          </div>
          <div class="ex-actions">
            <button class="btn btn-sm btn-ghost" style="flex:1;" @click.stop="openDetail(ex.name)"><Icon name="note" :size="13" /> 指导</button>
            <button class="btn btn-sm btn-ghost" style="flex:1;" @click.stop="addToPlan(ex.name)">加入计划</button>
            <button class="btn btn-sm btn-primary" style="flex:1;" @click.stop="addToWorkout(ex.name)">去训练</button>
          </div>
        </div>
      </div>
    </div>

    <div class="center" style="margin-top:22px;">
      <button v-if="remaining > 0" class="btn btn-ghost" @click="loadMore">加载更多（剩余 {{ remaining }} 个）</button>
    </div>
  </div>
</template>

<style scoped>
.stat-linkable { cursor: pointer; transition: transform .2s, border-color .2s, box-shadow .25s; }
.stat-linkable:hover { transform: translateY(-3px); border-color: var(--accent); box-shadow: var(--shadow-hover); }
.stat-go { margin-top: 4px; font-size: 11px; color: var(--accent-2); display: inline-flex; align-items: center; gap: 2px; }
</style>
