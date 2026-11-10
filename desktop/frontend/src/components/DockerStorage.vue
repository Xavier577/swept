<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { HardDrive, RefreshCw } from '@lucide/vue'
import type { StorageReport } from '../../bindings/swept/internal/managed/models'
import { bytes } from '../lib/format'
import UiCard from './ui/UiCard.vue'
import UiButton from './ui/UiButton.vue'
import UiBadge from './ui/UiBadge.vue'
const props = defineProps<{ load: () => Promise<StorageReport | undefined>; busy?: boolean }>()
const emit = defineEmits<{ review: [] }>()
const checkedAt = ref('')
const refreshMessage = ref('')
const report = ref<StorageReport | null>(null)
const loading = ref(false)
const total = computed(() => report.value?.files?.reduce((sum, file) => sum + file.bytes, 0) || 0)
async function refresh() {
  loading.value = true
  try {
    const previous = total.value
    const result = await props.load()
    report.value = result || null
    if (result) {
      checkedAt.value = new Date().toLocaleTimeString()
      refreshMessage.value =
        previous === total.value ? 'Storage checked — size unchanged.' : 'Storage estimate updated.'
    }
  } finally {
    loading.value = false
  }
}
onMounted(refresh)
</script>
<template>
  <UiCard class="managed-card">
    <div class="row">
      <div class="row row--start">
        <span class="category-icon"><HardDrive :size="22" /></span>
        <div>
          <h2>Storage on your Mac</h2>
          <p class="muted">
            Detects standard Docker Desktop and OrbStack storage, even when stopped.
          </p>
        </div>
      </div>
      <UiButton :icon="RefreshCw" :loading="loading" @click="refresh">Refresh storage</UiButton>
    </div>
    <template v-if="report">
      <div v-if="report.files?.length" class="list-summary">
        <div>
          <strong>{{ bytes(total) }}</strong
          ><span>allocated to detected storage files</span>
        </div>
        <UiBadge>Storage footprint</UiBadge>
      </div>
      <details v-if="report.files?.length" class="managed-details">
        <summary>Storage files & measurement details ({{ report.files.length }})</summary>
        <div v-for="file in report.files" :key="file.path" class="path-setting">
          <div class="grow">
            <strong>{{ file.provider }} · {{ file.kind }}</strong>
            <p>
              <code class="path">{{ file.path }}</code>
            </p>
          </div>
          <strong>{{ bytes(file.bytes) }}</strong>
        </div>
        <p class="fine-print">
          <span>
            This is allocated disk space, not reclaimable space.
            <span v-if="report.files?.some((file) => file.provider === 'OrbStack')"
              >OrbStack data can also include Linux machines.</span
            >
            Shared APFS data can affect actual disk usage. Custom locations and other providers may
            not be detected here; engine inspection below still uses your configured local Docker
            connection.
          </span>
        </p>
      </details>
      <p class="muted">This is space used by storage files, not the amount you can reclaim.</p>
      <p v-if="!report.files?.length" class="empty-inline">
        No standard storage files found. You can still inspect your configured local engine below.
      </p>
      <details v-if="report.warnings?.length" class="scan-warnings">
        <summary>Some container storage files could not be measured</summary>
        <ul>
          <li v-for="warning in report.warnings" :key="warning">{{ warning }}</li>
        </ul>
      </details>
      <div class="tool-result row">
        <p class="muted" role="status">{{ refreshMessage }} Checked at {{ checkedAt }}.</p>
        <UiButton variant="primary" :disabled="busy" @click="emit('review')"
          >Choose cleanup items</UiButton
        >
      </div>
    </template>
    <p v-else class="empty-inline">
      {{ loading ? 'Measuring storage files…' : 'Storage could not be measured. Try refreshing.' }}
    </p>
  </UiCard>
</template>
