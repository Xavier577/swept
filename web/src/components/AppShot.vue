<script setup lang="ts">
import { Maximize2 } from "@lucide/vue";
defineProps<{ src: string; alt: string; label: string; eager?: boolean }>();
defineEmits<{ expand: [] }>();
</script>
<template>
  <figure class="app-shot">
    <div class="window-bar">
      <span class="traffic-lights" aria-hidden="true"><i /><i /><i /></span
      ><span>Swept <span class="window-divider">/</span> {{ label }}</span
      ><button
        class="icon-button"
        :aria-label="`Enlarge ${label} screenshot`"
        @click="$emit('expand')"
      >
        <Maximize2 :size="14" />
      </button>
    </div>
    <button
      class="screenshot-button"
      :aria-label="`View ${label} screenshot full size`"
      @click="$emit('expand')"
    >
      <img
        :src="src"
        :alt="alt"
        width="1280"
        height="720"
        :loading="eager ? 'eager' : 'lazy'"
      />
    </button>
  </figure>
</template>
