<script setup>
import { reactive, ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Icon from '@/components/Icon.vue'

const C = window.Common
const S = window.Store
const route = useRoute()
const router = useRouter()
const next = route.query.next || 'home'

const tab = ref('login')
const msg = reactive({ login: '', register: '' })
const form = reactive({ lu: '', lp: '', remember: false, ru: '', re: '', rp: '', rp2: '', captcha: '' })
const pwScore = ref(0)
const captured = reactive({ id: '', ready: false, question: '加载中…' })

onMounted(() => {
  S.ensureDemoAccount && S.ensureDemoAccount()
  if (S.isLoggedIn()) { router.replace({ name: 'home' }); return }
  try {
    const saved = JSON.parse(localStorage.getItem('myomap:remember') || 'null')
    if (saved) { form.lu = saved.u; form.lp = saved.p; form.remember = true }
  } catch (e) {}
  loadCaptcha()
})

async function loadCaptcha() {
  form.captcha = ''
  captured.question = '加载中…'
  const r = await C.apiOrNull('/user/captcha', 'GET')
  if (r && r.code === 1 && r.data && r.data.id) {
    captured.id = r.data.id; captured.ready = true; captured.question = r.data.question
  } else {
    captured.ready = false; captured.question = '离线'
  }
}

function onPw(e) {
  const pw = e.target.value
  let sc = 0
  if (pw.length >= 8) sc++
  if (/[A-Za-z]/.test(pw) && /\d/.test(pw)) sc++
  if (/[^A-Za-z0-9]/.test(pw) || pw.length >= 12) sc++
  pwScore.value = sc
}

async function doLogin() {
  msg.login = ''
  const resp = await C.apiOrNull('/user/login', 'POST', { username: form.lu, password: form.lp })
  if (resp) {
    if (resp.code === 1 && resp.data) {
      S.setSession({ id: 'b' + resp.data.id, username: resp.data.username, email: resp.data.email, guest: false, token: resp.data.token })
      afterBackendLogin()
    } else { msg.login = resp.msg || '登录失败'; return }
  } else {
    const r = await S.login(form.lu, form.lp)
    if (!r.ok) { msg.login = r.msg; return }
  }
  if (form.remember) localStorage.setItem('myomap:remember', JSON.stringify({ u: form.lu, p: form.lp }))
  else localStorage.removeItem('myomap:remember')
  C.toast('登录成功，欢迎回来 ' + form.lu, 'ok')
  setTimeout(() => router.replace({ name: next }), 300)
}

async function doRegister() {
  msg.register = ''
  const u = form.ru.trim(); const email = form.re.trim(); const p = form.rp
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(u)) { msg.register = '用户名需为 3-20 位字母、数字或下划线'; return }
  if (p.length < 8 || p.length > 64) { msg.register = '密码长度需在 8-64 位'; return }
  if (!/[A-Za-z]/.test(p) || !/\d/.test(p)) { msg.register = '密码需同时包含字母和数字'; return }
  if (p !== form.rp2) { msg.register = '两次输入的密码不一致'; return }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { msg.register = '邮箱格式不正确'; return }
  if (captured.ready && !form.captcha.trim()) { msg.register = '请填写验证码'; return }
  const payload = { username: u, password: p, email }
  if (captured.ready) { payload.captchaId = captured.id; payload.captchaAnswer = form.captcha.trim() }
  const resp = await C.apiOrNull('/user/register', 'POST', payload)
  if (resp && resp.code === 1 && resp.data) {
    S.setSession({ id: 'b' + resp.data.id, username: resp.data.username, email: resp.data.email, guest: false, token: resp.data.token })
    afterBackendLogin()
  } else if (resp) {
    msg.register = resp.msg || '注册失败'
    if (/验证码/.test(msg.register)) loadCaptcha()
    return
  } else {
    const r = await S.register(u, p, email)
    if (!r.ok) { msg.register = r.msg; return }
  }
  C.toast('注册成功，已自动登录', 'ok')
  setTimeout(() => router.replace({ name: next }), 300)
}

function guestMode() { S.loginAsGuest(); router.replace({ name: 'home' }) }

// 后端账号登录成功：先认领本地账号时期的数据，再补推离线队列
function afterBackendLogin() {
  const SY = window.Sync
  if (!SY) return
  try {
    const r = SY.claimLocalData()
    if (r && r.moved) C.toast('已把本地 ' + r.moved + ' 项数据关联到当前账号', 'ok')
  } catch (e) { }
  SY.flush().then((res) => {
    if (res && res.msg && res.pending === 0 && res.done) C.toast('数据已同步到服务器', 'ok')
  })
}
</script>

<template>
  <div class="auth">
    <div class="auth-visual">
      <div class="av-logo">MyoMap</div>
      <div class="av-title">懂你的身体，随你的节奏<br>护你的隐私</div>
      <div class="av-desc">本地优先、AI 驱动、多源数据融合的智能健身伴侣。从计划制定到动作指导、数据追踪与饮食管理，全链路陪伴你的训练。</div>
      <div class="av-feats">
        <div class="av-feat"><i><Icon name="cube" :size="16" /></i> 3D 交互式部位选择</div>
        <div class="av-feat"><i><Icon name="clipboard" :size="16" /></i> 个性化训练计划与记录</div>
        <div class="av-feat"><i><Icon name="chart" :size="16" /></i> 体重 / 体成分趋势追踪</div>
        <div class="av-feat"><i><Icon name="nutrition" :size="16" /></i> AI 饮食识别与营养规划</div>
      </div>
    </div>

    <div class="auth-panel">
      <div class="auth-box">
        <div class="auth-tabs">
          <button :class="{ active: tab === 'login' }" @click="tab = 'login'">登录</button>
          <button :class="{ active: tab === 'register' }" @click="tab = 'register'; loadCaptcha()">注册</button>
        </div>

        <form v-if="tab === 'login'" @submit.prevent="doLogin">
          <div class="field"><label class="label">用户名</label><input class="input" v-model="form.lu" placeholder="请输入用户名" autocomplete="username"></div>
          <div class="field"><label class="label">密码</label><input class="input" v-model="form.lp" type="password" placeholder="请输入密码" autocomplete="current-password"></div>
          <div class="flex items-center justify-between">
            <label class="checkbox"><input type="checkbox" v-model="form.remember"> 记住我</label>
            <span class="mute" style="font-size:12px;">数据仅保存在本地</span>
          </div>
          <div class="err">{{ msg.login }}</div>
          <button class="btn btn-primary btn-block btn-lg" type="submit">登录</button>
        </form>

        <form v-else @submit.prevent="doRegister">
          <div class="field"><label class="label">用户名</label><input class="input" v-model="form.ru" placeholder="3-20 位字母 / 数字 / 下划线" autocomplete="username"></div>
          <div class="field"><label class="label">邮箱（可选）</label><input class="input" v-model="form.re" type="email" placeholder="you@example.com" autocomplete="email"></div>
          <div class="field"><label class="label">密码</label><input class="input" v-model="form.rp" type="password" placeholder="至少 8 位，含字母和数字" autocomplete="new-password" @input="onPw"></div>
          <div class="pw-meter"><i :style="{ width: (pwScore >= 3 ? 100 : pwScore === 2 ? 66 : pwScore === 1 ? 33 : 0) + '%', background: pwScore >= 3 ? 'var(--green)' : pwScore === 2 ? 'var(--yellow)' : 'var(--red)' }" /></div>
          <div class="field"><label class="label">确认密码</label><input class="input" v-model="form.rp2" type="password" placeholder="再次输入密码" autocomplete="new-password"></div>
          <div v-if="captured.ready" class="field">
            <label class="label">验证码</label>
            <div class="captcha-row">
              <input class="input" v-model="form.captcha" placeholder="填写计算结果" inputmode="numeric" maxlength="4" autocomplete="off">
              <button type="button" class="captcha-box" @click="loadCaptcha">{{ captured.question }}</button>
            </div>
          </div>
          <div class="err">{{ msg.register }}</div>
          <button class="btn btn-primary btn-block btn-lg" type="submit">创建账号</button>
        </form>

        <div class="guest-link"><button class="btn btn-ghost btn-block" @click="guestMode">游客模式进入（仅浏览首页 / 动作库）</button></div>
        <div class="auth-hint">本系统为本地优先架构，账号与数据均保存在你的浏览器中</div>
      </div>
    </div>
  </div>
</template>
