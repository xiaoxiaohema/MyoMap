<script setup>
import { onMounted, onBeforeUnmount } from 'vue'

let mod = null
let onReady = null

onMounted(async () => {
  mod = await import('@/lib/BodyScene.js')
  onReady = () => {
    const ph = document.querySelector('#body-3d-container .glb-placeholder')
    if (ph) ph.remove()
    if (typeof window.setGLBSelection === 'function') {
      const sel = JSON.parse(localStorage.getItem('myomap:selection') || '[]')
      window.setGLBSelection(sel)
    }
  }
  window.addEventListener('glb-ready', onReady)
  mod.initViewer()
})

onBeforeUnmount(() => {
  if (onReady) window.removeEventListener('glb-ready', onReady)
  if (mod) mod.disposeViewer()
})
</script>

<template>
  <div class="bodymap-wrap">
    <div id="body-3d-container">
      <div class="glb-placeholder">
        正在加载 3D 肌肉模型…<br>
        <span style="font-size:11.5px;opacity:.7;">本地模型 body.glb</span>
      </div>
    </div>
    <div class="view-hint">拖动旋转 · 滚轮缩放 · 点击肌肉选择</div>
  </div>
</template>
