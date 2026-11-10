import { createApp } from 'vue'
import { setTransport } from '@wailsio/runtime'
import App from '../src/App.vue'
import type { Scan } from '../bindings/swept/internal/cleaner/models'
import { Risk } from '../bindings/swept/internal/cleaner/models'
import '../src/style.css'

const home = '/Users/test'
type Job = { id: string; path: string }
let active: Job | undefined
let cancelled: Job | undefined
let delayFirstStart = true
let delayFirstCancel = true
const lateReplies: Array<(error: Error) => void> = []

function emit(name: string, data: unknown) {
  const bridge = window as unknown as {
    _wails: { dispatchWailsEvent: (event: { name: string; data: unknown }) => void }
  }
  bridge._wails.dispatchWailsEvent({ name, data })
}
function result(job: Job, wasCancelled = false): Scan {
  return {
    id: job.id,
    path: job.path,
    started: '2026-11-10T12:00:00Z',
    finished: '2026-11-10T12:00:01Z',
    cancelled: wasCancelled,
    warnings: [],
    warningCount: 0,
    skipped: [],
    skippedCount: 0,
    permissionDenied: false,
    items: wasCancelled
      ? []
      : [
          {
            id: 'kept-file',
            name: 'keep.txt',
            path: job.path + '/keep.txt',
            category: 'files',
            kind: 'File or folder',
            risk: Risk.Personal,
            reason: 'Review its contents before deleting.',
            bytes: 4096,
            logicalBytes: 12,
            files: 1,
            modified: '2026-11-10T12:00:00Z',
            directory: false,
            canClean: true,
            blockedLabel: '',
            blockedReason: '',
          },
        ],
  }
}

// Exercise the real App and composable through generated Wails calls. Only the
// desktop transport is replaced; this file is outside the production entrypoint.
setTransport({
  async call(_object, _method, _window, input: { methodID: number; args: string[] }) {
    switch (input.methodID) {
      case 3414141343: // Status
        return {
          home,
          disk: { total: 1000000, available: 500000 },
          settings: {
            theme: sessionStorage.getItem('test-theme') || 'dark',
            projectRoots: [],
            excludedPaths: [],
          },
          history: [],
          permissionHint: '',
        }
      case 4265288652: // SetTheme
        if (new URLSearchParams(location.search).has('theme-error'))
          throw new Error('Settings could not be written.')
        sessionStorage.setItem('test-theme', input.args[0]!)
        return
      case 425946548: // ChooseFolder
        return home + '/Projects'
      case 2096799064: // Scan
      case 2693459543: {
        // Browse
        const job = { id: input.args[0]!, path: input.args[1]! }
        if (job.path.endsWith('/missing')) {
          emit('scan-finished', { jobId: job.id, scan: null, error: 'Folder no longer exists.' })
        } else if (job.path.endsWith('/waiting-for-access')) {
          active = job
        } else if (job.path !== home && input.methodID === 2693459543) {
          emit('scan-finished', { jobId: job.id, scan: result(job), error: '' })
        } else {
          active = job
          emit('scan-progress', {
            jobId: job.id,
            phase: 'Measuring files',
            path: job.path + '/large-folder',
            visited: 12000,
            items: 3,
          })
          if (delayFirstStart) {
            delayFirstStart = false
            return new Promise((_resolve, reject) => lateReplies.push(reject))
          }
        }
        return
      }
      case 4142576235: {
        // Cancel
        if (active?.id !== input.args[0]) return
        cancelled = active
        active = undefined
        emit('scan-finished', { jobId: cancelled.id, scan: result(cancelled, true), error: '' })
        if (delayFirstCancel) {
          delayFirstCancel = false
          return new Promise((_resolve, reject) => lateReplies.push(reject))
        }
        return
      }
      default:
        throw new Error('Unexpected desktop call: ' + input.methodID)
    }
  },
})

window.addEventListener('finish-active-scan', () => {
  if (!active) throw new Error('No active scan to finish')
  emit('scan-finished', { jobId: active.id, scan: result(active), error: '' })
  active = undefined
})

window.addEventListener('deliver-old-scan-events', () => {
  if (!cancelled) throw new Error('No old job to deliver')
  emit('scan-progress', {
    jobId: cancelled.id,
    phase: 'Obsolete scan progress',
    path: home,
    visited: 99999,
    items: 999,
  })
  emit('scan-finished', { jobId: cancelled.id, scan: result(cancelled), error: '' })
  for (const reject of lateReplies.splice(0)) reject(new Error('Obsolete request failure'))
})

createApp(App).mount('#app')
