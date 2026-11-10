<script setup lang="ts">
defineProps<{ label: string; hint?: string }>()
</script>
<template>
  <label class="field"
    ><span class="field__label">{{ label }}</span
    ><slot /><small v-if="hint">{{ hint }}</small></label
  >
</template>
