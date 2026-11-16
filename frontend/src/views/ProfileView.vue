<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import Icon from '@/components/Icon.vue'

const C = window.Common
const S = window.Store
const router = useRouter()

const user = ref(S.currentUser())
const profile = ref(S.getProfile())
const goal = ref(profile.value.goal)
const experience = ref(profile.value.experience)
const importFile = ref(null)

const GOALS = ['增肌', '减脂', '塑形', '维持']
const EXPS = ['新手', '进阶', '高级']

const form = reactive({
  gender: profile.value.gender,
  birthdate: profile.value.birthdate,
  height: profile.value.height,
  weight: profile.value.weight,
  activity: profile.value.activity
})

const bmi = computed(() => C.calcBMI(profile.value.weight, profile.value.height))
const cat = computed(() => C.bmiCategory(bmi.value))
const bmr = computed(() => C.calcBMR(profile.value))
const tdee = computed(() => C.calcTDEE(profile.value))
const macro = computed(() => C.macroTargets(profile.value))
const age = computed(() => C.ageFromBirth(profile.value.birthdate))
const aboutEx = (window.MYOMAP_EXERCISES || []).length

function goLogin() { router.push({ name: 'login', query: { next: 'profile' } }) }

// ---------- 云端同步（可选后端） ----------
const sync = ref({ backend: false, pending: 0, lastAt: 0, lastMsg: '' })
const syncing = ref(false)
function refreshSync() { sync.value = window.Sync ? window.Sync.status() : { backend: false, pending: 0, lastAt: 0, lastMsg: '' } }
function doSync() {
  if (!window.Sync) return
  if (!sync.value.backend) { C.toast('当前是本地账号，登录后端账号后才能同步', 'warn'); return }
  syncing.value = true
  window.Sync.syncAll().then((r) => {
    syncing.value = false; refreshSync()
    C.toast((r && r.msg) || '同步完成', r && r.ok ? 'ok' : 'warn')
  }).catch(() => { syncing.value = false; refreshSync() })
}
onMounted(refreshSync)

function logout() {
  C.confirmModal('退出登录', '确定退出当前账号吗？本地数据将保留。', () => {
    S.logout()
    router.push({ name: 'login' })
  }, '退出')
}

function save() {
  const height = Number(form.height)
  const weight = Number(form.weight)
  if (!height || !weight) { C.toast('请填写身高与体重', 'warn'); return }
  profile.value = S.saveProfile({
    gender: form.gender,
    birthdate: form.birthdate,
    height: height,
    weight: weight,
    goal: goal.value,
    experience: experience.value,
    activity: Number(form.activity)
  })
  C.toast('档案已保存，身体指标已更新', 'ok')
}

function exportData() {
  const data = {}
  Object.values(S.KEYS).forEach((k) => {
    const v = localStorage.getItem(k)
    if (v != null) data[k] = v
  })
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k.indexOf('myomap:') === 0) data[k] = localStorage.getItem(k)
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'myomap-backup-' + S.todayStr() + '.json'
  a.click()
  C.toast('数据已导出', 'ok')
}

function triggerImport() { if (importFile.value) importFile.value.click() }

function onImport(e) {
  const f = e.target.files[0]
  if (!f) return
  const reader = new FileReader()
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result)
      Object.keys(data).forEach((k) => { if (k.indexOf('myomap:') === 0) localStorage.setItem(k, data[k]) })
      C.toast('数据导入成功，正在刷新…', 'ok')
      setTimeout(() => location.reload(), 800)
    } catch (err) { C.toast('导入失败：文件格式错误', 'err') }
  }
  reader.readAsText(f)
}

function clearData() {
  C.confirmModal('清空数据', '将清空当前账号的所有训练、身体与饮食数据（账号保留）。确定继续吗？', () => {
    [S.KEYS.profile, S.KEYS.body, S.KEYS.plans, S.KEYS.logs, S.KEYS.diet, S.KEYS.chat, S.KEYS.device, S.KEYS.custom].forEach((k) => {
      localStorage.removeItem(k + ':' + S.currentUser().id)
    })
    C.toast('数据已清空', 'ok')
    setTimeout(() => location.reload(), 700)
  }, '清空')
}
</script>

<template>
  <div>
    <div class="card">
      <div class="profile-hero">
        <div class="avatar-lg">{{ C.userInitial() }}</div>
        <div>
          <div style="font-size:19px;font-weight:800;">{{ user.username }}</div>
          <div class="mute" style="font-size:13px;margin-top:5px;">
            {{ user.guest ? '游客模式 · 数据仅保存在本地' : (user.email || '本地账号') }} · 注册于 {{ C.fmtDate(user.loginAt || new Date()) }}
          </div>
        </div>
        <div class="flex gap-8" style="margin-left:auto;">
          <button v-if="user.guest" class="btn btn-primary" @click="goLogin">登录 / 注册</button>
          <button v-else class="btn btn-ghost" @click="logout">退出登录</button>
        </div>
      </div>
    </div>

    <div class="grid grid-4" style="margin-top:18px;">
      <div class="stat">
        <span class="stat-ico"><Icon name="ruler" /></span>
        <span class="stat-val">{{ bmi || '—' }}</span>
        <span class="stat-label">BMI <span class="tag" :class="cat.cls" style="font-size:10px;">{{ cat.label }}</span></span>
      </div>
      <div class="stat">
        <span class="stat-ico"><Icon name="flame" /></span>
        <span class="stat-val">{{ bmr || '—' }}<small>kcal</small></span>
        <span class="stat-label">基础代谢 BMR</span>
      </div>
      <div class="stat">
        <span class="stat-ico"><Icon name="bolt" /></span>
        <span class="stat-val">{{ tdee || '—' }}<small>kcal</small></span>
        <span class="stat-label">每日消耗 TDEE</span>
      </div>
      <div class="stat">
        <span class="stat-ico"><Icon name="utensils" /></span>
        <span class="stat-val">{{ macro.kcal }}<small>kcal</small></span>
        <span class="stat-label">建议摄入（{{ goal }}）</span>
      </div>
    </div>

    <div class="grid grid-2" style="margin-top:18px;align-items:start;">
      <div class="card">
        <div class="card-title"><span class="ct-ico"><Icon name="user" /></span> 个人档案</div>
        <div class="input-row">
          <div class="field">
            <label class="label">性别</label>
            <select v-model="form.gender" class="select"><option value="male">男</option><option value="female">女</option></select>
          </div>
          <div class="field"><label class="label">出生日期</label><input v-model="form.birthdate" class="input" type="date"></div>
        </div>
        <div class="input-row">
          <div class="field"><label class="label">身高 (cm)</label><input v-model="form.height" class="input" type="number"></div>
          <div class="field"><label class="label">体重 (kg)</label><input v-model="form.weight" class="input" type="number" step="0.1"></div>
        </div>
        <div class="field">
          <label class="label">健身目标</label>
          <div class="chip-group">
            <span v-for="g in GOALS" :key="g" class="chip" :class="{ active: goal === g }" @click="goal = g">{{ g }}</span>
          </div>
        </div>
        <div class="field">
          <label class="label">健身经验</label>
          <div class="chip-group">
            <span v-for="x in EXPS" :key="x" class="chip" :class="{ active: experience === x }" @click="experience = x">{{ x }}</span>
          </div>
        </div>
        <div class="field">
          <label class="label">活动水平</label>
          <select v-model="form.activity" class="select">
            <option v-for="a in C.ACTIVITY" :key="a.v" :value="a.v">{{ a.label }}</option>
          </select>
        </div>
        <button class="btn btn-primary btn-block btn-lg" @click="save"><Icon name="save" /> 保存档案</button>
      </div>

      <div>
        <div class="card">
          <div class="card-title"><span class="ct-ico"><Icon name="calculator" /></span> 身体指标解读</div>
          <div class="mute" style="font-size:13px;line-height:1.9;">
            • 年龄：{{ age }} 岁 · 性别：{{ profile.gender === 'female' ? '女' : '男' }}<br>
            • BMI {{ bmi || '—' }}（{{ cat.label }}）<br>
            • 基础代谢 {{ bmr || '—' }} kcal，按活动水平估算每日总消耗 {{ tdee || '—' }} kcal<br>
            • 目标「{{ goal }}」建议每日摄入约 <b class="highlight-num">{{ macro.kcal }} kcal</b><br>
            • 建议宏量：蛋白质 {{ macro.protein }}g · 碳水 {{ macro.carb }}g · 脂肪 {{ macro.fat }}g<br>
            • 公式：Mifflin-St Jeor（BMR） × 活动系数（TDEE）
          </div>
        </div>
        <div class="card">
          <div class="card-title"><span class="ct-ico"><Icon name="save" /></span> 数据管理</div>
          <div class="mute" style="font-size:12.5px;line-height:1.8;margin-bottom:14px;">本地优先：所有数据保存在你的浏览器中。建议定期导出备份（对应 SRS R-07）。</div>
          <div class="flex flex-wrap gap-8">
            <button class="btn btn-ghost" @click="exportData"><Icon name="download" /> 导出数据 (JSON)</button>
            <button class="btn btn-ghost" @click="triggerImport"><Icon name="upload" /> 导入数据</button>
            <button class="btn btn-danger" @click="clearData"><Icon name="trash" /> 清空我的数据</button>
          </div>
          <input ref="importFile" type="file" accept="application/json" class="hidden" @change="onImport">
        </div>
        <div class="card">
          <div class="card-title"><span class="ct-ico"><Icon name="upload" /></span> 云端同步（可选后端）</div>
          <div class="kv"><span class="k">账号类型</span><span class="v">{{ sync.backend ? '后端账号 · 数据镜像到 MySQL' : '本地账号 · 仅保存在浏览器' }}</span></div>
          <div class="kv"><span class="k">待同步</span><span class="v">{{ sync.pending }} 条</span></div>
          <div class="kv"><span class="k">最近同步</span><span class="v">{{ sync.lastAt ? C.fmtDateTime(new Date(sync.lastAt)) : '尚未同步' }}</span></div>
          <div class="mute" style="font-size:12.5px;line-height:1.8;margin:10px 0 14px;">
            本地优先：所有数据先写浏览器，再异步镜像到服务器；后端不可用时自动保留待同步队列，恢复后自动补推。后端账号登录时会自动认领本地账号时期的数据。
          </div>
          <div class="flex flex-wrap gap-8">
            <button class="btn btn-primary" :disabled="syncing || !sync.backend" @click="doSync">
              <Icon name="upload" /> {{ syncing ? '同步中…' : '立即同步' }}
            </button>
            <button class="btn btn-ghost" @click="refreshSync"><Icon name="refresh" /> 刷新状态</button>
          </div>
          <div class="mute" style="font-size:11.5px;margin-top:10px;">{{ sync.lastMsg || '—' }}</div>
        </div>
        <div class="card">
          <div class="card-title"><span class="ct-ico">ℹ</span> 关于</div>
          <div class="kv"><span class="k">系统版本</span><span class="v">MyoMap v1.0</span></div>
          <div class="kv"><span class="k">架构</span><span class="v">本地优先 + 可选后端</span></div>
          <div class="kv"><span class="k">动作库</span><span class="v">{{ aboutEx }} 个内置动作</span></div>
          <div class="kv"><span class="k">数据存储</span><span class="v">localStorage / MySQL</span></div>
          <div class="kv"><span class="k">动态壁纸</span><span class="v"><a href="wallpaper/index.html" target="_blank" style="color:var(--accent-2);">打开 ›</a></span></div>
          <div class="mute" style="font-size:11.5px;margin-top:14px;"><Icon name="alert" /> 本系统不提供医疗建议，所有健康数据仅供参考。</div>
        </div>
      </div>
    </div>
  </div>
</template>
