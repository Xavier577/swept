<script setup lang="ts">
import type { Action } from '../../bindings/swept/internal/managed/models'
import UiBadge from './ui/UiBadge.vue'
import { riskLabel } from '../lib/categories'
defineProps<{ actions: Action[]; selected?: Set<string>; disabled?: boolean }>()
defineEmits<{ toggle: [id: string] }>()
</script>
<template>
  <div class="managed-resource-list">
    <article
      v-for="action in actions"
      :key="action.id"
      :class="{ 'is-selected': selected?.has(action.id) }"
    >
      <div class="row">
        <label v-if="selected" class="check-label grow"
          ><input
            type="checkbox"
            :aria-label="`Select ${action.name}`"
            :checked="selected.has(action.id)"
            :disabled="disabled"
            @change="$emit('toggle', action.id)"
          /><strong>{{ action.name }}</strong></label
        >
        <strong v-else class="grow">{{ action.name }}</strong>
        <UiBadge :tone="action.risk">{{ riskLabel[action.risk] || 'Review first' }}</UiBadge>
      </div>
      <p>{{ action.description }}</p>
    </article>
  </div>
</template>
