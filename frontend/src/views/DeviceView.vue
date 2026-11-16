<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import Icon from '@/components/Icon.vue'

const C = window.Common
const S = window.Store
const D = window.MyDevice

const version = ref(0)
const connecting = ref(false)
const hrChartEl = ref(null)

const connected = computed(() => { void version.value; return D.isConnected() })
const info = computed(() => { void version.value; return S.getDevice() })
const ds = computed(() => { void version.value; return D.dailyStats() })
const hr = computed(() => { void version.value; return D.heartRateHistory() })
const records = computed(() => { void version.value; return D.exerciseRecords(7) })

const dashboard = computed(() => {
  void version.value
  const d = ds.value
  const p = S.getProfile()
  const bmr = C.calcBMR(p) || 1600
  const tdee = Math.round((bmr * (Number(p.activity) || 1.375)) + d.calories)
  const diet = S.getDiet(S.todayStr())
  const dietKcal = diet.reduce((s, x) => s + (Number(x.kcal) || 0), 0)
  const logs = S.getLogs().filter((l) => C.fmtDate(l.startedAt) === S.todayStr())
  const weight = (S.getMetrics()[0] || {}).weight || p.weight
  return [
    { icon: 'scale', val: weight, unit: 'kg', label: '体重' },
    { icon: 'activity', val: d.steps.toLocaleString(), unit: '步', label: '步数' },
    { icon: 'flame', val: d.calories, unit: 'kcal', label: '活动消耗' },
    { icon: 'nutrition', val: dietKcal, unit: 'kcal', label: '饮食摄入' },
    { icon: 'dumbbell', val: logs.length, unit: '次', label: '今日训练' },
    { icon: 'moon', val: d.sleep.total, unit: 'h', label: '睡眠' },
    { icon: 'droplet', val: d.spo2, unit: '%', label: '血氧' },
    { icon: 'bolt', val: tdee, unit: 'kcal', label: '综合 TDEE' }
  ]
})

const heartStats = computed(() => {
  const h = ds.value.heartRate
  return [
    ['静息', h.resting],
    ['平均', h.avg],
    ['最高', h.max],
    ['血氧', ds.value.spo2 + '%']
  ]
})

const sleepSeg = computed(() => {
  const s = ds.value.sleep
  const total = s.deep + s.light + s.rem || 1
  return [
    { w: s.deep / total * 100, bg: '#3a6fd6', label: '深睡 ' + s.deep + 'h' },
    { w: s.light / total * 100, bg: '#5b8def', label: '浅睡 ' + s.light + 'h' },
    { w: s.rem / total * 100, bg: '#9b7bff', label: 'REM ' + s.rem + 'h' }
  ]
})

const sleepStats = computed(() => {
  const s = ds.value.sleep
  return [
    ['总时长', s.total + 'h'],
    ['深睡', s.deep + 'h'],
    ['睡眠评分', s.score]
  ]
})

function drawHr() {
  if (!connected.value || !hrChartEl.value) return
  C.lineChart(hrChartEl.value, [{ data: hr.value.map((x) => x.value), color: '#ff5470' }], { height: 170 })
}

async function connect() {
  connecting.value = true
  await D.connect()
  C.toast('设备连接成功', 'ok')
  connecting.value = false
  version.value++
}

function sync() {
  C.toast('数据已同步', 'ok')
  version.value++
}

function disconnect() {
  C.confirmModal('断开连接', '确定断开设备连接吗？', () => {
    D.disconnect()
    C.toast('已断开', 'ok')
    version.value++
  }, '断开')
}

watch([connected, version], () => { nextTick(drawHr) })
onMounted(() => { nextTick(drawHr) })
</script>

<template>
  <div>
    <template v-if="!connected">
      <div class="card">
        <div class="device-hero">
          <div class="device-icon" style="background:linear-gradient(135deg,#3a3a3a,#222);box-shadow:none;"><Icon name="watch" :size="38" /></div>
          <div>
            <div style="font-size:18px;font-weight:800;">连接你的智能设备</div>
            <div class="mute" style="font-size:13px;margin-top:6px;max-width:520px;line-height:1.7;">连接后系统将读取步数、心率、睡眠与运动数据，自动影响 TDEE 计算与饮食/训练建议。支持小米手环、华为手环、Apple Watch（HealthKit）。</div>
          </div>
          <button class="btn btn-primary btn-lg" style="margin-left:auto;" :disabled="connecting" @click="connect">
            <Icon name="link" /> {{ connecting ? '连接中…' : '连接设备' }}
          </button>
        </div>
      </div>
      <div class="card">
        <div class="card-title"><span class="ct-ico"><Icon name="signal" /></span> 支持的设备</div>
        <div class="grid grid-3">
          <div class="stat">
            <span class="stat-ico"><Icon name="watch" /></span>
            <span style="font-weight:600;font-size:13.5px;">小米手环 / 手表</span>
            <span class="stat-label">BLE / HealthKit</span>
          </div>
          <div class="stat">
            <span class="stat-ico"><Icon name="watch" /></span>
            <span style="font-weight:600;font-size:13.5px;">华为手环 / 手表</span>
            <span class="stat-label">BLE / HealthKit</span>
          </div>
          <div class="stat">
            <span class="stat-ico"><Icon name="watch" /></span>
            <span style="font-weight:600;font-size:13.5px;">Apple Watch</span>
            <span class="stat-label">BLE / HealthKit</span>
          </div>
        </div>
      </div>
    </template>

    <template v-else>
      <div class="card">
        <div class="device-hero">
          <div class="device-icon"><Icon name="watch" :size="38" /></div>
          <div>
            <div style="font-size:17px;font-weight:800;">{{ info.model || 'Mi Band 8' }} <span class="tag tag-green">已连接</span></div>
            <div class="mute" style="font-size:12.5px;margin-top:5px;">固件 {{ info.firmware || '2.0.1' }} · 电量 {{ info.battery || 87 }}% · 设备号 {{ (info.userId || '').slice(0, 12) }}</div>
          </div>
          <div class="flex gap-8" style="margin-left:auto;">
            <button class="btn btn-sm btn-ghost" @click="sync"><Icon name="refresh" /> 同步数据</button>
            <button class="btn btn-sm btn-danger" @click="disconnect">断开连接</button>
          </div>
        </div>
      </div>

      <div class="page-head" style="margin-top:22px;">
        <h1 style="font-size:18px;">今日健康仪表盘</h1>
        <p>综合体重、步数、训练、饮食、睡眠的统一视图</p>
      </div>
      <div class="grid grid-4">
        <div v-for="it in dashboard" :key="it.label" class="stat">
          <span class="stat-ico"><Icon :name="it.icon" /></span>
          <span class="stat-val">{{ it.val }}<small>{{ it.unit }}</small></span>
          <span class="stat-label">{{ it.label }}</span>
        </div>
      </div>

      <div class="grid grid-2" style="margin-top:18px;align-items:start;">
        <div class="card">
          <div class="card-title"><span class="ct-ico"><Icon name="heart" /></span> 24 小时心率 <span class="ct-sub">当前 {{ ds.heartRate.current }} bpm</span></div>
          <div ref="hrChartEl"></div>
          <div class="grid grid-4" style="margin-top:12px;">
            <div v-for="x in heartStats" :key="x[0]" class="stat" style="padding:12px;">
              <span class="stat-val" style="font-size:19px;">{{ x[1] }}</span>
              <span class="stat-label">{{ x[0] }}</span>
            </div>
          </div>
        </div>
        <div class="card">
          <div class="card-title"><span class="ct-ico"><Icon name="moon" /></span> 睡眠分析 <span class="ct-sub">评分 {{ ds.sleep.score }}</span></div>
          <div class="sleep-seg">
            <div v-for="(s, i) in sleepSeg" :key="i" :style="{ width: s.w + '%', background: s.bg }">{{ s.label }}</div>
          </div>
          <div class="grid grid-3" style="margin-top:14px;">
            <div v-for="x in sleepStats" :key="x[0]" class="stat" style="padding:12px;">
              <span class="stat-val" style="font-size:19px;">{{ x[1] }}</span>
              <span class="stat-label">{{ x[0] }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="card" style="margin-top:18px;">
        <div class="card-title"><span class="ct-ico"><Icon name="activity" /></span> 近 7 天运动记录</div>
        <div style="overflow-x:auto;">
          <table class="table">
            <thead v-if="records.length">
              <tr><th>日期</th><th>类型</th><th>时长</th><th>消耗</th><th>距离</th><th>平均心率</th></tr>
            </thead>
            <tbody v-if="records.length">
              <tr v-for="r in records" :key="r.date">
                <td><strong>{{ C.fmtDate(r.date) }}</strong></td>
                <td>{{ r.type }}</td>
                <td>{{ r.duration }} 分钟</td>
                <td>{{ r.calories }} kcal</td>
                <td>{{ r.distance }} km</td>
                <td>{{ r.avgHeartRate }} bpm</td>
              </tr>
            </tbody>
            <tbody v-else>
              <tr><td class="mute" style="padding:20px;text-align:center;">近 7 天暂无运动记录</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </div>
</template>
