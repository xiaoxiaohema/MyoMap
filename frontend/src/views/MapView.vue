<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import Icon from '@/components/Icon.vue'

const C = window.Common
const S = window.Store

/* 高德地图配置 */
const AMAP_KEY = 'bffd9eb4ede72606b32e3c26996cc29c'
const AMAP_SECURITY = '9c91a6cc07be4bfaeb06d8a148b1bf71'
const SPORTS = {
  '跑步': { speed: 10, met: 9.8, route: 'walking' },
  '骑行': { speed: 20, met: 7.5, route: 'riding' },
  '徒步': { speed: 4.5, met: 5.5, route: 'walking' }
}
const DEFAULT_CENTER = [116.397428, 39.90923]
const sportKeys = Object.keys(SPORTS)

const mapEl = ref(null)
const routePathEl = ref(null)

const sport = ref('跑步')
const mode = ref('distance')
const targetVal = ref(5)
const status = ref('正在加载地图…')
const fallback = ref(false)

const routeStats = ref([])
const liveStats = ref([])
const facilities = ref([])
const facStatus = ref('')
const recording = ref(false)
const fbRecording = ref(false)
const recStatus = ref('GPS 实时记录')

// 降级 SVG
const gridLines = ref([])
const fbPathD = ref('')
const fbDoneDash = ref('0 100000')
const liveDot = ref({ cx: 0, cy: 0, opacity: 0 })
const startDot = ref({ cx: 0, cy: 0 })
const endDot = ref({ cx: 0, cy: 0 })

let amapReady = false
let map, geolocation, walking, riding, placeSearch
let routeLine = null, recordLine = null, startMarker = null, endMarker = null, facilityMarker = null, facilityInfo = null
let watchId = null, recStart = null, elapsed = 0, recPoints = [], origin = null
let timerHandle = null, fbHandle = null, fbElapsed = 0, fbProgress = 0
let fbRoute = { points: [], length: 0, distance: 0 }

const targetDistanceKm = computed(() => {
  const v = Number(targetVal.value) || 5
  return mode.value === 'distance' ? v : v / 60 * SPORTS[sport.value].speed
})

function setSport(s) {
  sport.value = s
  targetVal.value = mode.value === 'distance' ? 5 : 30
}
function setMode(m) {
  mode.value = m
  targetVal.value = m === 'distance' ? 5 : 30
}
function fmt(s) { return Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0') }

/* ---------- 加载高德地图 ---------- */
function loadAMap() {
  return new Promise((resolve, reject) => {
    if (window.AMap) { resolve(); return }
    if (AMAP_SECURITY) window._AMapSecurityConfig = { securityJsCode: AMAP_SECURITY }
    const plugins = ['AMap.Walking', 'AMap.Riding', 'AMap.Geolocation', 'AMap.PlaceSearch', 'AMap.GeometryUtil']
    const s = document.createElement('script')
    s.src = 'https://webapi.amap.com/maps?v=2.0&key=' + AMAP_KEY + '&plugin=' + plugins.join(',')
    s.onload = () => { window.AMap ? resolve() : reject(new Error('AMap 未就绪')) }
    s.onerror = () => reject(new Error('AMap 加载失败'))
    document.head.appendChild(s)
    setTimeout(() => { if (!window.AMap) reject(new Error('AMap 加载超时')) }, 10000)
  })
}

function initAMap() {
  amapReady = true
  fallback.value = false
  map = new AMap.Map(mapEl.value, { zoom: 14, center: DEFAULT_CENTER, viewMode: '2D', mapStyle: 'amap://styles/whitesmoke' })
  walking = new AMap.Walking({ hideMarkers: true })
  riding = new AMap.Riding({ hideMarkers: true })
  geolocation = new AMap.Geolocation({ enableHighAccuracy: true, timeout: 8000, showButton: false, panToLocation: true, zoomToAccuracy: true })
  map.addControl(geolocation)
  geolocation.getCurrentPosition((st, result) => {
    if (st === 'complete' && result.position) {
      origin = [result.position.lng, result.position.lat]
      status.value = '已定位到当前位置'
      loadFacilities(origin)
    } else {
      origin = DEFAULT_CENTER.slice()
      status.value = '定位失败，使用默认城市（北京）'
      loadFacilities(origin)
    }
  })
  renderRouteStats(null)
  renderLiveStats()
}

/* ---------- 路线规划 ---------- */
function destinationPoint(distM, bearing) {
  try {
    const p = AMap.GeometryUtil.destination(new AMap.LngLat(origin[0], origin[1]), distM, bearing)
    return [p.lng, p.lat]
  } catch (e) {
    return [origin[0] + distM / 111000 * Math.cos(bearing * Math.PI / 180),
      origin[1] + distM / 111000 * Math.sin(bearing * Math.PI / 180)]
  }
}

function clearRoute() {
  if (routeLine) { map.remove(routeLine); routeLine = null }
  if (startMarker) { map.remove(startMarker); startMarker = null }
  if (endMarker) { map.remove(endMarker); endMarker = null }
}

function routePath(result) {
  const path = []
  ;(result.routes[0].steps || []).forEach((s) => {
    (s.path || []).forEach((p) => { path.push([p.lng, p.lat]) })
  })
  return path
}

function planRoute() {
  if (!amapReady) { fallbackPlanRoute(); return }
  if (!origin) origin = DEFAULT_CENTER.slice()
  const targetKm = targetDistanceKm.value
  status.value = '正在规划路线…'
  clearRoute()
  const engine = SPORTS[sport.value].route === 'riding' ? riding : walking
  const bearing = Math.floor(Math.random() * 360)
  let attempt = 0, guessKm = targetKm

  function tryPlan() {
    attempt++
    const dest = destinationPoint(guessKm * 1000, bearing)
    engine.search(new AMap.LngLat(origin[0], origin[1]), new AMap.LngLat(dest[0], dest[1]), (st, result) => {
      if (st !== 'complete' || !result.routes || !result.routes.length) {
        drawSimulatedRoute((result && (result.info || result.infocode)) || '')
        return
      }
      const actualKm = result.routes[0].distance / 1000
      if (attempt < 3 && Math.abs(actualKm - targetKm) / targetKm > 0.08) {
        guessKm = Math.max(0.2, guessKm * targetKm / actualKm)
        tryPlan()
        return
      }
      finishRoute(dest, actualKm, routePath(result))
    })
  }
  tryPlan()
}

function finishRoute(dest, km, path) {
  const mins = Math.round(km / SPORTS[sport.value].speed * 60)
  routeLine = new AMap.Polyline({ path: path, strokeColor: '#3a9bff', strokeWeight: 6, lineJoin: 'round' })
  startMarker = new AMap.Marker({ position: origin, label: { content: '起点', direction: 'top' } })
  endMarker = new AMap.Marker({ position: dest, label: { content: '终点', direction: 'top' } })
  map.add([routeLine, startMarker, endMarker])
  map.setFitView([routeLine])
  const target = targetDistanceKm.value
  status.value = '路线已生成（目标 ' + target.toFixed(1) + 'km / 实际 ' + km.toFixed(1) + 'km）'
  renderRouteStats({ km: km, mins: mins, sport: sport.value, targetKm: target })
}

function drawSimulatedRoute(info) {
  if (!origin) origin = DEFAULT_CENTER.slice()
  const km = targetDistanceKm.value
  const R = Math.max(60, km * 1000 / (2 * Math.PI))
  const n = 72
  const path = []
  for (let i = 0; i <= n; i++) {
    const bearing = i / n * 360
    try {
      const p = AMap.GeometryUtil.destination(new AMap.LngLat(origin[0], origin[1]), R, bearing)
      path.push([p.lng, p.lat])
    } catch (e) { break }
  }
  if (path.length < 3) { status.value = '路线规划失败：' + info; return }
  if (routeLine) map.remove(routeLine)
  routeLine = new AMap.Polyline({ path: path, strokeColor: '#ff6b35', strokeWeight: 5, lineJoin: 'round' })
  map.add(routeLine)
  map.setFitView([routeLine])
  const mins = Math.round(km / SPORTS[sport.value].speed * 60)
  renderRouteStats({ km: km, mins: mins, sport: sport.value })
  status.value = '已生成模拟路线' + (info ? '（' + info + '）' : '') + ' · 配置安全密钥后可用真实路线'
  C.toast('高德路径规划未授权，已改用模拟路线', 'warn')
}

function renderRouteStats(rt) {
  const weight = Number(S.getProfile().weight) || 70
  let items
  if (rt) {
    const kcal = Math.round(SPORTS[rt.sport].met * weight * (rt.mins / 60))
    items = [['总距离', rt.km.toFixed(2) + ' km'], ['预计时长', rt.mins + ' 分钟'], ['运动类型', rt.sport], ['预计消耗', kcal + ' kcal']]
  } else {
    items = [['总距离', '—'], ['预计时长', '—'], ['运动类型', sport.value], ['预计消耗', '—']]
  }
  routeStats.value = items
}

/* ---------- 轨迹记录 ---------- */
function startRecord() {
  if (recording.value) return
  if (!amapReady) { fallbackStartRecord(); return }
  recording.value = true
  recStart = Date.now()
  elapsed = 0
  recPoints = []
  recStatus.value = '记录中…'
  if (recordLine) { map.remove(recordLine); recordLine = null }
  recPoints = origin ? [origin.slice()] : []
  map.setCenter(origin || DEFAULT_CENTER)

  watchId = geolocation.watchPosition((st, result) => {
    if (st === 'complete' && result.position) {
      const p = [result.position.lng, result.position.lat]
      recPoints.push(p)
      if (recordLine) map.remove(recordLine)
      recordLine = new AMap.Polyline({ path: recPoints, strokeColor: '#ff6b35', strokeWeight: 5, lineJoin: 'round' })
      map.add(recordLine)
      updateRecStats()
    }
  })
  C.toast('开始记录轨迹', 'ok')
}

function updateRecStats() {
  const weight = Number(S.getProfile().weight) || 70
  let distM = 0
  for (let i = 1; i < recPoints.length; i++) {
    try { distM += AMap.GeometryUtil.distance(new AMap.LngLat(recPoints[i - 1][0], recPoints[i - 1][1]), new AMap.LngLat(recPoints[i][0], recPoints[i][1])) } catch (e) {}
  }
  const distKm = distM / 1000
  const kcal = Math.round(SPORTS[sport.value].met * weight * (elapsed / 3600))
  liveStats.value = [['已行进', distKm.toFixed(2) + ' km'], ['已用时间', fmt(elapsed)], ['平均配速', SPORTS[sport.value].speed.toFixed(1) + ' km/h'], ['消耗', kcal + ' kcal']]
}

function renderLiveStats() {
  liveStats.value = [['已行进', '0.00 km'], ['已用时间', '0:00'], ['平均配速', SPORTS[sport.value].speed.toFixed(1) + ' km/h'], ['消耗', '0 kcal']]
}

function stopRecord() {
  if (!amapReady) { fallbackStopRecord(); return }
  if (!recording.value) return
  recording.value = false
  if (geolocation) geolocation.clearWatch(watchId)
  recStatus.value = 'GPS 实时记录'

  let distM = 0
  for (let i = 1; i < recPoints.length; i++) {
    try { distM += AMap.GeometryUtil.distance(new AMap.LngLat(recPoints[i - 1][0], recPoints[i - 1][1]), new AMap.LngLat(recPoints[i][0], recPoints[i][1])) } catch (e) {}
  }
  const distKm = Math.round(distM / 100) / 10
  const weight = Number(S.getProfile().weight) || 70
  const kcal = Math.round(SPORTS[sport.value].met * weight * (elapsed / 3600))
  const m = C.openModal(
    '<div class="modal-title"><i class="ic" data-ic="award" data-ic-size="18"></i> 运动记录完成</div>' +
    '<div class="modal-sub">' + C.esc(sport.value) + ' · ' + C.fmtDateTime(new Date(recStart)) + '</div>' +
    '<div class="grid grid-4">' +
      '<div class="stat"><span class="stat-val">' + distKm + '<small>km</small></span><span class="stat-label">距离</span></div>' +
      '<div class="stat"><span class="stat-val">' + fmt(elapsed) + '</span><span class="stat-label">时长</span></div>' +
      '<div class="stat"><span class="stat-val">' + kcal + '<small>kcal</small></span><span class="stat-label">消耗</span></div>' +
      '<div class="stat"><span class="stat-val">' + recPoints.length + '</span><span class="stat-label">轨迹点</span></div>' +
    '</div>' +
    '<div class="flex gap-12" style="justify-content:flex-end;margin-top:18px;"><button class="btn btn-primary" data-ok>好的</button></div>')
  m.el.querySelector('[data-ok]').onclick = m.close
  C.hydrateIcons && C.hydrateIcons(m.el)
}

/* ---------- 周边设施 ---------- */
const FAC_TYPES = [
  { kw: '健身房', ico: 'dumbbell' },
  { kw: '公园', ico: 'leaf' },
  { kw: '体育场馆', ico: 'award' }
]

function loadFacilities(center) {
  if (!amapReady || !window.AMap) { renderFacilitiesFallback(); return }
  placeSearch = new AMap.PlaceSearch({ pageSize: 20, pageIndex: 1, extensions: 'all' })
  const found = []
  let done = 0
  FAC_TYPES.forEach((ft) => {
    placeSearch.searchNearBy(ft.kw, new AMap.LngLat(center[0], center[1]), 3000, (st, result) => {
      if (st === 'complete' && result.poiList && result.poiList.pois) {
        result.poiList.pois.slice(0, 5).forEach((p) => {
          found.push({ name: p.name, type: p.type, dist: p.distance, addr: p.address || '', loc: p.location, ico: ft.ico })
        })
      }
      if (++done === FAC_TYPES.length) renderFacilities(found, center)
    })
  })
}

function renderFacilities(list) {
  if (!list.length) {
    facStatus.value = '离线示例（POI 未授权）'
    renderFacilitiesFallback()
    return
  }
  facStatus.value = '高德地图 · 3km 内'
  list.sort((a, b) => (a.dist || 0) - (b.dist || 0))
  facilities.value = list.slice(0, 12).map((f) => {
    const d = f.dist != null ? (f.dist < 1000 ? Math.round(f.dist) + ' m' : (f.dist / 1000).toFixed(1) + ' km') : ''
    const sub = (f.type || '').split(';').pop() || f.addr
    return { name: f.name, sub: sub, dist: d, ico: f.ico, loc: f.loc, clickable: true }
  })
}

function renderFacilitiesFallback() {
  const FACILITIES = [
    { n: '星动力健身工作室', t: '健身房', d: '0.4 km', ico: 'dumbbell' },
    { n: '中央公园环形跑道', t: '公园', d: '0.9 km', ico: 'leaf' },
    { n: '市民体育中心', t: '运动场馆', d: '1.6 km', ico: 'award' },
    { n: '滨江健身步道', t: '步道', d: '2.1 km', ico: 'route' },
    { n: '24H 自助健身房', t: '健身房', d: '2.8 km', ico: 'dumbbell' }
  ]
  facilities.value = FACILITIES.map((f) => ({ name: f.n, sub: f.t, dist: f.d, ico: f.ico, loc: null, clickable: false }))
}

function openFacility(f) {
  if (!f.loc || !map) return
  const parts = [f.loc.lng, f.loc.lat]
  const name = f.name
  const sub = f.sub || ''
  if (facilityMarker) { map.remove(facilityMarker); facilityMarker = null }
  if (facilityInfo) { facilityInfo.close(); facilityInfo = null }
  facilityMarker = new AMap.Marker({ position: parts, anchor: 'bottom-center', label: { content: name, direction: 'top' } })
  facilityInfo = new AMap.InfoWindow({
    content: '<div style="padding:6px 10px;font-size:13px;color:#111;line-height:1.6;">' +
      '<b>' + C.esc(name) + '</b>' + (sub ? '<br>' + C.esc(sub) : '') + '</div>',
    offset: new AMap.Pixel(0, -34)
  })
  map.add(facilityMarker)
  map.setZoomAndCenter(16, parts)
  facilityInfo.open(map, parts)
}

/* ---------- 离线降级：模拟引擎 ---------- */
function useFallback() {
  amapReady = false
  fallback.value = true
  status.value = '离线模拟引擎（高德地图不可用）'
  facStatus.value = '离线示例数据'
  const g = []
  for (let x = 40; x < 800; x += 40) g.push({ x1: x, y1: 0, x2: x, y2: 480 })
  for (let y = 40; y < 480; y += 40) g.push({ x1: 0, y1: y, x2: 800, y2: y })
  gridLines.value = g
  renderFacilitiesFallback()
  renderLiveStats()
  fallbackPlanRoute()
}

function fallbackPlanRoute() {
  const target = targetDistanceKm.value
  const cx = 400, cy = 240, n = 90
  const seed = Math.floor(target * 100) + sport.value.length
  const rnd = (i) => ((Math.sin(i * 12.9898 + seed) * 43758.5453) % 1 + 1) % 1
  const pts = []
  for (let i = 0; i <= n; i++) {
    const a = i / n * Math.PI * 2
    const rr = 130 + rnd(i) * 60 + Math.sin(a * 3) * 30
    pts.push([Math.round(cx + Math.cos(a) * rr * (1 + Math.sin(a * 2) * 0.12)), Math.round(cy + Math.sin(a) * rr * 0.72)])
  }
  fbPathD.value = 'M' + pts.map((p) => p[0] + ' ' + p[1]).join(' L')
  fbDoneDash.value = '0 100000'
  startDot.value = { cx: pts[0][0], cy: pts[0][1] }
  endDot.value = { cx: pts[0][0], cy: pts[0][1] }
  fbProgress = 0
  nextTick(() => {
    const path = routePathEl.value
    fbRoute = { points: pts, length: path ? path.getTotalLength() : 0, distance: target }
  })
  renderRouteStats({ km: target, mins: Math.round(target / SPORTS[sport.value].speed * 60), sport: sport.value })
}

function fallbackStartRecord() {
  if (fbRecording.value) return
  fbRecording.value = true
  fbElapsed = 0
  fbProgress = 0
  liveDot.value = { cx: liveDot.value.cx, cy: liveDot.value.cy, opacity: 1 }
  fbHandle = setInterval(() => {
    fbElapsed++
    fbProgress = Math.min(1, fbProgress + (SPORTS[sport.value].speed / 3600) / fbRoute.distance)
    const path = routePathEl.value
    if (path) {
      const pt = path.getPointAtLength(fbProgress * fbRoute.length)
      liveDot.value = { cx: pt.x, cy: pt.y, opacity: 1 }
    }
    fbDoneDash.value = (fbProgress * fbRoute.length) + ' 100000'
    const weight = Number(S.getProfile().weight) || 70
    const kcal = Math.round(SPORTS[sport.value].met * weight * (fbElapsed / 3600))
    liveStats.value = [['已行进', (fbRoute.distance * fbProgress).toFixed(2) + ' km'], ['已用时间', fmt(fbElapsed)], ['平均配速', SPORTS[sport.value].speed.toFixed(1) + ' km/h'], ['消耗', kcal + ' kcal']]
    if (fbProgress >= 1) { clearInterval(fbHandle); fbHandle = null; fbRecording.value = false }
  }, 1000)
}

function fallbackStopRecord() {
  if (!fbHandle && fbProgress === 0) return
  clearInterval(fbHandle)
  fbHandle = null
  fbRecording.value = false
  liveDot.value = { cx: liveDot.value.cx, cy: liveDot.value.cy, opacity: 0 }
  fbDoneDash.value = '0 100000'
  fbProgress = 0
  C.toast('已结束记录', 'ok')
}

onMounted(() => {
  loadAMap().then(initAMap).catch((e) => {
    console.warn('高德地图不可用，降级为离线模拟引擎：', e.message)
    useFallback()
  })
  timerHandle = setInterval(() => { if (recording.value) { elapsed += 1; updateRecStats() } }, 1000)
})

onBeforeUnmount(() => {
  clearInterval(timerHandle)
  if (fbHandle) clearInterval(fbHandle)
  try { if (geolocation && watchId != null) geolocation.clearWatch(watchId) } catch (e) {}
  try { if (map) map.destroy() } catch (e) {}
})
</script>

<template>
  <div class="grid two-col" style="grid-template-columns:minmax(0,1fr) minmax(300px,360px);align-items:start;">
    <div>
      <div class="card">
        <div class="card-title"><span class="ct-ico"><Icon name="map" /></span> 路线规划
          <span class="ct-sub">{{ status }}</span>
        </div>
        <div class="grid grid-4" style="margin-bottom:14px;">
          <div class="field" style="margin:0;">
            <label class="label">运动类型</label>
            <div class="chip-group">
              <span v-for="s in sportKeys" :key="s" class="chip" :class="{ active: s === sport }" @click="setSport(s)">{{ s }}</span>
            </div>
          </div>
          <div class="field" style="margin:0;">
            <label class="label">目标方式</label>
            <div class="chip-group">
              <span class="chip" :class="{ active: mode === 'distance' }" @click="setMode('distance')">距离(km)</span>
              <span class="chip" :class="{ active: mode === 'time' }" @click="setMode('time')">时长(分)</span>
            </div>
          </div>
          <div class="field" style="margin:0;"><label class="label">目标值</label><input class="input" type="number" v-model.number="targetVal"></div>
          <div class="field" style="margin:0;"><label class="label">&nbsp;</label><button class="btn btn-primary btn-block" @click="planRoute">生成路线</button></div>
        </div>

        <div id="amap" ref="mapEl" v-show="!fallback"></div>

        <div v-show="fallback" class="map-canvas">
          <svg viewBox="0 0 800 480" style="width:100%;display:block;">
            <g class="map-grid">
              <line v-for="(l, i) in gridLines" :key="i" :x1="l.x1" :y1="l.y1" :x2="l.x2" :y2="l.y2" />
            </g>
            <path ref="routePathEl" :d="fbPathD" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" />
            <path :d="fbPathD" :stroke-dasharray="fbDoneDash" fill="none" stroke="#ff6b35" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
            <circle class="live-dot" r="8" :cx="liveDot.cx" :cy="liveDot.cy" :opacity="liveDot.opacity" />
            <circle r="7" fill="#2ecc71" :cx="startDot.cx" :cy="startDot.cy" />
            <circle r="7" fill="#ff5470" :cx="endDot.cx" :cy="endDot.cy" />
          </svg>
        </div>

        <div class="grid grid-4" style="margin-top:14px;">
          <div v-for="(x, i) in routeStats" :key="i" class="stat" style="padding:12px;">
            <span class="stat-val" style="font-size:19px;">{{ x[1] }}</span>
            <span class="stat-label">{{ x[0] }}</span>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-title"><span class="ct-ico"><Icon name="signal" /></span> 轨迹记录
          <span class="ct-sub">{{ recStatus }}</span>
        </div>
        <div class="grid grid-4">
          <div v-for="(x, i) in liveStats" :key="i" class="stat" style="padding:12px;">
            <span class="stat-val" style="font-size:19px;">{{ x[1] }}</span>
            <span class="stat-label">{{ x[0] }}</span>
          </div>
        </div>
        <div class="flex gap-8" style="margin-top:16px;">
          <button class="btn btn-primary" :disabled="recording || fbRecording" @click="startRecord">▶ 开始记录</button>
          <button class="btn btn-ghost" :disabled="!(recording || fbRecording)" @click="stopRecord"><Icon name="stop" :size="14" /> 结束并保存</button>
          <span class="mute" style="margin-left:auto;font-size:12px;align-self:center;">配速按运动类型估算</span>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-title"><span class="ct-ico"><Icon name="mapPin" /></span> 周边设施
        <span class="ct-sub">{{ facStatus }}</span>
      </div>
      <div>
        <div v-if="!facilities.length" class="mute" style="font-size:12.5px;padding:8px 0;">正在获取…</div>
        <div
          v-for="(f, i) in facilities"
          :key="i"
          class="facility"
          :style="f.clickable ? 'cursor:pointer;' : ''"
          @click="openFacility(f)"
        >
          <span class="f-ico"><Icon :name="f.ico" /></span>
          <span style="flex:1;min-width:0;">
            <span style="font-weight:600;font-size:13.5px;">{{ f.name }}</span>
            <span class="mute" style="display:block;font-size:11.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">{{ f.sub }}</span>
          </span>
          <span class="tag tag-accent">{{ f.dist }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
