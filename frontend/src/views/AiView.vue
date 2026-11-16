<script setup>
import { ref, computed, nextTick, onMounted, onBeforeUnmount } from 'vue'
import Icon from '@/components/Icon.vue'

const C = window.Common
const S = window.Store

const tab = ref('chat')

// ---------- 服务端 AI 状态 ----------
const serverAI = ref(false)
const serverModel = ref('')
const aiVersion = ref(0)
function refresh() { aiVersion.value++ }

const badge = computed(() => {
  void aiVersion.value
  if (serverAI.value) return { cls: 'tag-green', text: '服务端 AI · ' + (serverModel.value || 'GLM') }
  if (!window.MyAI || !window.MyAI.isConfigured()) return { cls: '', text: '本地知识库', warnKey: false }
  return { cls: 'tag-green', text: window.MyAI.providerLabel(), warnKey: window.MyAI.needsKey() && !window.MyAI.hasKey() }
})

function openAISetup() {
  if (serverAI.value) {
    C.confirmModal('服务端 AI 已启用',
      '服务端已配置智谱 ' + (serverModel.value || 'GLM') + '，任何设备/访客直接可用，无需填写 API Key。是否仍要自定义客户端大模型？',
      () => window.MyAI.openSetup(refresh), '仍要自定义')
    return
  }
  window.MyAI.openSetup(refresh)
}

// ---------- 对话 ----------
const QUICK = ['如何增肌？', '减脂期怎么吃？', '深蹲膝盖疼怎么办？', '如何突破卧推瓶颈？', '硬拉如何护腰？', '每天需要多少蛋白质？', '训练后如何恢复？', '新手如何开始健身？']

const chats = ref([])
const chatInput = ref('')
const chatScroll = ref(null)
const typing = ref(false)
const streamText = ref('')

function loadChats() { chats.value = S.getChats() }
function scrollBottom() {
  nextTick(() => { if (chatScroll.value) chatScroll.value.scrollTop = chatScroll.value.scrollHeight })
}

function askQuick(q) { chatInput.value = q; send() }

async function send() {
  const q = chatInput.value.trim()
  if (!q) return
  S.addChat({ role: 'user', text: q })
  chatInput.value = ''
  loadChats()
  typing.value = true
  streamText.value = ''
  scrollBottom()

  const history = S.getChats().slice(-10).map((m) => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text }))

  let answer = null
  // ① 优先后端代理（服务端持有 Key，任意设备/访客均无需再配置）
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 60000)
    const res = await fetch(C.apiBase() + '/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: q }),
      signal: ctrl.signal
    })
    clearTimeout(timer)
    const resp = await res.json()
    if (resp && resp.code === 1 && resp.data && resp.data.answer && resp.data.server) answer = resp.data.answer
  } catch (e) { /* 网络/超时 → 继续走客户端或本地兜底 */ }

  // ② 客户端直连大模型（访客自备 Key，支持流式）
  if (!answer && window.MyAI && window.MyAI.isConfigured()) {
    try {
      let streamed = false
      answer = await window.MyAI.chat(history, (piece, full) => {
        if (!streamed) { streamText.value = ''; streamed = true }
        streamText.value = full
        scrollBottom()
      })
    } catch (e) {
      streamText.value = ''
      C.toast('AI 调用失败：' + e.message, 'err')
      if (/API Key|鉴权|Authorization/.test(e.message)) setTimeout(openAISetup, 400)
      answer = null
    }
  }

  // ③ 内置知识库兜底
  if (!answer) answer = C.localAI(q)

  typing.value = false
  streamText.value = ''
  S.addChat({ role: 'ai', text: answer })
  loadChats()
  scrollBottom()
}

function clearChats() {
  C.confirmModal('清空对话', '确定清空所有对话历史吗？', () => { S.clearChats(); loadChats(); C.toast('已清空', 'ok') }, '清空')
}

// ---------- 视频动作解析 ----------
const EXERCISES = [
  { group: '下肢（膝主导）', opts: ['深蹲', '硬拉', '箭步蹲', '保加利亚分腿蹲', '腿举', '臀推'] },
  { group: '上肢推（肘主导）', opts: ['卧推', '推举', '俯卧撑', '臂屈伸'] },
  { group: '上肢拉（肘主导）', opts: ['引体向上', '高位下拉', '划船', '弯举'] }
]

const vaType = ref('深蹲')
const videoFile = ref(null)
const videoEl = ref(null)
const canvasEl = ref(null)
const mediaReady = ref(false)
const videoName = ref('')
const analyzing = ref(false)
const vaState = ref('idle')
const vaMsg = ref('')
const vaError = ref('')
const result = ref(null)

let videoUrl = null

function pickVideo() { if (videoFile.value) videoFile.value.click() }

function onVideoChange(e) {
  const f = e.target.files[0]
  if (!f) return
  if (videoUrl) URL.revokeObjectURL(videoUrl)
  videoUrl = URL.createObjectURL(f)
  const v = videoEl.value
  if (v) { v.src = videoUrl; v.load() }
  mediaReady.value = true
  videoName.value = f.name
  result.value = null
  vaState.value = 'idle'
}

function clearVideo() {
  const v = videoEl.value
  if (v) { try { v.pause() } catch (e) {} }
  if (videoUrl) { URL.revokeObjectURL(videoUrl); videoUrl = null }
  if (v) { v.removeAttribute('src'); try { v.load() } catch (e) {} }
  if (videoFile.value) videoFile.value.value = ''
  mediaReady.value = false
  videoName.value = ''
  result.value = null
  vaState.value = 'idle'
}

function waitVideoReady(v) {
  return new Promise((res, rej) => {
    if (!v) return rej(new Error('视频不存在'))
    if (v.readyState >= 2 && v.videoWidth) return res()
    const ok = () => { cleanup(); res() }
    const bad = () => { cleanup(); rej(new Error('视频无法解码，请更换 MP4 / MOV / WebM 格式')) }
    const cleanup = () => { v.removeEventListener('loadeddata', ok); v.removeEventListener('error', bad) }
    v.addEventListener('loadeddata', ok)
    v.addEventListener('error', bad)
    setTimeout(bad, 8000)
  })
}

function playThrough(v) {
  return new Promise((res) => {
    let done = false
    const fin = () => { if (!done) { done = true; v.pause(); try { v.currentTime = 0 } catch (e) {} res() } }
    v.addEventListener('ended', fin)
    v.play().then(() => setTimeout(fin, Math.min(8000, (v.duration || 2) * 1000 + 800))).catch(fin)
    setTimeout(fin, 9000)
  })
}

function buildResult(type, r, costMs) {
  const s = r.summary
  const color = s.level === 'good' ? '#2ecc71' : s.level === 'ok' ? '#ffc93c' : '#ff5470'
  const upper = !!s.upper
  const key = upper ? 'elbowL' : 'knee'
  let pick = r.series[0], minv = Infinity
  r.series.forEach((x) => {
    const val = key === 'elbowL'
      ? Math.min(x.metrics.elbowL == null ? Infinity : x.metrics.elbowL, x.metrics.elbowR == null ? Infinity : x.metrics.elbowR)
      : x.metrics.knee
    if (val != null && val < minv) { minv = val; pick = x }
  })
  const W = 640, H = 400
  const xs = pick.landmarks.map((p) => p.x), ys = pick.landmarks.map((p) => p.y)
  const minX = Math.min.apply(null, xs), maxX = Math.max.apply(null, xs)
  const minY = Math.min.apply(null, ys), maxY = Math.max.apply(null, ys)
  const pad = 0.06
  const sx = (maxX - minX) || 1, sy = (maxY - minY) || 1
  const scale = Math.min((1 - 2 * pad) / sx, (1 - 2 * pad) * (H / W) / sy)
  const offX = (1 - sx * scale) / 2 - minX * scale
  const offY = (1 - sy * scale * (W / H)) / 2 - minY * scale * (W / H)
  const norm = pick.landmarks.map((p) => ({ x: p.x * scale + offX, y: (p.y * scale) * (W / H) + offY, visibility: p.visibility }))
  return {
    type, costMs, score: s.score, level: s.level, color, upper, frames: s.frames,
    minKnee: s.minKnee, minElbow: s.minElbow, maxLean: s.maxLean, range: s.range, maxAsym: s.maxAsym,
    issues: s.issues, norm, metrics: pick.metrics
  }
}

const ringStyle = computed(() => {
  const r = result.value
  if (!r) return {}
  return { background: 'radial-gradient(circle, ' + r.color + '22, transparent 70%)', border: '3px solid ' + r.color, color: r.color }
})

function issueStyle(i) {
  const c = i.level === 'warn' ? '#ff5470' : '#ffc93c'
  return { padding: '10px 12px', borderRadius: '10px', background: c + '14', borderLeft: '3px solid ' + c, fontSize: '13px', marginBottom: '8px' }
}

function fmt(v, u) { return v == null ? '—' : v.toFixed(1) + (u || '°') }

function drawResult() {
  if (vaState.value !== 'result' || !result.value) return
  const cv = canvasEl.value
  if (!cv) return
  cv.width = 640
  cv.height = 400
  window.MyPose.drawSkeleton(cv, result.value.norm, result.value.metrics)
}

async function analyze() {
  if (!mediaReady.value) return
  const type = vaType.value
  const v = videoEl.value
  analyzing.value = true
  result.value = null
  vaState.value = 'loading'
  vaMsg.value = '正在加载姿态模型…'
  const setMsg = (m) => { vaMsg.value = m }

  try {
    await waitVideoReady(v)
    if (!window.MyPose.isReady()) await window.MyPose.load(setMsg)
    await playThrough(v)
    setMsg('正在检测人体关键点…')
    const t0 = performance.now()
    const r = await window.MyPose.analyze(v, {
      exercise: type,
      sampleFps: 10,
      onProgress: (m) => { if (vaState.value === 'loading') vaMsg.value = m }
    })
    const costMs = Math.round(performance.now() - t0)
    result.value = buildResult(type, r, costMs)
    vaState.value = 'result'
    C.toast('分析完成：' + r.summary.score + ' 分', r.summary.score >= 85 ? 'ok' : 'warn')
  } catch (e) {
    vaState.value = 'error'
    vaError.value = (e && e.message) || '未知错误'
  }
  analyzing.value = false
  await nextTick()
  drawResult()
}

onMounted(async () => {
  loadChats()
  scrollBottom()
  const r = await C.apiOrNull('/ai/status', 'GET')
  if (r && r.code === 1 && r.data) {
    serverAI.value = !!r.data.enabled
    serverModel.value = r.data.model || ''
  }
})

onBeforeUnmount(() => {
  if (videoUrl) URL.revokeObjectURL(videoUrl)
})
</script>

<template>
  <div>
    <div class="tabs">
      <button class="tab" :class="{ active: tab === 'chat' }" @click="tab = 'chat'"><Icon name="chat" /> 智能问答</button>
      <button class="tab" :class="{ active: tab === 'video' }" @click="tab = 'video'"><Icon name="video" /> 我的动作解析</button>
    </div>

    <section v-show="tab === 'chat'">
      <div class="grid two-col" style="grid-template-columns:minmax(0,1fr) minmax(260px,320px);align-items:start;">
        <div class="card">
          <div class="card-title"><span class="ct-ico"><Icon name="sparkles" /></span> AI 健身助手
            <span class="ct-sub">
              <span class="tag" :class="badge.cls">{{ badge.text }}</span>
              <span v-if="badge.warnKey" class="tag tag-red">缺少 API Key</span>
            </span>
            <button class="btn btn-sm btn-ghost" style="margin-left:10px;" @click="openAISetup"><Icon name="pencil" :size="13" /> AI 设置</button>
            <button class="btn btn-sm btn-ghost" @click="clearChats">清空对话</button>
          </div>
          <div class="chat-box">
            <div ref="chatScroll" class="chat-scroll">
              <div v-if="!chats.length && !typing" class="empty">
                <div class="empty-ico"><Icon name="sparkles" :size="44" /></div>
                <div class="empty-title">你好，我是 MyoMap AI 助手</div>
                <div class="empty-hint">可以问我训练、营养、恢复等问题</div>
              </div>
              <div v-for="(m, i) in chats" :key="m.id || i" class="msg" :class="{ me: m.role === 'user' }">
                <div class="msg-avatar"><Icon :name="m.role === 'user' ? 'user' : 'sparkles'" /></div>
                <div>
                  <div class="msg-bubble">{{ m.text }}</div>
                  <div class="msg-time">{{ C.fmtDateTime(m.time) }}</div>
                </div>
              </div>
              <div v-if="typing" class="msg">
                <div class="msg-avatar"><Icon name="sparkles" /></div>
                <div class="msg-bubble"><span v-if="!streamText" class="spinner"></span><template v-else>{{ streamText }}</template></div>
              </div>
            </div>
            <div class="chat-input">
              <input class="input" v-model="chatInput" placeholder="输入你的健身问题…" @keydown.enter="send">
              <button class="btn btn-primary" @click="send">发送</button>
            </div>
          </div>
        </div>
        <div class="card">
          <div class="card-title" style="font-size:13.5px;"><Icon name="bolt" /> 快捷提问</div>
          <div class="flex flex-wrap gap-8">
            <span v-for="q in QUICK" :key="q" class="quick-q" @click="askQuick(q)">{{ q }}</span>
          </div>
          <div class="divider"></div>
          <div class="mute" style="font-size:12px;line-height:1.8;">
            已接入真实大模型（OpenAI 兼容协议）。未配置时使用内置知识库。<br>
            <b style="color:var(--text-dim)">对话历史与 API Key 仅保存在本地</b>，保护你的隐私。
          </div>
        </div>
      </div>
    </section>

    <section v-show="tab === 'video'">
      <p class="mute" style="font-size:12px;line-height:1.75;margin:0 2px 14px;">
        上传<b style="color:var(--text-dim)">你自己的训练视频</b>，系统在<b style="color:var(--text-dim)">浏览器本地</b>检测人体关键点、分析关节角度，给出动作评分与改进建议；可选择动作类型以套用对应评分规则。视频仅在本机处理，不会上传服务器，隐私安全。
      </p>
      <div class="grid grid-2" style="align-items:start;">
        <div class="card">
          <div class="card-title"><span class="ct-ico"><Icon name="video" /></span> 上传训练视频</div>
          <div class="field">
            <label class="label">动作类型</label>
            <select class="select" v-model="vaType">
              <optgroup v-for="g in EXERCISES" :key="g.group" :label="g.group">
                <option v-for="o in g.opts" :key="o">{{ o }}</option>
              </optgroup>
            </select>
          </div>
          <div class="video-drop" @click="pickVideo">
            <div style="font-size:40px;opacity:.4;"><Icon name="upload" /></div>
            <div style="margin-top:10px;font-weight:600;">{{ mediaReady ? '已选择：' + videoName : '点击选择视频文件' }}</div>
            <div class="mute" style="font-size:12px;margin-top:6px;">支持 MP4 / MOV / WebM</div>
          </div>
          <input ref="videoFile" type="file" accept="video/*" class="hidden" @change="onVideoChange">
          <video ref="videoEl" :class="{ hidden: !mediaReady }" controls style="width:100%;border-radius:12px;margin-top:14px;background:#000;"></video>
          <div style="display:flex;gap:8px;margin-top:14px;">
            <button class="btn btn-primary" style="flex:1;" :disabled="!mediaReady || analyzing" @click="analyze">
              <Icon :name="analyzing ? 'hourglass' : 'search'" /> {{ analyzing ? '分析中…' : '开始分析' }}
            </button>
            <button v-show="mediaReady" class="btn btn-ghost" @click="clearVideo"><Icon name="trash" /> 删除视频</button>
          </div>
        </div>
        <div class="card">
          <div class="card-title"><span class="ct-ico"><Icon name="chart" /></span> 分析结果</div>
          <div>
            <div v-if="vaState === 'loading'" class="loading-row"><span class="spinner"></span> {{ vaMsg }}</div>
            <div v-else-if="vaState === 'error'" class="empty">
              <div class="empty-ico"><Icon name="alert" :size="40" /></div>
              <div class="empty-title">分析失败</div>
              <div class="empty-hint">{{ vaError }}</div>
              <div class="mute" style="font-size:12px;margin-top:10px;text-align:left;">
                · 请确认视频画面中完整出现全身，且光线充足<br>
                · 建议侧面或侧面 45° 拍摄，避免遮挡关节<br>
                · 姿态模型位于 libs/mediapipe/，请通过本地服务器访问（非 file://）
              </div>
            </div>
            <template v-else-if="vaState === 'result' && result">
              <div class="score-ring" :style="ringStyle">{{ result.score }}</div>
              <div class="center" style="margin-top:12px;font-weight:700;">{{ result.type }} 动作评分</div>
              <div class="mute center" style="font-size:12px;margin-top:4px;">基于 {{ result.frames }} 帧关键点轨迹与关节角度计算（耗时 {{ result.costMs }} ms）</div>
              <canvas ref="canvasEl" style="width:100%;border-radius:12px;margin-top:12px;background:var(--canvas-bg);"></canvas>
              <div class="grid grid-2" style="gap:10px;margin-top:12px;">
                <div class="card" style="margin:0;padding:10px;"><div class="mute" style="font-size:11px;">{{ result.upper ? '最小肘角（收缩深度）' : '最小膝角（下蹲深度）' }}</div><div style="font-size:18px;font-weight:800;">{{ fmt(result.upper ? result.minElbow : result.minKnee) }}</div></div>
                <div class="card" style="margin:0;padding:10px;"><div class="mute" style="font-size:11px;">最大躯干前倾</div><div style="font-size:18px;font-weight:800;">{{ fmt(result.maxLean) }}</div></div>
                <div class="card" style="margin:0;padding:10px;"><div class="mute" style="font-size:11px;">动作行程</div><div style="font-size:18px;font-weight:800;">{{ fmt(result.range) }}</div></div>
                <div class="card" style="margin:0;padding:10px;"><div class="mute" style="font-size:11px;">左右最大差值</div><div style="font-size:18px;font-weight:800;">{{ fmt(result.maxAsym) }}</div></div>
              </div>
              <div class="divider"></div>
              <div class="card-title" style="font-size:13.5px;"><Icon name="alert" /> 检测到的问题</div>
              <template v-if="result.issues.length">
                <div v-for="(i, idx) in result.issues" :key="idx" :style="issueStyle(i)">{{ i.text }}</div>
              </template>
              <div v-else class="mute" style="font-size:13px;">动作标准，未发现明显问题 <Icon name="thumbsUp" :size="14" /></div>
              <div class="card-title" style="font-size:13.5px;margin-top:16px;"><Icon name="bulb" /> 改进建议</div>
              <div style="font-size:13px;line-height:1.8;color:var(--text-dim);">
                · 先用轻重量把动作幅度做完整，再逐步加重<br>
                · 训练前热身并激活目标肌群，训练中保持核心收紧<br>
                · 建议侧面或侧面 45° 固定机位拍摄，便于对比每次训练<br>
                · 左右差值持续偏大时，增加单侧训练补齐弱侧
              </div>
              <div class="mute" style="font-size:11px;margin-top:14px;"><Icon name="alert" :size="13" /> 本分析基于二维关键点估算，仅作训练参考，不构成医疗或专业指导。</div>
            </template>
            <div v-else class="empty">
              <div class="empty-ico"><Icon name="video" :size="44" /></div>
              <div class="empty-title">{{ mediaReady ? '已载入动作片段' : '上传视频后开始分析' }}</div>
              <div class="empty-hint">{{ mediaReady ? '点击「开始分析」检测关键点并评估动作质量' : '系统将检测人体关键点并评估动作质量' }}</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
