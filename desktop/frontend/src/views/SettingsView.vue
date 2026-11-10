<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Plus, X, ShieldCheck, Sun, Moon, Monitor } from '@lucide/vue'
import type { Settings, Status } from '../../bindings/swept/internal/cleaner/models'
import UiButton from '../components/ui/UiButton.vue'
import UiCard from '../components/ui/UiCard.vue'

const appVersion = import.meta.env.VITE_APP_VERSION
const props = defineProps<{
  status: Status
  busy: boolean
  savingTheme: boolean
  chooseFolder: () => Promise<string | undefined>
}>()
const emit = defineEmits<{ save: [settings: Settings]; theme: [theme: string]; permissions: [] }>()
function copySettings(value: Settings): Settings {
  return {
    theme: value.theme,
    projectRoots: [...(value.projectRoots || [])],
    excludedPaths: [...(value.excludedPaths || [])],
  }
}
const settings = ref<Settings>(copySettings(props.status.settings))
const hasChanges = computed(() =>
  (['projectRoots', 'excludedPaths'] as const).some(
    (kind) =>
      JSON.stringify(settings.value[kind] || []) !==
      JSON.stringify(props.status.settings[kind] || []),
  ),
)
watch(
  () => props.status.settings,
  (value) => {
    settings.value = copySettings(value)
  },
)
watch(
  () => props.status.settings.theme,
  (theme) => {
    settings.value.theme = theme
  },
)
async function add(kind: 'projectRoots' | 'excludedPaths') {
  const path = await props.chooseFolder()
  if (!path) return
  settings.value[kind] = [...new Set([...(settings.value[kind] || []), path])]
}
function remove(kind: 'projectRoots' | 'excludedPaths', path: string) {
  settings.value[kind] = settings.value[kind]?.filter((value) => value !== path) || []
}
</script>
<template>
  <div class="page-heading">
    <div>
      <p class="eyebrow">MAKE IT YOURS</p>
      <h1>Preferences</h1>
      <p>A sweep that fits the way you work.</p>
    </div>
    <UiButton
      variant="primary"
      :disabled="busy || savingTheme || !hasChanges"
      @click="emit('save', settings)"
      >Save preferences</UiButton
    >
  </div>
  <div class="settings-stack">
    <UiCard
      ><h2>Appearance</h2>
      <p class="muted">Changes apply and save immediately. System follows your Mac.</p>
      <div class="theme-options">
        <button
          v-for="option in [
            { id: 'system', label: 'System', icon: Monitor },
            { id: 'light', label: 'Light', icon: Sun },
            { id: 'dark', label: 'Dark', icon: Moon },
          ]"
          :key="option.id"
          :class="{ active: settings.theme === option.id }"
          :aria-pressed="settings.theme === option.id"
          :disabled="savingTheme"
          @click="emit('theme', option.id)"
        >
          <component :is="option.icon" :size="22" />{{ option.label }}
        </button>
      </div></UiCard
    ><UiCard v-for="kind in ['projectRoots', 'excludedPaths'] as const" :key="kind"
      ><div class="row">
        <div>
          <h2>{{ kind === 'projectRoots' ? 'Project folders' : 'Leave these folders alone' }}</h2>
          <p class="muted">
            {{
              kind === 'projectRoots'
                ? 'Search these folders for dependencies and build artifacts. User caches are scanned separately.'
                : 'Excluded folders are skipped. A parent containing exclusions cannot be cleaned as a whole.'
            }}
          </p>
        </div>
        <UiButton :icon="Plus" :disabled="busy" @click="add(kind)">Add folder</UiButton>
      </div>
      <p v-if="!settings[kind]?.length" class="empty-inline">
        {{
          kind === 'projectRoots'
            ? 'No project folders selected. Known user caches will still be scanned.'
            : 'No exclusions yet.'
        }}
      </p>
      <div v-for="path in settings[kind]" :key="path" class="path-setting">
        <code>{{ path }}</code
        ><UiButton
          variant="ghost"
          :icon="X"
          :disabled="busy"
          :aria-label="`Remove ${path}`"
          @click="remove(kind, path)"
        /></div></UiCard
    ><UiCard
      ><div class="row row--start">
        <ShieldCheck :size="22" />
        <h2>Folder access</h2>
      </div>
      <p class="muted">{{ status.permissionHint }}</p>
      <UiButton @click="emit('permissions')">Open Full Disk Access settings</UiButton></UiCard
    >
    <p class="fine-print">
      Swept {{ appVersion }} · Built with Wails, Go, and Vue. All scanning and cleanup run locally.
    </p>
  </div>
</template>
