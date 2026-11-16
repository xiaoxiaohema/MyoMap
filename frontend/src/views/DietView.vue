<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import Icon from '@/components/Icon.vue'

const C = window.Common
const S = window.Store
const router = useRouter()

const version = ref(0)
const aiVersion = ref(0)

const date = ref(S.todayStr())
const meal = ref('早餐')
const dietText = ref('')
const parsing = ref(false)

const photoFile = ref(null)
const photoDataUrl = ref(null)
const photoWrap = ref(false)
const photoItems = ref([])
const photoNote = ref('')
const photoEmpty = ref('')
const photoError = ref('')
const photoAnalyzing = ref(false)

function refresh() { version.value++ }

// ---------- 目标 ----------
const targets = computed(() => {
  void version.value
  const s = S.getSettings()
  const t = C.macroTargets(S.getProfile())
  return s.nutrition ? Object.assign(t, s.nutrition) : t
})

// ---------- 汇总 ----------
const todayList = computed(() => { void version.value; return S.getDiet(date.value) })

const sum = computed(() => {
  const s = { kcal: 0, protein: 0, carb: 0, fat: 0 }
  todayList.value.forEach((x) => {
    s.kcal += Number(x.kcal) || 0
    s.protein += Number(x.protein) || 0
    s.carb += Number(x.carb) || 0
    s.fat += Number(x.fat) || 0
  })
  return s
})

const todayKcal = computed(() => Math.round(sum.value.kcal) + ' kcal')

const nutriRows = computed(() => {
  const t = targets.value
  const s = sum.value
  return [
    { key: 'kcal', label: '热量', unit: 'kcal', val: Math.round(s.kcal), target: t.kcal, cls: '' },
    { key: 'protein', label: '蛋白质', unit: 'g', val: C.round(s.protein, 1), target: t.protein, cls: 'green' },
    { key: 'carb', label: '碳水', unit: 'g', val: C.round(s.carb, 1), target: t.carb, cls: 'blue' },
    { key: 'fat', label: '脂肪', unit: 'g', val: C.round(s.fat, 1), target: t.fat, cls: 'yellow' }
  ].map((r) => {
    const pct = r.target ? C.clamp(r.val / r.target * 100, 0, 130) : 0
    const over = r.val > r.target * 1.05
    return Object.assign(r, { pct, over, width: Math.min(pct, 100), pctLabel: Math.round(pct) })
  })
})

const goalSub = computed(() => {
  void version.value
  const p = S.getProfile()
  return p.goal + ' · TDEE ' + C.calcTDEE(p) + ' kcal'
})

const remain = computed(() => targets.value.kcal - sum.value.kcal)

const recordGroups = computed(() => {
  const meals = ['早餐', '午餐', '晚餐', '加餐']
  return meals.map((m) => {
    const items = todayList.value.filter((x) => x.meal === m)
    const kcal = items.reduce((s, x) => s + (Number(x.kcal) || 0), 0)
    return { meal: m, items, kcal }
  }).filter((g) => g.items.length)
})

const advice = computed(() => {
  const t = targets.value
  const s = sum.value
  const tips = []
  const pctK = s.kcal / t.kcal
  if (pctK < 0.6) tips.push('当前热量摄入偏低（' + Math.round(pctK * 100) + '%），建议补充一餐，避免影响代谢与恢复。')
  if (pctK > 1.1) tips.push('热量已超出目标 ' + Math.round((pctK - 1) * 100) + '%，注意控制高热量食物。')
  if (s.protein < t.protein * 0.7) tips.push('蛋白质摄入不足，建议增加 ' + Math.round(t.protein - s.protein) + 'g，如 100g 鸡胸肉或 2 个鸡蛋。')
  if (s.carb < t.carb * 0.6) tips.push('碳水偏低，训练前可补充燕麦、香蕉等优质碳水。')
  if (s.fat > t.fat * 1.1) tips.push('脂肪摄入偏高，建议减少油炸与坚果类摄入。')
  return { tips, balanced: !tips.length }
})

const RECIPES = [
  { name: '香煎鸡胸 + 糙米 + 西兰花', kcal: 420, protein: 45, items: ['鸡胸肉 150g', '米饭 150g', '西兰花 200g'] },
  { name: '三文鱼牛油果沙拉', kcal: 480, protein: 32, items: ['三文鱼 120g', '牛油果 1个', '生菜 100g'] },
  { name: '牛肉炒时蔬 + 红薯', kcal: 460, protein: 38, items: ['牛肉 120g', '红薯 200g', '菠菜 150g'] },
  { name: '希腊酸奶 + 蓝莓 + 坚果', kcal: 300, protein: 20, items: ['酸奶 200g', '蓝莓 80g', '坚果 20g'] },
  { name: '蛋白粉 + 香蕉 + 燕麦', kcal: 380, protein: 35, items: ['蛋白粉 30g', '香蕉 1根', '燕麦 50g'] }
]

const recipeData = computed(() => {
  const t = targets.value
  const s = sum.value
  const remainR = { kcal: t.kcal - s.kcal, protein: Math.max(0, t.protein - s.protein) }
  const pick = RECIPES.filter((r) => r.kcal <= Math.max(remainR.kcal, 250)).slice(0, 3)
  const list = pick.length ? pick : RECIPES.slice(0, 2)
  return { remainKcal: Math.max(0, Math.round(remainR.kcal)), remainProtein: Math.round(remainR.protein), list }
})

const foodEntries = computed(() => Object.entries(C.FOOD_DB))

// ---------- AI 拍照识别 ----------
const photoModel = computed(() => {
  void aiVersion.value
  if (!window.MyAI || !window.MyAI.isConfigured()) return { configured: false, label: '未配置 AI', warnKey: false }
  const c = window.MyAI.getConfig()
  const vm = c.visionModel || c.model
  return { configured: true, label: vm || '未设视觉模型', warnKey: window.MyAI.needsKey() && !window.MyAI.hasKey() }
})

const photoSummary = computed(() => photoItems.value.reduce((a, x) => {
  a.kcal += x.kcal; a.protein += x.protein; a.carb += x.carb; a.fat += x.fat; return a
}, { kcal: 0, protein: 0, carb: 0, fat: 0 }))

// ---------- 本地解析 ----------
function parseFoodText(text) {
  const segs = text.split(/[、,，;；\n\/]+/).map((s) => s.trim()).filter(Boolean)
  const items = []
  segs.forEach((seg) => {
    const found = C.lookupFood(seg)
    if (!found) return
    const f = found.data
    let grams
    const gm = seg.match(/(\d+(?:\.\d+)?)\s*(?:克|g|G|毫升|ml|ML)/)
    if (gm) grams = Number(gm[1])
    else {
      const qm = seg.match(/(\d+(?:\.\d+)?)/)
      const qty = qm ? Number(qm[1]) : 1
      grams = f.per ? qty * f.per : qty * 100
    }
    items.push({
      name: found.name,
      grams: Math.round(grams),
      kcal: Math.round(f.kcal * grams / 100),
      protein: C.round(f.protein * grams / 100, 1),
      carb: C.round(f.carb * grams / 100, 1),
      fat: C.round(f.fat * grams / 100, 1)
    })
  })
  return items
}

async function addParsed() {
  const text = dietText.value.trim()
  if (!text) { C.toast('请输入饮食描述', 'warn'); return }
  parsing.value = true
  const items = parseFoodText(text)
  if (!items.length) {
    // 尝试后端 AI 解析，失败用本地（后端返回结构未知，忽略）
    await C.apiOrNull('/food/analyze', 'POST', { text })
  }
  parsing.value = false
  if (!items.length) {
    C.toast('未识别出食物，请参考下方食物库或使用「快速添加」', 'warn')
    return
  }
  const d = date.value || S.todayStr()
  items.forEach((it) => S.addDiet(Object.assign({ date: d, meal: meal.value, raw: text }, it)))
  dietText.value = ''
  C.toast('已记录 ' + items.length + ' 种食物', 'ok')
  refresh()
}

function quickAdd() {
  const names = Object.keys(C.FOOD_DB)
  const m = C.openModal(
    '<div class="modal-title">快速添加食物</div>' +
    '<div class="modal-sub">从食物库选择并填写分量</div>' +
    '<div class="input-row"><div class="field"><label class="label">食物</label><select class="select" id="qa-food">' +
      names.map((n) => '<option>' + C.esc(n) + '</option>').join('') + '</select></div>' +
    '<div class="field"><label class="label">分量 (g)</label><input class="input" type="number" id="qa-g" value="100"></div></div>' +
    '<div class="flex gap-12" style="justify-content:flex-end;"><button class="btn btn-ghost" data-x>取消</button><button class="btn btn-primary" data-ok>添加</button></div>')
  m.el.querySelector('[data-x]').onclick = m.close
  m.el.querySelector('[data-ok]').onclick = () => {
    const name = m.el.querySelector('#qa-food').value
    const g = Number(m.el.querySelector('#qa-g').value) || 100
    const f = C.FOOD_DB[name]
    const d = date.value || S.todayStr()
    S.addDiet({
      date: d, meal: meal.value, name, grams: g,
      kcal: Math.round(f.kcal * g / 100), protein: C.round(f.protein * g / 100, 1),
      carb: C.round(f.carb * g / 100, 1), fat: C.round(f.fat * g / 100, 1), raw: '快速添加'
    })
    m.close(); C.toast('已添加', 'ok'); refresh()
  }
}

function delItem(id) {
  S.deleteDiet(id)
  refresh()
  C.toast('已删除', 'ok')
}

function adjustTargets() {
  const t = targets.value
  const m = C.openModal(
    '<div class="modal-title">调整营养目标</div>' +
    '<div class="modal-sub">手动设定每日营养配额</div>' +
    '<div class="input-row"><div class="field"><label class="label">热量 (kcal)</label><input class="input" type="number" id="nt-k" value="' + t.kcal + '"></div>' +
    '<div class="field"><label class="label">蛋白质 (g)</label><input class="input" type="number" id="nt-p" value="' + t.protein + '"></div></div>' +
    '<div class="input-row"><div class="field"><label class="label">碳水 (g)</label><input class="input" type="number" id="nt-c" value="' + t.carb + '"></div>' +
    '<div class="field"><label class="label">脂肪 (g)</label><input class="input" type="number" id="nt-f" value="' + t.fat + '"></div></div>' +
    '<div class="flex gap-12" style="justify-content:space-between;margin-top:8px;">' +
      '<button class="btn btn-ghost" data-reset>恢复默认</button>' +
      '<span><button class="btn btn-ghost" data-x>取消</button> <button class="btn btn-primary" data-ok>保存</button></span></div>')
  m.el.querySelector('[data-x]').onclick = m.close
  m.el.querySelector('[data-reset]').onclick = () => { S.saveSettings({ nutrition: null }); m.close(); refresh(); C.toast('已恢复默认目标', 'ok') }
  m.el.querySelector('[data-ok]').onclick = () => {
    S.saveSettings({
      nutrition: {
        kcal: Number(m.el.querySelector('#nt-k').value) || t.kcal,
        protein: Number(m.el.querySelector('#nt-p').value) || t.protein,
        carb: Number(m.el.querySelector('#nt-c').value) || t.carb,
        fat: Number(m.el.querySelector('#nt-f').value) || t.fat
      }
    })
    m.close(); refresh(); C.toast('营养目标已更新', 'ok')
  }
}

// ---------- 拍照 ----------
function openAISetup() { window.MyAI.openSetup(() => { aiVersion.value++ }) }
function pickPhoto() { if (photoFile.value) photoFile.value.click() }

function fileToDataUrl(file, maxSize) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height))
        const w = Math.max(1, Math.round(img.width * scale))
        const h = Math.max(1, Math.round(img.height * scale))
        const canvas = document.createElement('canvas')
        canvas.width = w; canvas.height = h
        canvas.getContext('2d').drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/jpeg', 0.82))
      }
      img.onerror = () => reject(new Error('图片读取失败'))
      img.src = reader.result
    }
    reader.onerror = () => reject(new Error('文件读取失败'))
    reader.readAsDataURL(file)
  })
}

async function onPhotoChange(e) {
  const f = e.target.files[0]
  if (!f) return
  try {
    photoDataUrl.value = await fileToDataUrl(f, 900)
    photoWrap.value = true
    photoItems.value = []
    photoNote.value = ''
    photoEmpty.value = ''
    photoError.value = ''
  } catch (err) {
    C.toast(err.message, 'err')
  }
}

function clearPhoto() {
  photoDataUrl.value = null
  photoItems.value = []
  photoNote.value = ''
  photoEmpty.value = ''
  photoError.value = ''
  photoWrap.value = false
  if (photoFile.value) photoFile.value.value = ''
}

function parseJsonLoose(text) {
  if (!text) return null
  let s = String(text).trim()
  s = s.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim()
  const i = s.indexOf('{'), j = s.lastIndexOf('}')
  if (i >= 0 && j > i) s = s.slice(i, j + 1)
  try { return JSON.parse(s) } catch (e) { return null }
}

async function analyzePhoto() {
  if (!photoDataUrl.value) { C.toast('请先选择照片', 'warn'); return }
  const useBackend = !!S.token()
  const useClient = window.MyAI && window.MyAI.isConfigured()
  if (!useBackend && !useClient) {
    C.toast('请先登录，或在「AI 设置」中配置视觉模型', 'warn')
    openAISetup()
    return
  }
  photoAnalyzing.value = true
  photoError.value = ''
  photoEmpty.value = ''
  photoItems.value = []
  photoNote.value = ''

  const prompt = '请识别这张照片中的食物，估算每种食物的分量（克）与营养，并只输出如下 JSON：\n' +
    '{"items":[{"name":"食物名","grams":200,"kcal":300,"protein":20,"carb":30,"fat":10}],"note":"简要说明"}。\n' +
    '要求：name 用中文；数值为整数或一位小数；若照片中没有食物或无法识别，返回 {"items":[],"note":"原因"}。'

  try {
    let text = null
    if (useBackend) {
      const resp = await C.apiOrNull('/food/analyze', 'POST', { image: photoDataUrl.value })
      if (resp && resp.code === 1 && resp.data && resp.data.aiAnalysis) text = resp.data.aiAnalysis
    }
    if (!text && useClient) text = await window.MyAI.vision(photoDataUrl.value, prompt)
    if (!text) throw new Error('识别服务不可用，请稍后重试')

    const parsed = parseJsonLoose(text)
    if (!parsed || !parsed.items || !parsed.items.length) {
      photoEmpty.value = '未能识别出食物' + (parsed && parsed.note ? '：' + parsed.note : '，请换一张更清晰的照片')
    } else {
      photoItems.value = parsed.items.map((it) => ({
        name: String(it.name || '食物').slice(0, 20),
        grams: Math.round(Number(it.grams) || 0),
        kcal: Math.round(Number(it.kcal) || 0),
        protein: C.round(Number(it.protein) || 0, 1),
        carb: C.round(Number(it.carb) || 0, 1),
        fat: C.round(Number(it.fat) || 0, 1)
      }))
      photoNote.value = parsed.note || ''
    }
  } catch (e) {
    photoError.value = e.message
    if (/API Key|鉴权|视觉模型/.test(e.message)) setTimeout(openAISetup, 400)
  }
  photoAnalyzing.value = false
}

function photoAdd() {
  if (!S.isLoggedIn()) { router.push({ name: 'login', query: { next: 'diet' } }); return }
  const d = date.value || S.todayStr()
  photoItems.value.forEach((x) => S.addDiet(Object.assign({ date: d, meal: meal.value, raw: 'AI 拍照识别' }, x)))
  C.toast('已加入今日记录：' + photoItems.value.length + ' 项', 'ok')
  photoItems.value = []
  photoNote.value = ''
  refresh()
}
</script>

<template>
  <div class="grid two-col" style="grid-template-columns:minmax(0,1fr) minmax(320px,400px);align-items:start;">
    <div>
      <div class="card">
        <div class="card-title"><span class="ct-ico"><Icon name="target" /></span> 今日营养目标 <span class="ct-sub">{{ goalSub }}</span>
          <button class="btn btn-sm btn-ghost" style="margin-left:10px;" @click="adjustTargets">调整比例</button>
        </div>
        <div class="grid grid-2">
          <div>
            <div v-for="r in nutriRows" :key="r.key" class="nutri-row">
              <div class="nutri-head"><span>{{ r.label }}</span><span class="mute">{{ r.val }} / {{ r.target }} {{ r.unit }}</span></div>
              <div class="progress" :class="r.over ? 'over' : r.cls"><i :style="{ width: r.width + '%' }"></i></div>
              <div class="mute" style="font-size:11px;margin-top:4px;">{{ r.pctLabel }}%<template v-if="r.over"> · 已超标</template></div>
            </div>
          </div>
          <div>
            <div class="stat" style="height:100%;justify-content:center;">
              <span class="stat-ico"><Icon :name="remain >= 0 ? 'utensils' : 'alert'" /></span>
              <span class="stat-val">{{ Math.abs(Math.round(remain)) }}<small>kcal</small></span>
              <span class="stat-label">{{ remain >= 0 ? '剩余可摄入' : '超出目标' }}</span>
              <div style="margin-top:12px;font-size:12px;color:var(--text-mute);line-height:1.7;">
                蛋白 {{ Math.round(sum.protein) }}g · 碳水 {{ Math.round(sum.carb) }}g · 脂肪 {{ Math.round(sum.fat) }}g
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-title"><span class="ct-ico"><Icon name="utensils" /></span> 记录饮食 <span class="ct-sub">支持自然语言，如「早餐：2个鸡蛋、1杯牛奶、1片全麦面包」</span></div>
        <div class="input-row">
          <div class="field"><label class="label">餐别</label>
            <select class="select" v-model="meal">
              <option value="早餐"> 早餐</option>
              <option value="午餐"> 午餐</option>
              <option value="晚餐"> 晚餐</option>
              <option value="加餐"> 加餐</option>
            </select>
          </div>
          <div class="field"><label class="label">日期</label><input class="input" type="date" v-model="date"></div>
        </div>
        <div class="field">
          <label class="label">饮食描述</label>
          <textarea class="textarea" v-model="dietText" placeholder="例如：2个鸡蛋、1杯牛奶、1片全麦面包、100g鸡胸肉"></textarea>
        </div>
        <div class="flex gap-8">
          <button class="btn btn-primary" :disabled="parsing" @click="addParsed"><Icon name="sparkles" /> {{ parsing ? '解析中…' : 'AI 解析并记录' }}</button>
          <button class="btn btn-ghost" @click="quickAdd">快速添加</button>
        </div>
      </div>

      <!-- AI 拍照识别热量 -->
      <div class="card">
        <div class="card-title"><span class="ct-ico"><Icon name="image" /></span> AI 拍照识别热量
          <span class="ct-sub">
            <span v-if="!photoModel.configured" class="tag">未配置 AI</span>
            <template v-else>
              <span class="tag tag-accent">{{ photoModel.label }}</span>
              <span v-if="photoModel.warnKey" class="tag tag-red">缺少 API Key</span>
            </template>
          </span>
          <button class="btn btn-sm btn-ghost" style="margin-left:10px;" @click="openAISetup"><Icon name="pencil" :size="13" /> AI 设置</button>
        </div>

        <div v-if="!photoWrap" class="photo-drop" @click="pickPhoto">
          <div style="opacity:.5;"><Icon name="upload" :size="30" /></div>
          <div style="margin-top:8px;font-weight:600;font-size:13.5px;">点击上传 / 拍摄食物照片</div>
          <div class="mute" style="font-size:11.5px;margin-top:4px;">AI 将识别食物种类与分量，估算热量与三大营养素</div>
        </div>
        <input ref="photoFile" type="file" accept="image/*" capture="environment" class="hidden" @change="onPhotoChange">

        <div v-if="photoWrap" style="margin-top:12px;">
          <img :src="photoDataUrl" alt="食物照片" style="width:100%;max-height:280px;object-fit:contain;border-radius:12px;background:var(--viewer-bg);">
          <div class="flex gap-8" style="margin-top:12px;">
            <button class="btn btn-primary" :disabled="photoAnalyzing" @click="analyzePhoto"><Icon name="sparkles" /> {{ photoAnalyzing ? '识别中…' : 'AI 识别热量' }}</button>
            <button class="btn btn-ghost" @click.stop="clearPhoto">重新选择</button>
          </div>
        </div>

        <div style="margin-top:14px;">
          <div v-if="photoAnalyzing" class="loading-row"><span class="spinner"></span> AI 正在识别食物…</div>
          <div v-else-if="photoError" style="color:var(--red-ink);font-size:13px;">识别失败：{{ photoError }}</div>
          <div v-else-if="photoEmpty" class="mute" style="font-size:13px;">{{ photoEmpty }}</div>
          <div v-else-if="photoItems.length" class="card" style="background:rgba(255,107,53,0.07);border-color:rgba(255,107,53,0.22);padding:14px;">
            <div class="flex items-center justify-between" style="margin-bottom:10px;">
              <b style="font-size:13.5px;">识别结果（{{ photoItems.length }} 项）</b>
              <span class="tag tag-accent">合计 {{ Math.round(photoSummary.kcal) }} kcal</span>
            </div>
            <div v-for="(x, i) in photoItems" :key="i" class="photo-item">
              <span style="flex:1;font-weight:600;">{{ x.name }}</span>
              <span class="mute">{{ x.grams ? x.grams + 'g · ' : '' }}P{{ x.protein }} C{{ x.carb }} F{{ x.fat }}</span>
              <span class="fi-kcal">{{ x.kcal }}</span>
            </div>
            <div v-if="photoNote" class="mute" style="font-size:12px;margin-top:10px;">{{ photoNote }}</div>
            <div class="flex gap-8" style="margin-top:12px;">
              <button class="btn btn-primary btn-sm" @click="photoAdd">加入今日记录</button>
              <span class="mute" style="font-size:11.5px;align-self:center;">AI 估算仅供参考，可按实际调整</span>
            </div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-title"><span class="ct-ico"><Icon name="clipboard" /></span> 今日饮食记录 <span class="ct-sub">{{ todayKcal }}</span></div>
        <div v-if="!todayList.length" class="empty">
          <div class="empty-ico"><Icon name="utensils" /></div>
          <div class="empty-title">今天还没有记录</div>
          <div class="empty-hint">在上方输入饮食描述开始记录</div>
        </div>
        <div v-else>
          <div v-for="g in recordGroups" :key="g.meal" class="meal-block">
            <div class="meal-title">{{ g.meal }} <span class="mute" style="font-weight:400;">{{ Math.round(g.kcal) }} kcal</span></div>
            <div v-for="x in g.items" :key="x.id" class="food-item">
              <span class="fi-name">{{ x.name }}</span>
              <span class="fi-macro">{{ x.grams ? x.grams + 'g · ' : '' }}P{{ x.protein }} C{{ x.carb }} F{{ x.fat }}</span>
              <span class="fi-kcal">{{ x.kcal }}</span>
              <button class="btn btn-sm btn-danger" @click="delItem(x.id)">✕</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div>
      <div class="card">
        <div class="card-title"><span class="ct-ico"><Icon name="sparkles" /></span> AI 营养建议</div>
        <div class="mute" style="font-size:13px;line-height:1.8;">
          <template v-if="advice.balanced">
            <div style="margin-bottom:10px;">• <Icon name="thumbsUp" :size="14" /> 今日营养摄入均衡，继续保持！</div>
          </template>
          <template v-else>
            <div v-for="(t, i) in advice.tips" :key="i" style="margin-bottom:10px;">• {{ t }}</div>
          </template>
          <div class="mute" style="font-size:11px;margin-top:12px;">（AI 建议仅供参考，请根据自身情况调整）</div>
        </div>
      </div>

      <div class="card">
        <div class="card-title"><span class="ct-ico"><Icon name="leaf" /></span> 今日推荐食谱 <span class="ct-sub">基于剩余配额</span></div>
        <div class="mute" style="font-size:12px;margin-bottom:12px;">剩余 {{ recipeData.remainKcal }} kcal · 蛋白质缺口 {{ recipeData.remainProtein }}g</div>
        <div v-for="(r, i) in recipeData.list" :key="i" style="padding:12px;border-radius:12px;background:var(--surface-1);border:1px solid var(--border);margin-bottom:10px;">
          <div class="flex justify-between"><span style="font-weight:600;font-size:13.5px;">{{ r.name }}</span><span class="tag tag-accent">{{ r.kcal }} kcal</span></div>
          <div class="mute" style="font-size:11.5px;margin-top:6px;">蛋白 {{ r.protein }}g · {{ r.items.join(' · ') }}</div>
        </div>
      </div>

      <div class="card">
        <div class="card-title"><span class="ct-ico"><Icon name="book" /></span> 常见食物库 <span class="ct-sub">每 100g</span></div>
        <div style="max-height:260px;overflow-y:auto;">
          <table class="table">
            <thead><tr><th>食物</th><th>热量</th><th>P/C/F</th></tr></thead>
            <tbody>
              <tr v-for="[n, f] in foodEntries" :key="n">
                <td><strong>{{ n }}</strong></td>
                <td>{{ f.kcal }}</td>
                <td class="mute">{{ f.protein }}/{{ f.carb }}/{{ f.fat }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>
