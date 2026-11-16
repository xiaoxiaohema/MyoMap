<script setup>
import { computed } from 'vue'
const props = defineProps({
  name: { type: String, required: true },
  size: { type: [Number, String], default: 18 }
})
const svg = computed(() => (window.MyIcon ? window.MyIcon(props.name, Number(props.size)) : ''))
</script>

<template>
  <span class="ic-wrap" v-html="svg" />
</template>

<style>
.ic-wrap { display: inline-flex; align-items: center; justify-content: center; }
</style>
