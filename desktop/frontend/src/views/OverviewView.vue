<script setup lang="ts">
import { computed } from 'vue'
import {
  ArrowUpRight,
  Sparkles,
  ScanLine,
  ArrowRight,
  ShieldCheck,
  FolderSearch,
} from '@lucide/vue'
import type { Scan, Status } from '../../bindings/swept/internal/cleaner/models'
import { bytes, date } from '../lib/format'
import { categories } from '../lib/categories'
import UiButton from '../components/ui/UiButton.vue'
import UiCard from '../components/ui/UiCard.vue'
import ItemTable from '../components/ItemTable.vue'
import UiBadge from '../components/ui/UiBadge.vue'
const props = defineProps<{
  status: Status | null
  scan: Scan | null
  busy: boolean
  selected: Set<string>
}>()
defineEmits<{
  scan: []
  category: [id: string]
  explorer: []
  settings: []
  toggle: [id: string]
  select: [ids: string[]]
  reveal: [path: string]
  browse: [path: string]
  review: []
}>()
const items = computed(() => props.scan?.items || [])
const total = computed(() =>
  items.value.filter((item) => item.canClean).reduce((sum, item) => sum + item.bytes, 0),
)
const rebuildable = computed(() =>
  items.value
    .filter((item) => item.canClean && item.risk === 'rebuildable')
    .reduce((sum, item) => sum + item.bytes, 0),
)
const disk = computed(() => props.status?.disk)
const usedPercentage = computed(() =>
  disk.value?.total ? (1 - disk.value.available / disk.value.total) * 100 : 0,
)
function size(id: string) {
  return items.value
    .filter((item) => item.category === id)
    .reduce((sum, item) => sum + item.bytes, 0)
}
</script>
<template>
  <div class="page-heading">
    <div>
      <p class="eyebrow">YOUR WORKSPACE, LIGHTER</p>
      <h1>A little room to build.</h1>
      <p>Clear the leftovers. Keep what matters.</p>
    </div>
    <UiButton
      variant="primary"
      :icon="ScanLine"
      :disabled="busy || !status"
      @click="$emit('scan')"
      >{{ scan ? 'Scan again' : 'Scan my Mac' }}</UiButton
    >
  </div>
  <UiCard class="storage-card"
    ><div class="disk-ring" :style="{ '--used': `${usedPercentage}%` }">
      <div>
        <span>{{ disk ? Math.round(usedPercentage) : '—' }}<small v-if="disk">%</small></span
        ><small>used</small>
      </div>
    </div>
    <div class="storage-main">
      <div class="row row--start">
        <h2>Your Mac</h2>
        <UiBadge>Home volume</UiBadge>
      </div>
      <p>
        <strong>{{ disk ? bytes(disk.available) : '—' }}</strong> available
        <span v-if="disk">of {{ bytes(disk.total) }}</span>
      </p>
      <div class="storage-track"><span :style="{ width: `${usedPercentage}%` }" /></div>
      <div class="row muted">
        <small>{{ disk ? bytes(disk.total - disk.available) : '—' }} used</small
        ><small>Live filesystem capacity</small>
      </div>
    </div>
    <div class="storage-tip">
      <Sparkles :size="20" /><strong>More space.<br />Less friction.</strong>
      <p>Your next build deserves a little breathing room.</p>
    </div></UiCard
  >
  <div v-if="scan" class="stat-grid">
    <UiCard
      ><p class="eyebrow">READY TO REVIEW</p>
      <strong class="metric">{{ bytes(total) }}</strong>
      <p>{{ items.filter((item) => item.canClean).length }} cleanup candidates</p></UiCard
    ><UiCard
      ><p class="eyebrow">REBUILDABLE CONTENT</p>
      <strong class="metric metric--blue">{{ bytes(rebuildable) }}</strong>
      <p>Caches and generated build files</p></UiCard
    ><UiCard
      ><p class="eyebrow">LAST SCAN</p>
      <strong class="metric metric--small">{{ date(scan.finished) }}</strong>
      <p>
        {{
          scan.warningCount
            ? `${scan.warningCount} locations need attention`
            : 'Accessible locations checked'
        }}
      </p></UiCard
    >
  </div>
  <UiCard v-else class="welcome-card"
    ><div class="welcome-icon"><FolderSearch :size="28" /></div>
    <div class="grow">
      <h2>
        {{
          status?.history?.length ? 'Ready for your next sweep.' : 'Your first sweep starts here.'
        }}
      </h2>
      <p>
        Find developer caches, forgotten build files, and bulky folders.<br />You choose what goes.
        A scan never changes your files.
      </p>
      <div class="steps">
        <span><b>1</b> Scan</span><ArrowRight :size="13" /><span><b>2</b> Review</span
        ><ArrowRight :size="13" /><span><b>3</b> Reclaim</span>
      </div>
    </div>
    <UiButton variant="ghost" @click="$emit('settings')"
      >Choose scan folders <ArrowUpRight :size="15" /></UiButton
  ></UiCard>
  <section v-if="scan" aria-label="Build your sweep" class="sweep-workspace">
    <div class="section-heading">
      <div>
        <h2>Build your sweep</h2>
        <p>Select across categories, then review everything together.</p>
      </div>
      <div class="row">
        <UiButton
          :icon="Sparkles"
          :disabled="busy || !items.some((item) => item.canClean && item.risk === 'rebuildable')"
          @click="
            $emit('select', [
              ...new Set([
                ...selected,
                ...items
                  .filter((item) => item.canClean && item.risk === 'rebuildable')
                  .map((item) => item.id),
              ]),
            ])
          "
          >Select rebuildable</UiButton
        >
        <UiButton variant="primary" :disabled="busy || !selected.size" @click="$emit('review')"
          >Review {{ selected.size || '' }} selected</UiButton
        >
      </div>
    </div>
    <UiCard :padded="false"
      ><ItemTable
        :items="items"
        :selected="selected"
        :home="status?.home || ''"
        :disabled="busy"
        categories
        @toggle="$emit('toggle', $event)"
        @select="$emit('select', $event)"
        @reveal="$emit('reveal', $event)"
        @navigate="$emit('browse', $event)"
    /></UiCard>
    <p class="fine-print">
      Docker resources and tool-managed maintenance are reviewed in their own category.
    </p>
  </section>
  <div class="section-heading">
    <div>
      <h2>Where space adds up</h2>
      <p>
        {{
          scan
            ? 'Explore a category for more detail and tool-managed cleanup.'
            : 'Eight familiar places. One clear view.'
        }}
      </p>
    </div>
    <UiButton variant="ghost" :icon="ArrowUpRight" @click="$emit('explorer')"
      >Explore files</UiButton
    >
  </div>
  <div class="category-grid">
    <button
      v-for="category in categories"
      :key="category.id"
      class="category-card"
      @click="$emit('category', category.id)"
    >
      <span class="category-icon" :style="{ '--category-color': category.color }"
        ><component :is="category.icon" :size="22" /></span
      ><span class="grow"
        ><strong>{{ category.name }}</strong
        ><small>{{ category.description }}</small></span
      ><span class="category-size"
        >{{ category.id === 'docker' ? 'Inspect' : scan ? bytes(size(category.id)) : '—'
        }}<ArrowUpRight :size="15"
      /></span>
    </button>
  </div>
  <p class="page-footnote">
    <ShieldCheck :size="15" /> On your Mac. Under your control. Sizes are estimates; shared files
    and APFS snapshots can affect reclaimed space.
  </p>
</template>
