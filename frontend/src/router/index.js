import { createRouter, createWebHashHistory } from 'vue-router'
import AppLayout from '@/components/AppLayout.vue'

const routes = [
  { path: '/login', name: 'login', component: () => import('@/views/LoginView.vue') },
  {
    path: '/',
    component: AppLayout,
    children: [
      { path: '', name: 'home', component: () => import('@/views/HomeView.vue'), meta: { title: '人体交互式部位选择器', subtitle: '点击 3D 模型上的肌肉（可多选）获取训练动作', nav: 'home' } },
      { path: 'library', name: 'library', component: () => import('@/views/LibraryView.vue'), meta: { title: '动作库', subtitle: '按部位 / 器械 / 难度筛选', nav: 'library' } },
      { path: 'muscles', name: 'muscles', component: () => import('@/views/MuscleGroupsView.vue'), meta: { title: '肌群分类', subtitle: '按肌群浏览动作库', nav: 'library' } },
      { path: 'level', name: 'level', component: () => import('@/views/LevelView.vue'), meta: { title: '难度分类', subtitle: '按难度浏览动作库', nav: 'library' } },
      { path: 'plan', name: 'plan', component: () => import('@/views/PlanView.vue'), meta: { title: '训练计划', subtitle: '生成 · 管理 · 模板', nav: 'plan', auth: true } },
      { path: 'workout', name: 'workout', component: () => import('@/views/WorkoutView.vue'), meta: { title: '训练记录', subtitle: '训练模式 · 容量统计 · 1RM 估算', nav: 'workout', auth: true } },
      { path: 'body', name: 'body', component: () => import('@/views/BodyView.vue'), meta: { title: '身体数据', subtitle: '体重 / 体成分 / 围度趋势', nav: 'body', auth: true } },
      { path: 'diet', name: 'diet', component: () => import('@/views/DietView.vue'), meta: { title: '饮食规划', subtitle: '热量 · 三大营养素 · AI 识别', nav: 'diet', auth: true } },
      { path: 'map', name: 'map', component: () => import('@/views/MapView.vue'), meta: { title: '地图行程', subtitle: '跑步 / 骑行路线规划', nav: 'map', auth: true } },
      { path: 'ai', name: 'ai', component: () => import('@/views/AiView.vue'), meta: { title: 'AI 智能助手', subtitle: '对话问答 · 动作解析', nav: 'ai', auth: true } },
      { path: 'device', name: 'device', component: () => import('@/views/DeviceView.vue'), meta: { title: '智能设备', subtitle: '手环 / 手表数据接入', nav: 'device', auth: true } },
      { path: 'profile', name: 'profile', component: () => import('@/views/ProfileView.vue'), meta: { title: '我的档案', subtitle: '个人资料与偏好设置', nav: 'profile', auth: true } }
    ]
  }
]

const router = createRouter({ history: createWebHashHistory(), routes })

router.beforeEach((to) => {
  const S = window.Store
  if (to.meta && to.meta.auth && S && !S.isLoggedIn()) {
    return { name: 'login', query: { next: to.fullPath } }
  }
})

export default router
