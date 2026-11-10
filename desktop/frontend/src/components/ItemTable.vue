<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Folder, File, Search, ExternalLink, ChevronRight, ChevronLeft, Copy } from '@lucide/vue'
import type { Item } from '../../bindings/swept/internal/cleaner/models'
import { bytes, date, shortPath } from '../lib/format'
import { categories as categoryOptions, riskLabel } from '../lib/categories'
import ItemStatusBadge from './ItemStatusBadge.vue'
import UiButton from './ui/UiButton.vue'
import UiField from './ui/UiField.vue'
const props = defineProps<{
  items: Item[]
  selected: Set<string>
  home: string
  disabled: boolean
  explorer?: boolean
  categories?: boolean
}>()
const emit = defineEmits<{
  toggle: [id: string]
  select: [ids: string[]]
  reveal: [path: string]
  navigate: [path: string]
}>()
const query = ref('')
const category = ref('all')
const showHidden = ref(false)
const copyStatus = ref('')
async function copyPath(path: string) {
  try {
    await navigator.clipboard.writeText(path)
    copyStatus.value = `Copied ${path}`
  } catch {
    copyStatus.value = 'Could not copy the path. Select the displayed path to copy it.'
  }
}
const totalBytes = computed(() => props.items.reduce((sum, item) => sum + item.bytes, 0))
const risk = ref('all')
const sort = ref('size')
const page = ref(0)
const filtered = computed(() =>
  props.items
    .filter(
      (item) =>
        (category.value === 'all' || item.category === category.value) &&
        (!props.explorer || showHidden.value || !item.name.startsWith('.')) &&
        (risk.value === 'all' || item.risk === risk.value) &&
        `${item.name} ${item.path}`.toLowerCase().includes(query.value.toLowerCase()),
    )
    .sort((a, b) =>
      sort.value === 'name'
        ? a.name.localeCompare(b.name)
        : sort.value === 'date'
          ? Date.parse(a.modified) - Date.parse(b.modified)
          : b.bytes - a.bytes,
    ),
)
const visible = computed(() => filtered.value.slice(page.value * 80, (page.value + 1) * 80))
const selectable = computed(() => filtered.value.filter((item) => item.canClean))
const allSelected = computed(
  () =>
    selectable.value.length > 0 && selectable.value.every((item) => props.selected.has(item.id)),
)
watch([query, risk, sort, category, showHidden, () => props.items], () => {
  page.value = 0
})
function selectVisible() {
  const ids = new Set(props.selected)
  selectable.value.forEach((item) => (allSelected.value ? ids.delete(item.id) : ids.add(item.id)))
  emit('select', [...ids])
}
</script>
<template>
  <div class="item-browser" :class="{ 'item-browser--explorer': explorer }">
    <div class="filter-bar">
      <div class="search">
        <Search :size="16" /><input
          v-model="query"
          aria-label="Search items"
          placeholder="Find a file, folder, or project…"
        />
      </div>
      <UiField v-if="categories" label="Category"
        ><select v-model="category">
          <option value="all">All categories</option>
          <option
            v-for="entry in categoryOptions.filter((entry) => entry.id !== 'docker')"
            :key="entry.id"
            :value="entry.id"
          >
            {{ entry.name }}
          </option>
        </select></UiField
      >
      <UiField v-if="!explorer" label="Show"
        ><select v-model="risk">
          <option value="all">All items</option>
          <option value="rebuildable">Rebuildable</option>
          <option value="review">Review first</option>
          <option value="personal">{{ riskLabel.personal }}</option>
        </select></UiField
      ><UiField label="Sort"
        ><select v-model="sort">
          <option value="size">Largest first</option>
          <option value="name">Name</option>
          <option value="date">Oldest modified</option>
        </select></UiField
      >
    </div>
    <div v-if="explorer" class="explorer-options">
      <label class="check-label"
        ><input v-model="showHidden" type="checkbox" /> Show hidden files</label
      ><span>Folders include their accessible contents · sizes on disk</span>
    </div>
    <p v-if="copyStatus" class="copy-status" role="status">{{ copyStatus }}</p>
    <div class="table-head">
      <input
        type="checkbox"
        aria-label="Select all filtered items"
        :checked="allSelected"
        :indeterminate="!allSelected && selectable.some((item) => selected.has(item.id))"
        :disabled="disabled || !selectable.length"
        @change="selectVisible"
      /><span class="grow"
        >{{ filtered.length }} {{ filtered.length === 1 ? 'item' : 'items' }}</span
      ><span>Size on disk</span>
    </div>
    <div v-if="!filtered.length" class="empty">
      <Search :size="30" />
      <h3>{{ items.length ? 'No matching items' : 'Nothing found here' }}</h3>
      <p>
        {{
          items.length
            ? 'Try another search or filter.'
            : 'No items were found in the accessible locations checked by this scan.'
        }}
      </p>
    </div>
    <div class="file-list" tabindex="0" aria-label="Scanned items">
      <article
        v-for="item in visible"
        :key="item.id"
        class="file-row"
        :class="{ 'file-row--selected': selected.has(item.id) }"
      >
        <input
          type="checkbox"
          :aria-label="`Select ${item.name}`"
          :checked="selected.has(item.id)"
          :disabled="disabled || !item.canClean"
          :title="item.blockedReason"
          @change="$emit('toggle', item.id)"
        />
        <div class="file-icon">
          <Folder v-if="item.directory" :size="21" /><File v-else :size="21" />
        </div>
        <div class="file-info">
          <div class="row row--start">
            <button
              v-if="item.directory"
              class="text-button file-name"
              :disabled="disabled"
              @click="$emit('navigate', item.path)"
            >
              {{ item.name }}<ChevronRight :size="14" /></button
            ><strong v-else class="file-name">{{ item.name }}</strong
            ><ItemStatusBadge :item="item" />
          </div>
          <small v-if="categories">{{
            categoryOptions.find((entry) => entry.id === item.category)?.name
          }}</small>
          <p v-if="!explorer" class="path" :title="item.path">{{ shortPath(item.path, home) }}</p>
          <p v-if="!explorer || !item.canClean" class="item-reason">
            {{ item.blockedReason || item.reason }}
          </p>
          <small
            >Modified {{ date(item.modified) }} · {{ item.files.toLocaleString() }}
            {{ item.files === 1 ? 'file' : 'files' }}</small
          >
        </div>
        <div class="item-size">
          <strong>{{ bytes(item.bytes) }}</strong
          ><small>{{ item.kind }}</small>
          <span
            v-if="explorer"
            class="size-bar"
            :title="`${totalBytes ? Math.round((item.bytes / totalBytes) * 100) : 0}% of this folder`"
            ><span :style="{ width: `${totalBytes ? (item.bytes / totalBytes) * 100 : 0}%` }"
          /></span>
        </div>
        <UiButton
          v-if="explorer"
          variant="ghost"
          :icon="Copy"
          :aria-label="`Copy path for ${item.name}`"
          title="Copy path"
          @click="copyPath(item.path)"
        />
        <UiButton
          variant="ghost"
          :icon="ExternalLink"
          :aria-label="`Show ${item.name} in Finder`"
          title="Show in Finder"
          @click="$emit('reveal', item.path)"
        />
      </article>
    </div>
    <div v-if="filtered.length > 80" class="pagination">
      <UiButton compact :icon="ChevronLeft" :disabled="page === 0" @click="page--"
        >Previous</UiButton
      ><span>{{ page + 1 }} / {{ Math.ceil(filtered.length / 80) }}</span
      ><UiButton
        compact
        :icon="ChevronRight"
        :disabled="(page + 1) * 80 >= filtered.length"
        @click="page++"
        >Next</UiButton
      >
    </div>
  </div>
</template>
