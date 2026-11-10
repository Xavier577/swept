<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  LayoutDashboard,
  FolderSearch,
  History,
  Settings2,
  ArrowLeft,
  ArrowUp,
  ScanLine,
  ShieldCheck,
  X,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
} from '@lucide/vue'
import * as Service from '../bindings/swept/service'
import type { Result } from '../bindings/swept/internal/managed/models'
import { useSwept } from './composables/useSwept'
import { bytes, date } from './lib/format'
import { categories } from './lib/categories'
import UiButton from './components/ui/UiButton.vue'
import UiCard from './components/ui/UiCard.vue'
import UiBadge from './components/ui/UiBadge.vue'
import ScanNotices from './components/ScanNotices.vue'
import ExplorerToolbar from './components/ExplorerToolbar.vue'
import ScanProgress from './components/ScanProgress.vue'
import ItemTable from './components/ItemTable.vue'
import CleanupReview from './components/CleanupReview.vue'
import OverviewView from './views/OverviewView.vue'
import SettingsView from './views/SettingsView.vue'
import HistoryView from './views/HistoryView.vue'
import ManagedView from './views/ManagedView.vue'
import DockerStorage from './components/DockerStorage.vue'

const {
  status,
  scan,
  explorer,
  explorerPath,
  selected: scanSelected,
  explorerSelected,
  error,
  notice,
  busy,
  progress,
  cancelling,
  lastCleanup,
  startScan,
  cancelScan,
  clean,
  saveSettings,
  setTheme,
  savingTheme,
  perform,
  refreshStatus,
} = useSwept()
const view = ref('overview')
const selected = computed({
  get: () => (view.value === 'explorer' ? explorerSelected.value : scanSelected.value),
  set: (value) => {
    if (view.value === 'explorer') explorerSelected.value = value
    else scanSelected.value = value
  },
})
function toggle(id: string) {
  const next = new Set(selected.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  selected.value = next
}
const folderHistory = ref<string[]>([])
const folderIndex = ref(-1)
const managedView = ref<InstanceType<typeof ManagedView> | null>(null)
const storageRevision = ref(0)
const managedResults = ref<Record<string, Result | null>>({})
async function reviewDocker() {
  await managedView.value?.inspect()
  document.getElementById('managed-tools')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
const reviewing = ref(false)
const home = computed(() => status.value?.home || '')
const category = computed(() => categories.find((category) => category.id === view.value))
const source = computed(() => (view.value === 'explorer' ? explorer.value : scan.value))
const items = computed(() =>
  (source.value?.items || []).filter(
    (item) =>
      view.value === 'explorer' || view.value === 'overview' || item.category === view.value,
  ),
)
const selectedItems = computed(() =>
  (source.value?.items || []).filter((item) => selected.value.has(item.id)),
)
const cleanupHasErrors = computed(() => lastCleanup.value?.items?.some((item) => item.error))
const selectedBytes = computed(() => selectedItems.value.reduce((sum, item) => sum + item.bytes, 0))
function showResults() {
  navigate('history')
  lastCleanup.value = null
}
function navigate(target: string) {
  error.value = ''
  notice.value = ''
  view.value = target
  if (target === 'explorer' && !explorer.value && home.value && !busy.value)
    void browse(explorerPath.value || home.value)
}
async function browse(path: string, historyIndex?: number) {
  if (busy.value) return
  error.value = ''
  notice.value = ''
  view.value = 'explorer'
  const result = await startScan(path, false)
  if (!result) return
  if (historyIndex !== undefined) folderIndex.value = historyIndex
  else if (folderHistory.value[folderIndex.value] !== result.path) {
    folderHistory.value = [...folderHistory.value.slice(0, folderIndex.value + 1), result.path]
    folderIndex.value = folderHistory.value.length - 1
  }
}
function browseHistory(offset: number) {
  const index = folderIndex.value + offset
  const path = folderHistory.value[index]
  if (path) void browse(path, index)
}
async function chooseAndBrowse() {
  const path = await perform(Service.ChooseFolder)
  if (path) await browse(path)
}
async function confirm(mode: 'permanent' | 'trash') {
  if (source.value && (await clean(source.value, [...selected.value], mode))) {
    reviewing.value = false
    await startScan(view.value === 'explorer' ? explorerPath.value || home.value : '')
  }
}
async function inspectTool(tool: string) {
  busy.value = 'tool'
  try {
    return await perform(() => Service.InspectTool(tool))
  } finally {
    busy.value = null
  }
}
async function runTool(reportID: string, actionIDs: string[], confirmation: string) {
  busy.value = 'tool'
  try {
    const output = await perform(() => Service.RunTool(reportID, actionIDs, confirmation))
    if (output === undefined) return
    storageRevision.value++
    scan.value = null
    explorer.value = null
    scanSelected.value = new Set()
    explorerSelected.value = new Set()
    await perform(refreshStatus)
    return output
  } finally {
    busy.value = null
  }
}
function selectRebuildable() {
  selected.value = new Set([
    ...selected.value,
    ...items.value
      .filter((item) => item.canClean && item.risk === 'rebuildable')
      .map((item) => item.id),
  ])
}
</script>
<template>
  <div class="app-shell">
    <aside class="sidebar">
      <div class="brand">
        <img src="/swept.svg" alt="" />
        <div>
          <strong>Swept<span>✦</span></strong
          ><small>Make room for what’s next.</small>
        </div>
      </div>
      <nav aria-label="Main navigation">
        <button
          v-for="item in [
            { id: 'overview', name: 'Overview', icon: LayoutDashboard },
            { id: 'explorer', name: 'Space explorer', icon: FolderSearch },
          ]"
          :key="item.id"
          :class="{ active: view === item.id }"
          :aria-current="view === item.id ? 'page' : undefined"
          @click="navigate(item.id)"
        >
          <component :is="item.icon" :size="18" />{{ item.name }}
        </button>
        <p class="nav-label">CLEAN UP</p>
        <button
          v-for="item in categories"
          :key="item.id"
          :class="{ active: view === item.id }"
          :aria-current="view === item.id ? 'page' : undefined"
          @click="navigate(item.id)"
        >
          <component :is="item.icon" :size="17" :style="{ color: item.color }" /><span>{{
            item.name
          }}</span
          ><span class="nav-dot" v-if="scan?.items?.some((entry) => entry.category === item.id)" />
        </button>
      </nav>
      <div class="sidebar-bottom">
        <button :class="{ active: view === 'history' }" @click="navigate('history')">
          <History :size="17" />Your sweeps</button
        ><button :class="{ active: view === 'settings' }" @click="navigate('settings')">
          <Settings2 :size="17" />Preferences
        </button>
        <div class="local-status"><span /><small>Local. Private. Yours.</small></div>
      </div>
    </aside>
    <div class="workspace">
      <header class="titlebar" style="--wails-draggable: drag">
        <span>{{
          view === 'overview'
            ? 'Workspace overview'
            : view === 'explorer'
              ? 'Space explorer'
              : view === 'history'
                ? 'Your sweeps'
                : view === 'settings'
                  ? 'Preferences'
                  : category?.name
        }}</span
        ><span><ShieldCheck :size="13" /> On-device cleanup</span>
      </header>
      <main class="main-content">
        <div v-if="error" class="notice notice--error" role="alert">
          <AlertTriangle :size="19" />
          <div class="grow">
            <strong>Something needs attention</strong>
            <p>{{ error }}</p>
          </div>
          <UiButton variant="ghost" :icon="X" aria-label="Dismiss error" @click="error = ''" />
        </div>
        <div v-if="notice" class="notice" role="status">
          <CheckCircle2 :size="18" />
          <p class="grow">{{ notice }}</p>
          <UiButton variant="ghost" :icon="X" aria-label="Dismiss message" @click="notice = ''" />
        </div>
        <div
          v-if="lastCleanup"
          class="notice"
          :class="{ 'notice--warning': cleanupHasErrors }"
          role="status"
        >
          <AlertTriangle v-if="cleanupHasErrors" :size="20" />
          <CheckCircle2 v-else :size="20" />
          <div class="grow">
            <strong
              >{{ bytes(lastCleanup.removedBytes) }}
              {{
                lastCleanup.mode === 'trash' ? 'moved to Trash' : 'removed from selected locations'
              }}</strong
            >
            <p>
              {{
                cleanupHasErrors
                  ? 'Some items need attention. Review the individual results in Your sweeps.'
                  : 'Your sweep is recorded. Folder sizes refresh after cleanup.'
              }}
              {{ lastCleanup.warning }}
            </p>
          </div>
          <UiButton compact @click="showResults">View results</UiButton
          ><UiButton
            variant="ghost"
            :icon="X"
            aria-label="Dismiss cleanup result"
            @click="lastCleanup = null"
          />
        </div>
        <ScanProgress
          v-if="busy === 'scan' || busy === 'browse'"
          :progress="progress"
          :cancelling="cancelling"
          @cancel="cancelScan"
        /><OverviewView
          v-if="view === 'overview'"
          :status="status"
          :scan="scan"
          :selected="scanSelected"
          @toggle="toggle"
          @select="scanSelected = new Set($event)"
          @reveal="perform(() => Service.Reveal($event))"
          @browse="browse"
          @review="reviewing = true"
          :busy="!!busy"
          @scan="startScan()"
          @category="navigate"
          @explorer="navigate('explorer')"
          @settings="navigate('settings')"
        /><SettingsView
          v-else-if="view === 'settings' && status"
          :status="status"
          :busy="!!busy"
          :choose-folder="() => perform(Service.ChooseFolder)"
          :saving-theme="savingTheme"
          @theme="setTheme"
          @save="saveSettings"
          @permissions="perform(Service.OpenPermissions)"
        /><HistoryView v-else-if="view === 'history'" :history="status?.history || []" /><template
          v-else-if="category || view === 'explorer'"
          ><div class="page-heading" :class="{ 'page-heading--explorer': view === 'explorer' }">
            <div>
              <button v-if="view !== 'explorer'" class="back-link" @click="navigate('overview')">
                <ArrowLeft :size="14" /> Overview
              </button>
              <h1>{{ category?.name || 'Space explorer' }}</h1>
              <p>
                {{
                  category?.description || 'Follow the big folders. Find what you no longer need.'
                }}
              </p>
            </div>
            <div class="row">
              <UiButton v-if="view === 'explorer'" :disabled="!!busy" @click="chooseAndBrowse"
                >Choose folder</UiButton
              ><UiButton
                v-if="view !== 'docker'"
                variant="primary"
                :icon="ScanLine"
                :disabled="!!busy || !status"
                @click="startScan(view === 'explorer' ? explorerPath || home : '')"
                >{{
                  view === 'explorer' ? 'Refresh sizes' : source ? 'Scan again' : 'Start scan'
                }}</UiButton
              >
            </div>
          </div>
          <ExplorerToolbar
            v-if="view === 'explorer'"
            :home="home"
            :path="explorerPath || home"
            :busy="!!busy"
            :can-back="folderIndex > 0"
            :can-forward="folderIndex < folderHistory.length - 1"
            @navigate="browse"
            @back="browseHistory(-1)"
            @forward="browseHistory(1)" />
          <template v-if="view !== 'docker'"
            ><UiCard v-if="source" class="list-summary"
              ><div>
                <strong>{{ bytes(items.reduce((sum, item) => sum + item.bytes, 0)) }}</strong
                ><span
                  >{{ items.length }} {{ items.length === 1 ? 'item' : 'items' }} measured</span
                >
              </div>
              <p v-if="view === 'explorer'" class="measurement-time">
                Measured {{ date(source.finished)
                }}<small>Refresh sizes to check for changes.</small>
              </p>
              <UiButton
                v-if="view !== 'explorer'"
                :icon="Sparkles"
                compact
                :disabled="
                  !!busy || !items.some((item) => item.canClean && item.risk === 'rebuildable')
                "
                @click="selectRebuildable"
                >Select rebuildable items</UiButton
              ><UiBadge v-else tone="review">Select only what you no longer need</UiBadge></UiCard
            ><UiCard v-else class="empty"
              ><FolderSearch :size="36" />
              <h2>{{ busy === 'scan' ? 'Taking a closer look…' : 'Let’s see what’s here.' }}</h2>
              <p>
                {{
                  view === 'explorer'
                    ? explorerPath
                      ? 'Scan this folder again for an updated view, or choose another folder.'
                      : 'Choose a folder, or scan your home folder to see its largest contents.'
                    : 'Start a scan to see real files and their sizes. Nothing is selected automatically.'
                }}
              </p></UiCard
            ><UiCard v-if="source" :padded="false"
              ><ItemTable
                :key="view + (view === 'explorer' ? source.path : source.id)"
                :items="items"
                :selected="selected"
                :home="home"
                :disabled="!!busy"
                :explorer="view === 'explorer'"
                @toggle="toggle"
                @select="selected = new Set($event)"
                @reveal="perform(() => Service.Reveal($event))"
                @navigate="browse" /></UiCard></template
          ><DockerStorage
            v-if="view === 'docker'"
            :key="storageRevision"
            :busy="!!busy"
            @review="reviewDocker"
            :load="() => perform(Service.DockerStorage)" /><ManagedView
            ref="managedView"
            v-model:result="managedResults[view]"
            id="managed-tools"
            v-if="view === 'docker' || view === 'homebrew' || view === 'xcode' || view === 'python'"
            :key="view"
            :tool="view === 'xcode' ? 'simulators' : view === 'python' ? 'conda' : view"
            :title="
              view === 'xcode'
                ? 'Simulator maintenance'
                : view === 'python'
                  ? 'Conda package cache'
                  : view === 'homebrew'
                    ? 'Old versions & downloads'
                    : 'Docker storage'
            "
            :busy="!!busy"
            :inspect="inspectTool"
            :execute="runTool"
        /></template>
        <ScanNotices v-if="source && (view === 'overview' || view === 'explorer')" :scan="source" />
      </main>
      <footer
        v-if="selectedItems.length && (view === 'overview' || view === 'explorer' || category)"
        class="selection-dock"
      >
        <div>
          <strong
            >{{ selectedItems.length }}
            {{ selectedItems.length === 1 ? 'item' : 'items' }} selected</strong
          ><span>{{ bytes(selectedBytes) }} estimated on disk</span>
        </div>
        <UiButton variant="ghost" :disabled="!!busy" @click="selected = new Set()"
          >Clear selection</UiButton
        ><UiButton variant="primary" :disabled="!!busy" @click="reviewing = true"
          >Review cleanup <ArrowUp :size="15" class="rotate-right"
        /></UiButton>
      </footer>
    </div>
    <CleanupReview
      v-if="reviewing"
      :items="selectedItems"
      :busy="busy === 'cleanup'"
      @close="reviewing = false"
      @confirm="confirm"
    />
  </div>
</template>
