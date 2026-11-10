<script setup lang="ts">
defineProps<{
  titleId?: string;
  eyebrow: string;
  title: string;
  description?: string;
}>();
</script>
<template>
  <div class="section-intro">
    <p class="eyebrow">{{ eyebrow }}</p>
    <h2 :id="titleId">{{ title }}</h2>
    <p v-if="description" class="section-description">{{ description }}</p>
    <slot />
  </div>
</template>
