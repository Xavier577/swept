// Marketing captures use the real app with sample data, never a user's files.
// This entry is excluded from the production app and website builds.
import { createApp } from 'vue'
import { setTransport } from '@wailsio/runtime'
import App from '../src/App.vue'
import '../src/style.css'

const home = '/Users/alex'
const gib = 1024 ** 3
let theme = new URLSearchParams(location.search).get('theme') || 'dark'
const definitions = [
  [
    'dependencies',
    'workbench / node_modules',
    'Developer/workbench/node_modules',
    'node',
    4.8,
    'rebuildable',
    'Dependencies',
    "Run the project's package manager install command to restore dependencies.",
  ],
  [
    'builds',
    'DerivedData',
    'Library/Developer/Xcode/DerivedData',
    'xcode',
    8.2,
    'rebuildable',
    'Build files',
    'Xcode rebuilds derived data when you build your projects again.',
  ],
  [
    'brew',
    'Homebrew',
    'Library/Caches/Homebrew',
    'homebrew',
    2.1,
    'rebuildable',
    'Download cache',
    'Packages may need to be downloaded again.',
  ],
  [
    'python',
    'uv',
    'Library/Caches/uv',
    'python',
    1.4,
    'rebuildable',
    'Package cache',
    'Packages may need to be downloaded again.',
  ],
  [
    'go',
    'go-build',
    'Library/Caches/go-build',
    'devtools',
    3.2,
    'rebuildable',
    'Build cache',
    'Go rebuilds cached packages during subsequent builds.',
  ],
  [
    'chrome',
    'Chrome / Default / Cache',
    'Library/Caches/Google/Chrome/Default/Cache',
    'caches',
    1.1,
    'rebuildable',
    'Browser cache',
    'Downloaded browser content. Close Chrome before cleaning.',
  ],
  [
    'archives',
    'Archives',
    'Library/Developer/Xcode/Archives',
    'xcode',
    6.4,
    'personal',
    'Archives',
    'Archives can contain builds and debug symbols you still need. Review their contents.',
  ],
  [
    'logs',
    'Application logs',
    'Library/Logs/example-app',
    'logs',
    0.12,
    'review',
    'Logs',
    'Historical logs can help diagnose issues. Review before cleaning.',
  ],
] as const
const items = definitions.map(([id, name, path, category, size, risk, kind, reason]) => ({
  id,
  name,
  path: `${home}/${path}`,
  category,
  bytes: Math.round(size * gib),
  logicalBytes: Math.round(size * gib),
  risk,
  kind,
  reason,
  files: 432,
  modified: '2026-11-08T10:00:00Z',
  directory: true,
  canClean: true,
  blockedLabel: '',
  blockedReason: '',
}))
function scan(path: string) {
  const explorerItems = [
    {
      ...items[0],
      id: 'projects',
      name: 'Projects',
      path: `${home}/Developer/Projects`,
      bytes: 18.2 * gib,
      risk: 'personal',
      kind: 'File or folder',
      reason: 'Review its contents before deleting.',
    },
    {
      ...items[0],
      id: 'workbench',
      name: 'workbench',
      path: `${home}/Developer/workbench`,
      bytes: 7.6 * gib,
      risk: 'personal',
      kind: 'File or folder',
      reason: 'Review its contents before deleting.',
    },
    {
      ...items[0],
      id: 'node',
      name: 'node_modules',
      path: `${home}/Developer/node_modules`,
      bytes: 4.8 * gib,
    },
    {
      ...items[0],
      id: 'notes',
      name: 'Notes',
      path: `${home}/Developer/Notes`,
      bytes: 0.2 * gib,
      risk: 'personal',
      kind: 'File or folder',
      reason: 'Review its contents before deleting.',
    },
  ]
  return {
    id: path || 'catalog',
    path,
    started: '2026-11-08T10:00:00Z',
    finished: '2026-11-08T10:00:12Z',
    items: path ? explorerItems : items,
    cancelled: false,
    warnings: [],
    warningCount: 0,
    skipped: [],
    skippedCount: 0,
    permissionDenied: false,
  }
}
setTransport({
  async call(_object, _method, _window, input: { methodID: number; args: string[] }) {
    switch (input.methodID) {
      case 3414141343:
        return {
          home,
          disk: { total: 512 * gib, available: 76.4 * gib },
          settings: { theme, projectRoots: [`${home}/Developer`], excludedPaths: [] },
          history: [],
          permissionHint: '',
        }
      case 4265288652:
        theme = input.args[0]!
        return
      case 2096799064:
      case 2693459543: {
        const bridge = window as unknown as {
          _wails: { dispatchWailsEvent: (event: unknown) => void }
        }
        bridge._wails.dispatchWailsEvent({
          name: 'scan-finished',
          data: { jobId: input.args[0], scan: scan(input.args[1]!), error: '' },
        })
        return
      }
      default:
        throw new Error('This screenshot fixture does not access files or run cleanup.')
    }
  },
})
createApp(App).mount('#app')
