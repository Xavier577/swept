import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Events } from '@wailsio/runtime'
import '../../bindings/events'
import * as Service from '../../bindings/swept/service'
import type {
  Cleanup,
  Progress,
  Scan,
  Settings,
  Status,
} from '../../bindings/swept/internal/cleaner/models'
import { errorMessage } from '../lib/format'

export function useSwept() {
  const status = ref<Status | null>(null)
  const scan = ref<Scan | null>(null)
  const explorer = ref<Scan | null>(null)
  const explorerPath = ref('')
  const selected = ref(new Set<string>())
  const explorerSelected = ref(new Set<string>())
  const error = ref('')
  const notice = ref('')
  const busy = ref<'scan' | 'browse' | 'cleanup' | 'tool' | null>(null)
  const progress = ref<Progress | null>(null)
  const cancelling = ref(false)
  const savingTheme = ref(false)
  const lastCleanup = ref<Cleanup | null>(null)
  const jobID = ref('')
  let offProgress: (() => void) | undefined
  let offFinished: (() => void) | undefined
  let pendingScan:
    { id: string; resolve: (scan: Scan) => void; reject: (error: Error) => void } | undefined

  async function refreshStatus() {
    status.value = await Service.Status()
  }
  async function perform<T>(action: () => Promise<T>): Promise<T | undefined> {
    error.value = ''
    try {
      return await action()
    } catch (cause) {
      error.value = errorMessage(cause)
    }
  }
  async function startScan(path = '', refresh = true) {
    if (busy.value) return
    busy.value = refresh ? 'scan' : 'browse'
    progress.value = null
    cancelling.value = false
    const id = crypto.randomUUID()
    jobID.value = id
    notice.value = ''
    try {
      return await perform(async () => {
        const result = await new Promise<Scan>((resolve, reject) => {
          pendingScan = { id, resolve, reject }
          void (refresh ? Service.Scan : Service.Browse)(id, path).catch((cause) => {
            if (pendingScan?.id === id) {
              pendingScan = undefined
              reject(cause)
            }
          })
        })
        if (result.cancelled) {
          notice.value = 'Scan cancelled. Previous results have been kept.'
          return
        }
        if (path) {
          if (explorer.value?.id !== result.id) explorerSelected.value = new Set()
          explorer.value = result
          explorerPath.value = result.path
        } else {
          selected.value = new Set()
          scan.value = result
        }
        await refreshStatus()
        return result
      })
    } finally {
      pendingScan = undefined
      jobID.value = ''
      progress.value = null
      busy.value = null
      cancelling.value = false
    }
  }
  async function cancelScan() {
    if (!pendingScan || cancelling.value) return
    const id = pendingScan.id
    cancelling.value = true
    try {
      await Service.Cancel(id)
    } catch (cause) {
      if (pendingScan?.id === id) {
        error.value = errorMessage(cause)
        cancelling.value = false
      }
    }
  }
  async function clean(source: Scan, ids: string[], mode: 'permanent' | 'trash') {
    if (busy.value) return false
    busy.value = 'cleanup'
    try {
      return !!(await perform(async () => {
        lastCleanup.value = await Service.Cleanup(source.id, ids, mode, true)
        scan.value = null
        explorer.value = null
        selected.value = new Set()
        explorerSelected.value = new Set()
        await refreshStatus()
        return true
      }))
    } finally {
      busy.value = null
    }
  }
  async function saveSettings(settings: Settings) {
    await perform(async () => {
      await Service.SaveSettings(settings)
      scan.value = null
      explorer.value = null
      selected.value = new Set()
      explorerSelected.value = new Set()
      await refreshStatus()
      notice.value = 'Preferences saved. Your next scan will use these settings.'
    })
  }
  async function setTheme(theme: string) {
    if (!status.value || savingTheme.value || status.value.settings.theme === theme) return
    const previous = status.value.settings.theme
    savingTheme.value = true
    status.value.settings.theme = theme
    error.value = ''
    try {
      await Service.SetTheme(theme)
    } catch (cause) {
      status.value.settings.theme = previous
      error.value = `Could not save appearance. ${errorMessage(cause)}`
    } finally {
      savingTheme.value = false
    }
  }
  onMounted(() => {
    offProgress = Events.On('scan-progress', (event) => {
      if (pendingScan?.id === event.data.jobId && !cancelling.value) progress.value = event.data
    })
    offFinished = Events.On('scan-finished', (event) => {
      const pending = pendingScan
      if (!pending || pending.id !== event.data.jobId) return
      pendingScan = undefined
      if (event.data.error) pending.reject(new Error(event.data.error))
      else if (event.data.scan) pending.resolve(event.data.scan)
      else pending.reject(new Error('The scan finished without a result. Try scanning again.'))
    })
    void perform(refreshStatus)
  })
  onBeforeUnmount(() => {
    offProgress?.()
    offFinished?.()
    if (pendingScan) {
      void Service.Cancel(pendingScan.id).catch(() => {})
      pendingScan.reject(new Error('Scan view closed.'))
      pendingScan = undefined
    }
  })
  const theme = computed(() => status.value?.settings.theme || 'system')
  watch(
    theme,
    (value) => {
      document.documentElement.dataset.theme = value
    },
    { immediate: true },
  )
  return {
    status,
    scan,
    explorer,
    explorerPath,
    selected,
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
  }
}
