<script setup lang="ts">
import type { Item } from '../../bindings/swept/internal/cleaner/models'
import { riskLabel } from '../lib/categories'
import UiBadge from './ui/UiBadge.vue'
defineProps<{ item: Item }>()
</script>
<template>
  <UiBadge
    :tone="!item.canClean ? 'neutral' : item.risk === 'personal' ? 'review' : item.risk"
    :title="item.blockedReason || item.reason"
    >{{ item.canClean ? riskLabel[item.risk] : item.blockedLabel }}</UiBadge
  >
</template>
