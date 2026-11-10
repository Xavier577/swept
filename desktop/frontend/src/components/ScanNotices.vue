<script setup lang="ts">
import { AlertTriangle, Info } from '@lucide/vue'
import type { Scan } from '../../bindings/swept/internal/cleaner/models'
defineProps<{
  scan: Pick<Scan, 'warnings' | 'warningCount' | 'skipped' | 'skippedCount' | 'permissionDenied'>
}>()
</script>
<template>
  <details v-if="scan.warningCount" class="scan-notice scan-notice--warning">
    <summary>
      <AlertTriangle :size="16" /> {{ scan.warningCount }} scan
      {{ scan.warningCount === 1 ? 'warning' : 'warnings' }} · some sizes may be incomplete
    </summary>
    <p>Some contents could not be read. Affected folders cannot be cleaned as a whole.</p>
    <p v-if="scan.permissionDenied">
      Access was denied to some locations. Open Preferences for Full Disk Access help.
    </p>
    <ul>
      <li v-for="warning in scan.warnings" :key="warning">{{ warning }}</li>
    </ul>
    <p v-if="scan.warningCount > (scan.warnings?.length || 0)">
      Showing the first {{ scan.warnings?.length || 0 }} warnings.
    </p>
  </details>
  <details v-if="scan.skippedCount" class="scan-notice">
    <summary>
      <Info :size="16" /> {{ scan.skippedCount }}
      {{ scan.skippedCount === 1 ? 'location' : 'locations' }} skipped by design
    </summary>
    <p>
      Separate mounted filesystems, symbolic-link destinations, and excluded locations stay outside
      this scan. Their contents are not included in these sizes.
    </p>
    <ul>
      <li v-for="location in scan.skipped" :key="location">{{ location }}</li>
    </ul>
    <p v-if="scan.skippedCount > (scan.skipped?.length || 0)">
      Showing the first {{ scan.skipped?.length || 0 }} skipped locations.
    </p>
  </details>
</template>
