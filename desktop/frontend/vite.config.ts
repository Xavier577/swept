import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import wails from '@wailsio/runtime/plugins/vite'
import packageInfo from './package.json' with { type: 'json' }

// https://vitejs.dev/config/
export default defineConfig({
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(
      process.env.SWEPT_RELEASE_TAG?.replace(/^v/, '') ||
        process.env.SWEPT_VERSION ||
        packageInfo.version,
    ),
  },
  // Ventura ships with Safari 16; avoid requiring a newer WebKit for startup.
  build: { target: 'safari16', cssTarget: 'safari16' },
  server: {
    host: '127.0.0.1',
    port: Number(process.env.WAILS_VITE_PORT) || 9245,
    strictPort: true,
  },
  plugins: [vue(), wails('./bindings')],
})
