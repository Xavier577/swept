<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { RefreshCw, Terminal, AlertTriangle } from '@lucide/vue'
import type { Action, Report, Result } from '../../bindings/swept/internal/managed/models'
import UiButton from '../components/ui/UiButton.vue'
import UiCard from '../components/ui/UiCard.vue'
import UiBadge from '../components/ui/UiBadge.vue'
import UiDialog from '../components/ui/UiDialog.vue'
import UiField from '../components/ui/UiField.vue'
import ManagedActionList from '../components/ManagedActionList.vue'
defineOptions({ inheritAttrs: false })
const props = defineProps<{
  tool: string
  title: string
  busy: boolean
  inspect: (tool: string) => Promise<Report | undefined>
  execute: (
    reportID: string,
    actionIDs: string[],
    confirmation: string,
  ) => Promise<Result | undefined>
}>()
const report = ref<Report | null>(null)
const resultPanel = ref<HTMLDivElement | null>(null)
const query = ref('')
const selected = ref(new Set<string>())
const reviewing = ref(false)
const refreshPrompt = ref(false)
const inspecting = ref(false)
const confirmation = ref('')
const result = defineModel<Result | null>('result', { default: null })
const actions = computed(() =>
  (report.value?.actions || []).filter((action) =>
    `${action.name} ${action.description}`.toLowerCase().includes(query.value.toLowerCase()),
  ),
)
const selectedActions = computed(() =>
  (report.value?.actions || []).filter((action) => selected.value.has(action.id)),
)
const hiddenSelected = computed(
  () => selectedActions.value.filter((action) => !actions.value.includes(action)).length,
)
const allMatchingSelected = computed(
  () => actions.value.length > 0 && actions.value.every((action) => selected.value.has(action.id)),
)
const removed = computed(
  () => result.value?.outcomes?.filter((outcome) => outcome.status === 'removed').length || 0,
)
const attention = computed(
  () => result.value?.outcomes?.filter((outcome) => outcome.status === 'attention').length || 0,
)
defineExpose({ inspect })
function toggle(id: string) {
  const next = new Set(selected.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  selected.value = next
}
function toggleMatching() {
  const next = new Set(selected.value)
  for (const action of actions.value) {
    if (allMatchingSelected.value) next.delete(action.id)
    else next.add(action.id)
  }
  selected.value = next
}
function review(action?: Action) {
  if (action) selected.value = new Set([action.id])
  confirmation.value = ''
  reviewing.value = true
}
async function inspect() {
  if (props.busy || inspecting.value) return
  if (selected.value.size) {
    refreshPrompt.value = true
    return
  }
  await refresh()
}
async function refresh() {
  refreshPrompt.value = false
  inspecting.value = true
  try {
    const next = await props.inspect(props.tool)
    if (next) {
      report.value = next
      selected.value = new Set()
    }
  } finally {
    inspecting.value = false
  }
}
async function run() {
  if (!report.value || !selectedActions.value.length || props.busy) return
  const next = await props.execute(
    report.value.id,
    selectedActions.value.map((action) => action.id),
    confirmation.value,
  )
  result.value = next || null
  report.value = null
  selected.value = new Set()
  reviewing.value = false
  confirmation.value = ''
  await nextTick()
  resultPanel.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
</script>
<template>
  <UiCard v-bind="$attrs" class="managed-card">
    <div class="row">
      <div class="row row--start">
        <span class="category-icon"><Terminal :size="22" /></span>
        <div>
          <h2>{{ title }}</h2>
          <p class="muted">
            {{
              tool === 'docker'
                ? 'Select resources, review them together, then clean once.'
                : 'Inspect current usage, then choose a cleanup action.'
            }}
          </p>
        </div>
      </div>
      <UiButton :icon="RefreshCw" :loading="inspecting" :disabled="busy" @click="inspect">{{
        report ? 'Refresh preview' : tool === 'docker' ? 'Find cleanup items' : 'Inspect'
      }}</UiButton>
    </div>
    <div
      v-if="result"
      ref="resultPanel"
      class="tool-result"
      role="status"
      aria-label="Cleanup results"
    >
      <div class="row">
        <h3>Cleanup results</h3>
        <UiBadge v-if="result.outcomes?.length" :tone="attention ? 'review' : 'rebuildable'"
          >{{ removed }} removed<span v-if="attention">
            · {{ attention }} {{ attention === 1 ? 'needs' : 'need' }} attention</span
          ></UiBadge
        >
      </div>
      <div v-if="result.outcomes?.length" class="managed-results">
        <article v-for="(outcome, index) in result.outcomes" :key="index">
          <div class="row">
            <strong>{{ outcome.name }}</strong
            ><UiBadge :tone="outcome.status === 'removed' ? 'rebuildable' : 'review'">{{
              outcome.status === 'removed'
                ? 'Removed'
                : outcome.status === 'kept'
                  ? 'Kept'
                  : 'Needs attention'
            }}</UiBadge>
          </div>
          <p>{{ outcome.message }}</p>
        </article>
      </div>
      <pre v-else class="tool-output">{{
        result.output || 'The tool completed successfully.'
      }}</pre>
      <p class="muted">
        {{
          tool === 'docker'
            ? 'Find cleanup items again for an updated list. Space released inside the engine may take time to appear as free space on your Mac.'
            : 'Inspect again to see updated usage.'
        }}
      </p>
    </div>
    <p v-if="!report && !result" class="empty-inline">
      {{
        tool === 'docker'
          ? 'Start your local engine to find cleanable resources. Works with Docker Desktop, OrbStack, Colima, or another local engine using your Docker connection settings.'
          : tool === 'conda'
            ? 'Conda will preview cleanup without changing your environments.'
            : tool === 'homebrew'
              ? 'Homebrew will provide a dry run of its own cleanup rules.'
              : 'Requires Xcode and its selected command-line tools. Only unavailable simulators are eligible.'
      }}
    </p>
    <template v-if="report">
      <details v-if="tool === 'docker'" class="managed-details">
        <summary>Engine usage & connection</summary>
        <p class="path tool-endpoint">{{ report.endpoint }}</p>
        <pre class="tool-output">{{ report.output }}</pre>
      </details>
      <pre v-else class="tool-output">{{ report.output || 'No output from the tool.' }}</pre>
      <template v-if="tool === 'docker'">
        <UiField label="Find a Docker resource"
          ><input
            v-model="query"
            :disabled="busy"
            placeholder="Search containers, volumes, images, or cache…"
        /></UiField>
        <div class="row managed-toolbar">
          <label class="check-label"
            ><input
              type="checkbox"
              aria-label="Select all matching resources"
              :checked="allMatchingSelected"
              :indeterminate="
                !allMatchingSelected && actions.some((action) => selected.has(action.id))
              "
              :disabled="busy || !actions.length"
              @change="toggleMatching"
            />Select matching</label
          ><span class="muted"
            >{{ actions.length }} of {{ report.actions?.length || 0 }} available</span
          >
        </div>
        <p class="muted">
          Running containers and referenced volumes are kept. Nothing is selected automatically.
        </p>
        <div class="managed-resource-scroll">
          <ManagedActionList
            :actions="actions"
            :selected="selected"
            :disabled="busy"
            @toggle="toggle"
          />
        </div>
        <p v-if="!actions.length" class="empty-inline">
          {{
            report.actions?.length
              ? 'No matching resources. Try a different search.'
              : 'No eligible resources found. Your running and referenced resources are kept.'
          }}
        </p>
        <div class="managed-selection row">
          <div class="grow">
            <strong>{{ selected.size }} selected</strong>
            <p v-if="hiddenSelected" class="muted">
              {{ hiddenSelected }} hidden by your search; all are included in review.
            </p>
          </div>
          <UiButton
            v-if="selected.size"
            compact
            variant="ghost"
            :disabled="busy"
            @click="selected = new Set()"
            >Clear selection</UiButton
          >
          <UiButton variant="primary" :disabled="busy || !selected.size" @click="review()"
            >Review {{ selected.size || '' }} selected</UiButton
          >
        </div>
      </template>
      <div v-else class="managed-actions">
        <article v-for="action in actions" :key="action.id">
          <strong>{{ action.name }}</strong>
          <p>{{ action.description }}</p>
          <UiButton compact :disabled="busy" @click="review(action)">Review cleanup</UiButton>
        </article>
      </div>
    </template>
  </UiCard>
  <UiDialog
    v-if="reviewing"
    :title="
      tool === 'docker' ? 'Review Docker cleanup' : selectedActions[0]?.name || 'Review cleanup'
    "
    :busy="busy"
    @close="reviewing = false"
  >
    <p>
      <strong
        >{{ selectedActions.length }}
        {{ selectedActions.length === 1 ? 'item' : 'items' }} selected.</strong
      >
      Review the complete list below. This cleanup is permanent and does not use Trash.
    </p>
    <ManagedActionList :actions="selectedActions" />
    <div
      v-if="selectedActions.some((action) => action.risk === 'personal')"
      class="notice notice--warning"
    >
      <AlertTriangle :size="20" />
      <p>Selected containers or volumes may contain databases and other personal data.</p>
    </div>
    <p>
      {{
        tool === 'docker'
          ? 'Only the selected resources are targeted. Swept rechecks each one; changed or newly used resources are kept. Results are reported individually.'
          : 'The tool applies its cleanup rules to the state at execution time.'
      }}
    </p>
    <UiField label="Type CLEAN once to confirm"
      ><input v-model="confirmation" autocomplete="off" :disabled="busy" placeholder="CLEAN"
    /></UiField>
    <p v-if="busy" role="status">
      Cleaning the reviewed selection… Swept will stay open until it finishes.
    </p>
    <template #footer
      ><UiButton :disabled="busy" autofocus @click="reviewing = false">Keep items</UiButton
      ><UiButton
        variant="danger"
        :disabled="confirmation !== 'CLEAN'"
        :loading="busy"
        @click="run"
        >{{
          tool === 'docker' ? `Clean ${selectedActions.length} selected` : 'Run cleanup'
        }}</UiButton
      ></template
    >
  </UiDialog>
  <UiDialog v-if="refreshPrompt" title="Refresh the resource list?" @close="refreshPrompt = false">
    <p>
      Refreshing will clear your {{ selected.size }} selected
      {{ selected.size === 1 ? 'resource' : 'resources' }} and find what is currently available.
      Nothing will be deleted.
    </p>
    <template #footer
      ><UiButton autofocus @click="refreshPrompt = false">Keep selection</UiButton
      ><UiButton variant="primary" @click="refresh">Refresh list</UiButton></template
    >
  </UiDialog>
</template>
