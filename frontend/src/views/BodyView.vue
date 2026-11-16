<script setup>
import { ref, reactive, computed, onMounted, watch, nextTick } from 'vue'
import Icon from '@/components/Icon.vue'

const C = window.Common
const S = window.Store

const metrics = ref(S.getMetrics())
const profile = ref(S.getProfile())
const rangeDays = ref(30)
const weightChartEl = ref(null)
const RANGES = [7, 30, 90, 365]

const form = reactive({
  date: S.todayStr(),
  weight: '',
  fat: '',
  chest: '',
  waist: '',
  hip: '',
  arm: '',
  thigh: '',
  calf: '',
  note: ''
})

function reload() {
  metrics.value = S.getMetrics()
  profile.value = S.getProfile()
}

const top = computed(() => {
  const p = profile.value
  const m = metrics.value
  const latest = m[0] || {}
  const weight = latest.weight || p.weight
  const bmi = C.calcBMI(weight, p.height)
  const bmr = C.calcBMR(Object.assign({}, p, { weight: weight }))
  const tdee = C.calcTDEE(Object.assign({}, p, { weight: weight }))
  const cat = C.bmiCategory(bmi)
  const prev = m[1] || {}
  const delta = (latest.weight && prev.weight) ? (latest.weight - prev.weight) : null
  return { weight, bmi, bmr, tdee, cat, delta }
})

const weightSeries = computed(() => {
  const m = metrics.value.filter((x) => x.weight).slice().reverse()
  const cutoff = Date.now() - rangeDays.value * 86400000
  return m.filter((x) => new Date(x.date + 'T00:00:00').getTime() >= cutoff)
})

const weightSummary = computed(() => {
  const f = weightSeries.value
  if (!f.length) return null
  const first = f[0].weight
  const last = f[f.length - 1].weight
  return { first, last, delta: C.round(last - first, 1), up: last - first > 0 }
})

function drawWeight() {
  if (!weightChartEl.value) return
  C.lineChart(weightChartEl.value, [{ data: weightSeries.value.map((x) => x.weight), color: '#ff6b35' }], { height: 210 })
}

const radarSvg = computed(() => {
  const p = profile.value
  const m = metrics.value
  const latest = m[0] || {}
  const weight = latest.weight || p.weight
  const fat = latest.bodyFat != null ? latest.bodyFat : 18
  const bmi = C.calcBMI(weight, p.height) || 22
  const muscle = C.clamp(100 - fat * 1.6, 20, 95)
  const water = C.clamp(60 - fat * 0.3, 30, 80)
  const viscera = C.clamp(12 - fat * 0.1, 4, 18)
  const dims = [
    { label: '体重', v: C.clamp(100 - Math.abs(bmi - 22) * 4, 30, 100) },
    { label: '体脂', v: C.clamp(100 - fat * 2.2, 15, 100) },
    { label: '肌肉量', v: muscle },
    { label: '水分', v: water },
    { label: '内脏脂肪', v: C.clamp(100 - viscera * 4, 20, 100) },
    { label: 'BMI', v: C.clamp(100 - Math.abs(bmi - 22) * 4, 30, 100) }
  ]
  const size = 260, cx = size / 2, cy = size / 2, R = 92
  const n = dims.length
  function pt(i, r) { const a = -Math.PI / 2 + i * 2 * Math.PI / n; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r] }
  let svg = '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '">'
  for (let g = 1; g <= 4; g++) {
    const r = R * g / 4
    const pts = []
    for (let i = 0; i < n; i++) pts.push(pt(i, r).join(','))
    svg += '<polygon points="' + pts.join(' ') + '" fill="none" stroke="var(--surface-3)"/>'
  }
  for (let i = 0; i < n; i++) { const p2 = pt(i, R); svg += '<line x1="' + cx + '" y1="' + cy + '" x2="' + p2[0] + '" y2="' + p2[1] + '" stroke="var(--surface-3)"/>' }
  const dpts = dims.map((d, i) => pt(i, R * d.v / 100).join(','))
  svg += '<polygon points="' + dpts.join(' ') + '" fill="rgba(255,107,53,0.25)" stroke="#ff6b35" stroke-width="2"/>'
  dims.forEach((d, i) => {
    const p2 = pt(i, R + 18)
    svg += '<text x="' + p2[0] + '" y="' + p2[1] + '" fill="rgba(232,237,245,0.7)" font-size="10.5" text-anchor="middle" dominant-baseline="middle">' + d.label + '</text>'
    const pp = pt(i, R * d.v / 100)
    svg += '<circle cx="' + pp[0] + '" cy="' + pp[1] + '" r="3" fill="#ff8c42"/>'
  })
  svg += '</svg>'
  return svg
})

const CIRC_KEYS = [['chest', '胸围'], ['waist', '腰围'], ['hip', '臀围'], ['arm', '臂围'], ['thigh', '大腿'], ['calf', '小腿']]

const circ = computed(() => {
  const m = metrics.value.slice().reverse()
  const has = (x) => x.chest || x.waist || x.hip || x.arm || x.thigh || x.calf
  const first = m.find(has)
  const latest = m.slice().reverse().find(has)
  if (!latest) return null
  const maxV = Math.max.apply(null, CIRC_KEYS.map((k) => Math.max(latest[k[0]] || 0, (first && first[k[0]]) || 0))) || 1
  const rows = CIRC_KEYS.map((k) => {
    const cur = latest[k[0]] || 0
    const ini = first ? (first[k[0]] || 0) : 0
    const diff = cur && ini ? C.round(cur - ini, 1) : null
    return { label: k[1], cur, diff, pct: (cur || 0) / maxV * 100, up: diff != null && diff > 0 }
  })
  return { created: !!(first && first !== latest), rows }
})

const history = computed(() => {
  return metrics.value.map((x) => {
    const bmi = C.calcBMI(x.weight, profile.value.height)
    return {
      row: x,
      bmi,
      chest: [x.chest, x.waist, x.hip].map((v) => v != null ? v : '—').join(' / '),
      arm: [x.arm, x.thigh, x.calf].map((v) => v != null ? v : '—').join(' / ')
    }
  })
})

function save() {
  const val = (v) => (v === '' ? null : Number(v))
  const rec = {
    date: form.date || S.todayStr(),
    weight: val(form.weight),
    bodyFat: val(form.fat),
    chest: val(form.chest),
    waist: val(form.waist),
    hip: val(form.hip),
    arm: val(form.arm),
    thigh: val(form.thigh),
    calf: val(form.calf),
    note: form.note
  }
  if (rec.weight == null && rec.bodyFat == null && rec.chest == null && rec.waist == null) {
    C.toast('请至少填写体重或一项围度', 'warn')
    return
  }
  S.addMetric(rec)
  if (rec.weight != null) S.saveProfile({ weight: rec.weight })
  form.weight = form.fat = form.chest = form.waist = form.hip = form.arm = form.thigh = form.calf = form.note = ''
  reload()
  C.toast('身体数据已保存', 'ok')
}

function del(x) {
  C.confirmModal('删除记录', '确定删除这条身体数据吗？', () => {
    S.deleteMetric(x.id)
    reload()
    C.toast('已删除', 'ok')
  }, '删除')
}

watch(weightSeries, () => { nextTick(drawWeight) })
onMounted(() => { nextTick(drawWeight) })
</script>

<template>
  <div>
    <div class="grid grid-4" style="margin-bottom:18px;">
      <div class="stat">
        <span class="stat-ico"><Icon name="scale" /></span>
        <span class="stat-val">{{ top.weight }}<small>kg</small></span>
        <span class="stat-label">当前体重</span>
        <span
          v-if="top.delta != null"
          class="stat-delta"
          :class="top.delta <= 0 ? 'up' : 'down'"
        >{{ top.delta > 0 ? '↑ +' : '↓ ' }}{{ C.round(top.delta, 1) }}kg</span>
      </div>
      <div class="stat">
        <span class="stat-ico"><Icon name="ruler" /></span>
        <span class="stat-val">{{ top.bmi || '—' }}</span>
        <span class="stat-label">BMI <span class="tag" :class="top.cat.cls" style="font-size:10px;">{{ top.cat.label }}</span></span>
      </div>
      <div class="stat">
        <span class="stat-ico"><Icon name="flame" /></span>
        <span class="stat-val">{{ top.bmr || '—' }}<small>kcal</small></span>
        <span class="stat-label">基础代谢 BMR</span>
      </div>
      <div class="stat">
        <span class="stat-ico"><Icon name="bolt" /></span>
        <span class="stat-val">{{ top.tdee || '—' }}<small>kcal</small></span>
        <span class="stat-label">每日消耗 TDEE</span>
      </div>
    </div>

    <div class="grid grid-2" style="align-items:start;">
      <div class="card">
        <div class="card-title"><span class="ct-ico"><Icon name="pencil" /></span> 录入身体数据</div>
        <div class="input-row">
          <div class="field"><label class="label">日期</label><input v-model="form.date" class="input" type="date"></div>
          <div class="field"><label class="label">体重 (kg)</label><input v-model="form.weight" class="input" type="number" step="0.1" placeholder="70.0"></div>
        </div>
        <div class="input-row">
          <div class="field"><label class="label">体脂率 (%)</label><input v-model="form.fat" class="input" type="number" step="0.1" placeholder="18.0"></div>
          <div class="field"><label class="label">胸围 (cm)</label><input v-model="form.chest" class="input" type="number" step="0.1" placeholder="100"></div>
        </div>
        <div class="input-row">
          <div class="field"><label class="label">腰围 (cm)</label><input v-model="form.waist" class="input" type="number" step="0.1" placeholder="80"></div>
          <div class="field"><label class="label">臀围 (cm)</label><input v-model="form.hip" class="input" type="number" step="0.1" placeholder="95"></div>
        </div>
        <div class="input-row">
          <div class="field"><label class="label">臂围 (cm)</label><input v-model="form.arm" class="input" type="number" step="0.1" placeholder="36"></div>
          <div class="field"><label class="label">大腿围 (cm)</label><input v-model="form.thigh" class="input" type="number" step="0.1" placeholder="56"></div>
        </div>
        <div class="input-row">
          <div class="field"><label class="label">小腿围 (cm)</label><input v-model="form.calf" class="input" type="number" step="0.1" placeholder="38"></div>
          <div class="field"><label class="label">备注</label><input v-model="form.note" class="input" placeholder="如：晨起空腹"></div>
        </div>
        <button class="btn btn-primary btn-block btn-lg" style="margin-top:6px;" @click="save"><Icon name="save" /> 保存记录</button>
        <div class="mute" style="font-size:11.5px;margin-top:10px;">提示：同一天的记录会覆盖更新。</div>
      </div>

      <div>
        <div class="card">
          <div class="card-title"><span class="ct-ico"><Icon name="scale" /></span> 体重趋势
            <div class="ct-sub" style="display:flex;gap:6px;">
              <span
                v-for="r in RANGES"
                :key="r"
                class="tag"
                :class="{ 'tag-accent': rangeDays === r }"
                style="cursor:pointer;"
                @click="rangeDays = r"
              >{{ r === 365 ? '1年' : r + '天' }}</span>
            </div>
          </div>
          <div v-if="weightSummary" class="flex gap-16" style="font-size:12.5px;color:var(--text-dim);margin-bottom:8px;">
            <span>起始 <b class="highlight-num">{{ weightSummary.first }}kg</b></span>
            <span>当前 <b class="highlight-num">{{ weightSummary.last }}kg</b></span>
            <span>变化 <b :style="{ color: weightSummary.up ? '#ff8fa3' : '#5fe08e' }">{{ weightSummary.delta > 0 ? '+' : '' }}{{ weightSummary.delta }}kg</b></span>
          </div>
          <div ref="weightChartEl"></div>
        </div>
        <div class="card">
          <div class="card-title"><span class="ct-ico"><Icon name="radar" /></span> 体成分雷达</div>
          <div class="radar-wrap" v-html="radarSvg"></div>
        </div>
      </div>
    </div>

    <div class="card" style="margin-top:18px;">
      <div class="card-title"><span class="ct-ico"><Icon name="ruler" /></span> 围度变化对比 <span class="ct-sub">{{ circ && circ.created ? '对比首次记录' : '' }}</span></div>
      <div v-if="!circ" class="empty">
        <div class="empty-ico"><Icon name="ruler" :size="44" /></div>
        <div class="empty-title">暂无围度数据</div>
      </div>
      <div v-else>
        <div v-for="r in circ.rows" :key="r.label" style="margin-bottom:14px;">
          <div class="flex justify-between" style="font-size:12.5px;margin-bottom:5px;">
            <span>{{ r.label }}</span>
            <span class="mute">{{ r.cur || '—' }} cm
              <b v-if="r.diff != null" :style="{ color: r.up ? '#ff8fa3' : '#5fe08e' }">{{ r.diff > 0 ? '+' : '' }}{{ r.diff }}</b>
            </span>
          </div>
          <div class="progress"><i :style="{ width: r.pct + '%' }"></i></div>
        </div>
      </div>
    </div>

    <div class="card" style="margin-top:18px;">
      <div class="card-title"><span class="ct-ico"><Icon name="history" /></span> 历史记录</div>
      <div style="overflow-x:auto;">
        <table class="table">
          <thead v-if="history.length">
            <tr><th>日期</th><th>体重</th><th>体脂</th><th>BMI</th><th>胸/腰/臀</th><th>臂/腿/小腿</th><th>备注</th><th></th></tr>
          </thead>
          <tbody v-if="history.length">
            <tr v-for="h in history" :key="h.row.id">
              <td><strong>{{ C.fmtDate(h.row.date) }}</strong></td>
              <td>{{ h.row.weight != null ? h.row.weight + ' kg' : '—' }}</td>
              <td>{{ h.row.bodyFat != null ? h.row.bodyFat + '%' : '—' }}</td>
              <td>{{ h.bmi || '—' }}</td>
              <td>{{ h.chest }}</td>
              <td>{{ h.arm }}</td>
              <td class="mute">{{ h.row.note || '' }}</td>
              <td><button class="btn btn-sm btn-danger" @click="del(h.row)">删除</button></td>
            </tr>
          </tbody>
          <tbody v-else>
            <tr><td class="mute" style="padding:24px;text-align:center;">暂无记录</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
