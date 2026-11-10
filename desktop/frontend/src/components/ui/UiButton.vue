<script setup lang="ts">
import type { Component } from 'vue'
import { LoaderCircle } from '@lucide/vue'
withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
    icon?: Component
    loading?: boolean
    disabled?: boolean
    compact?: boolean
    type?: 'button' | 'submit'
  }>(),
  { variant: 'secondary', type: 'button' },
)
</script>
<template>
  <button
    :type="type"
    class="button"
    :class="[`button--${variant}`, { 'button--compact': compact }]"
    :disabled="disabled || loading"
    :aria-busy="loading || undefined"
  >
    <LoaderCircle v-if="loading" class="spin" :size="16" /><component
      :is="icon"
      v-else-if="icon"
      :size="16"
    /><slot />
  </button>
</template>
