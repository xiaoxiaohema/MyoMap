<script setup>
defineProps({ modelValue: Boolean, large: Boolean })
defineEmits(['update:modelValue'])
</script>

<template>
  <div class="overlay" :class="{ show: modelValue }" @click.self="$emit('update:modelValue', false)">
    <div class="modal" :class="{ 'modal-lg': large }">
      <button class="modal-close" @click="$emit('update:modelValue', false)">✕</button>
      <slot />
    </div>
  </div>
</template>
