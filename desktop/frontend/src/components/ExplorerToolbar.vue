<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ArrowLeft, ArrowRight, ArrowUp, ChevronRight, Home } from '@lucide/vue'
import UiButton from './ui/UiButton.vue'
const props = defineProps<{
  home: string
  path: string
  busy: boolean
  canBack: boolean
  canForward: boolean
}>()
const emit = defineEmits<{ navigate: [path: string]; back: []; forward: [] }>()
const location = ref(props.path)
watch(
  () => props.path,
  (path) => {
    location.value = path
  },
)
const crumbs = computed(() => {
  const parts = props.path.slice(props.home.length).split('/').filter(Boolean)
  return parts.map((name, index) => ({
    name,
    path: props.home + '/' + parts.slice(0, index + 1).join('/'),
  }))
})
function go() {
  const path = location.value.trim()
  if (path)
    emit(
      'navigate',
      path === '~' ? props.home : path.startsWith('~/') ? props.home + path.slice(1) : path,
    )
}
</script>
<template>
  <div class="explorer-toolbar">
    <nav class="breadcrumb" aria-label="Folder navigation">
      <UiButton
        compact
        variant="ghost"
        :icon="ArrowLeft"
        aria-label="Back to previous folder"
        :disabled="busy || !canBack"
        @click="$emit('back')"
      />
      <UiButton
        compact
        variant="ghost"
        :icon="ArrowRight"
        aria-label="Forward to next folder"
        :disabled="busy || !canForward"
        @click="$emit('forward')"
      />
      <UiButton
        compact
        variant="ghost"
        :icon="ArrowUp"
        aria-label="Go to parent folder"
        :disabled="busy || path === home"
        @click="$emit('navigate', path.slice(0, path.lastIndexOf('/')))"
      />
      <UiButton
        compact
        variant="ghost"
        :icon="Home"
        :disabled="busy || !home"
        @click="$emit('navigate', home)"
        >Home</UiButton
      >
      <span v-for="crumb in crumbs" :key="crumb.path" class="crumb"
        ><ChevronRight :size="13" /><button
          class="text-button"
          :disabled="busy"
          :aria-current="crumb.path === path ? 'location' : undefined"
          @click="$emit('navigate', crumb.path)"
        >
          {{ crumb.name }}
        </button></span
      >
    </nav>
    <form class="location-bar" @submit.prevent="go">
      <input
        v-model="location"
        aria-label="Folder path"
        spellcheck="false"
        :disabled="busy"
      /><UiButton type="submit" compact :disabled="busy || !location.trim()">Go</UiButton>
    </form>
    <div class="quick-folders">
      <span>Jump to</span
      ><UiButton
        v-for="folder in ['Downloads', 'Documents', 'Desktop', 'Developer', 'Library']"
        :key="folder"
        compact
        variant="ghost"
        :disabled="busy || !home"
        @click="$emit('navigate', home + '/' + folder)"
        >{{ folder }}</UiButton
      >
    </div>
  </div>
</template>
