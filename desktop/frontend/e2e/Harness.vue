<script setup lang="ts">
import { computed, ref } from 'vue'
import ItemTable from '../src/components/ItemTable.vue'
import CleanupReview from '../src/components/CleanupReview.vue'
import UiButton from '../src/components/ui/UiButton.vue'
import DockerStorage from '../src/components/DockerStorage.vue'
import OverviewView from '../src/views/OverviewView.vue'
import ScanNotices from '../src/components/ScanNotices.vue'
import type { Scan } from '../bindings/swept/internal/cleaner/models'
const overview = new URLSearchParams(location.search).has('overview')
const notices = new URLSearchParams(location.search).has('notices')
const permission = new URLSearchParams(location.search).has('permission')
const failure = new URLSearchParams(location.search).has('failure')
import ManagedHarness from './ManagedHarness.vue'
const managed = new URLSearchParams(location.search).has('managed')
const offline = new URLSearchParams(location.search).has('offline')
async function loadStorage() {
  return {
    files: [
      {
        provider: 'OrbStack',
        kind: 'Data disk · containers and Linux machines',
        path: '/Users/test/data.img.raw',
        bytes: 8192,
        logicalBytes: 1099511627776,
      },
    ],
    warnings: [],
  }
}
import type { Item } from '../bindings/swept/internal/cleaner/models'
import { Risk } from '../bindings/swept/internal/cleaner/models'
const base = {
  category: 'node',
  kind: 'Cache',
  reason: 'Rebuildable dependency cache.',
  bytes: 8192,
  logicalBytes: 7000,
  files: 2,
  modified: '2026-11-01T12:00:00Z',
  directory: true,
  canClean: true,
  blockedLabel: '',
  blockedReason: '',
}
const items: Item[] = [
  {
    ...base,
    id: 'cache',
    name: 'Package cache',
    path: '/Users/test/Library/Caches/npm',
    risk: Risk.Rebuildable,
  },
  {
    ...base,
    id: 'archive',
    category: 'xcode',
    name: 'Release archive',
    path: '/Users/test/Developer/release',
    risk: Risk.Personal,
  },
  {
    ...base,
    id: 'protected',
    name: 'Credentials',
    path: '/Users/test/.ssh',
    risk: Risk.Personal,
    canClean: false,
    blockedLabel: 'Protected folder',
    blockedReason: 'Credentials are protected.',
  },
]
const scan: Scan = {
  path: '',
  started: '2026-11-09T12:00:00Z',
  cancelled: false,
  id: 'fixture',
  items,
  finished: '2026-11-09T12:00:00Z',
  skippedCount: 1,
  skipped: ['/Users/test/OrbStack: Separate mounted filesystem; outside this scan.'],
  warningCount: permission || failure ? 1 : 0,
  warnings: permission ? ['Access denied'] : failure ? ['File disappeared during scan'] : [],
  permissionDenied: permission,
}
const selected = ref(new Set<string>())
const reviewing = ref(false)
const result = ref('')
const selectedItems = computed(() => items.filter((item) => selected.value.has(item.id)))
function toggle(id: string) {
  const next = new Set(selected.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  selected.value = next
}
function confirm(mode: string) {
  result.value = `${mode}: ${selectedItems.value.map((item) => item.name).join(', ')}`
  reviewing.value = false
}
</script>
<template>
  <ManagedHarness v-if="managed" />
  <main v-else-if="offline" style="padding: 30px"><DockerStorage :load="loadStorage" /></main>
  <main v-else-if="notices" style="padding: 30px"><ScanNotices :scan="scan" /></main>
  <main v-else style="padding: 30px">
    <OverviewView
      v-if="overview"
      :status="null"
      :scan="scan"
      :busy="false"
      :selected="selected"
      @toggle="toggle"
      @select="selected = new Set($event)"
      @review="reviewing = true"
    />
    <ItemTable
      v-else
      :items="items"
      :selected="selected"
      home="/Users/test"
      :disabled="false"
      @toggle="toggle"
      @select="selected = new Set($event)"
    /><UiButton v-if="!overview" :disabled="!selected.size" @click="reviewing = true"
      >Review cleanup</UiButton
    >
    <p role="status">{{ result }}</p>
    <CleanupReview
      v-if="reviewing"
      :items="selectedItems"
      :busy="false"
      @close="reviewing = false"
      @confirm="confirm"
    />
  </main>
</template>
