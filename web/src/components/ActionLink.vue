<script setup lang="ts">
withDefaults(defineProps<{ href: string; secondary?: boolean }>(), {
  secondary: false,
});
</script>
<template>
  <a :href="href" :class="['action', { 'action--secondary': secondary }]"
    ><slot
  /></a>
</template>
