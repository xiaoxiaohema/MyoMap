import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

// 复用原项目设计系统与逻辑模块（IIFE，挂载到 window.*）
import './styles/common.css'
import './styles/app.css'
import './lib/icons.js'
import './lib/exercises-data.js'
import './lib/store.js'
import './lib/common.js'
import './lib/device.js'
import './lib/ai-client.js'
import './lib/planner.js'
import './lib/pose-analysis.js'
import './lib/sync.js'

import { initTheme } from './services/theme'

initTheme()

createApp(App).use(router).mount('#app')
