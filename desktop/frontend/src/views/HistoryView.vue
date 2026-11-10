<script setup lang="ts">
import { History, CheckCircle2, AlertCircle } from '@lucide/vue'
import type { Cleanup } from '../../bindings/swept/internal/cleaner/models'
import { bytes, date } from '../lib/format'
import UiCard from '../components/ui/UiCard.vue'
import UiBadge from '../components/ui/UiBadge.vue'
defineProps<{ history: Cleanup[] }>()
</script>
<template>
  <div class="page-heading">
    <div>
      <p class="eyebrow">A CLEAR RECORD</p>
      <h1>Your sweeps</h1>
      <p>What changed, what stayed, and when.</p>
    </div>
  </div>
  <UiCard v-if="!history.length" class="empty"
    ><History :size="36" />
    <h2>A fresh start.</h2>
    <p>
      Your file cleanup results will appear here. Tool-managed operations show their result in the
      tool panel.
    </p></UiCard
  >
  <div v-else class="history-list">
    <UiCard v-for="entry in history" :key="entry.id"
      ><div class="row">
        <div class="row row--start">
          <CheckCircle2
            v-if="!entry.items?.some((item) => item.error)"
            :size="22"
            class="success-text"
          /><AlertCircle v-else :size="22" class="warning-text" />
          <div>
            <h2>{{ entry.mode === 'trash' ? 'Moved to Trash' : 'Permanent cleanup' }}</h2>
            <p class="muted">{{ date(entry.at) }}</p>
          </div>
        </div>
        <strong class="metric metric--small">{{ bytes(entry.removedBytes) }}</strong>
      </div>
      <p>
        {{ entry.items?.filter((item) => !item.error).length }}
        {{ entry.items?.filter((item) => !item.error).length === 1 ? 'item' : 'items' }}
        completed<template v-if="entry.items?.some((item) => item.error)">
          · {{ entry.items.filter((item) => item.error).length }} need attention</template
        >
      </p>
      <p class="muted">
        {{
          entry.mode === 'trash'
            ? 'Empty Trash in Finder to release disk space.'
            : `Observed free-space change: ${entry.availableChange < 0 ? '−' : '+'}${bytes(Math.abs(entry.availableChange))}. Other disk activity may affect this number.`
        }}
      </p>
      <p v-if="entry.warning" class="warning-text">{{ entry.warning }}</p>
      <details>
        <summary>View individual results</summary>
        <article v-for="item in entry.items" :key="item.path" class="history-item">
          <div class="row">
            <code>{{ item.path }}</code
            ><UiBadge :tone="item.error ? 'personal' : 'rebuildable'">{{
              item.error ? 'Failed / partial' : 'Completed'
            }}</UiBadge>
          </div>
          <p v-if="item.error">{{ item.error }}</p>
        </article>
      </details></UiCard
    >
  </div>
</template>
