<script setup lang="ts">
import { ref } from 'vue'
import ManagedView from '../src/views/ManagedView.vue'
const submitted = ref('')
const busy = ref(false)
async function inspect() {
  return {
    id: 'preview',
    tool: 'docker',
    at: new Date().toISOString(),
    endpoint: 'unix:///Users/test/.docker/run/docker.sock',
    output:
      'TYPE          TOTAL     ACTIVE    SIZE      RECLAIMABLE\nBuild Cache   4         0         128 MB    128 MB',
    actions: [
      {
        id: 'cache',
        name: 'Build cache · app',
        description: 'Remove unused build cache.',
        risk: 'rebuildable',
      },
      {
        id: 'volume',
        name: 'Volume · test-db',
        description: 'Remove the unreferenced database volume.',
        risk: 'personal',
      },
      {
        id: 'container',
        name: 'Container · keep-me',
        description: 'Remove this stopped container.',
        risk: 'personal',
      },
    ],
  }
}
async function execute(_reportID: string, ids: string[], confirmation: string) {
  busy.value = true
  submitted.value = `${confirmation}: ${ids.join(', ')}`
  await new Promise((resolve) => setTimeout(resolve, 100))
  busy.value = false
  return {
    output: '',
    outcomes: ids.map((id) => ({
      name: id === 'cache' ? 'Build cache · app' : 'Volume · test-db',
      status: id === 'cache' ? 'removed' : 'attention',
      message:
        id === 'cache' ? 'Removed this resource.' : 'This resource is now in use; inspect again.',
    })),
  }
}
</script>
<template>
  <main style="padding: 30px; max-width: 1100px; margin: auto">
    <ManagedView
      tool="docker"
      title="Docker storage"
      :busy="busy"
      :inspect="inspect"
      :execute="execute"
    /><output aria-label="Submitted cleanup">{{ submitted }}</output>
  </main>
</template>
