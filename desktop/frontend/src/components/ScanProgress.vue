<script setup lang="ts">
import type { Progress } from '../../bindings/swept/internal/cleaner/models'
import { LoaderCircle } from '@lucide/vue'
import UiButton from './ui/UiButton.vue'
defineProps<{ progress: Progress | null; cancelling: boolean }>()
defineEmits<{ cancel: [] }>()
</script>
<template>
  <div class="scan-progress" role="status" aria-live="polite">
    <LoaderCircle class="spin" :size="20" />
    <div class="grow">
      <strong>{{
        cancelling ? 'Stopping scan…' : progress?.phase || 'Starting your scan…'
      }}</strong>
      <p class="truncate">{{ progress?.path || 'Finding the space you can take back.' }}</p>
      <small v-if="progress"
        >{{ progress.visited.toLocaleString() }} entries checked · {{ progress.items }} items
        found</small
      >
    </div>
    <UiButton compact :disabled="cancelling" @click="$emit('cancel')">Cancel scan</UiButton>
  </div>
</template>
