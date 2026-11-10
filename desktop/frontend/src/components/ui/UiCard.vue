<script setup lang="ts">
withDefaults(defineProps<{ padded?: boolean }>(), { padded: true })
</script>
<template>
  <section class="card" :class="{ 'card--padded': padded }"><slot /></section>
</template>
