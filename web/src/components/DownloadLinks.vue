<script setup lang="ts">
import { ArrowDownToLine } from "@lucide/vue";
import ActionLink from "./ActionLink.vue";
import type { Download } from "../releases";

defineProps<{ downloads: Download[]; version: string; secondary?: boolean }>();
const labels = {
  universal: "Universal DMG",
  arm64: "Apple Silicon DMG",
  intel: "Intel DMG",
  unknown: "Mac DMG",
};
function size(bytes: number) {
  return `${(bytes / 1024 ** 2).toLocaleString("en-US", { maximumFractionDigits: 2 })} MiB`;
}
</script>
<template>
  <div class="download-links" v-if="downloads.length">
    <div v-for="file in downloads" :key="file.url" class="download-option">
      <ActionLink
        :href="file.url"
        :secondary="secondary"
        :aria-label="`Download Swept ${version} — ${labels[file.architecture]} (${size(file.size)})`"
      >
        <ArrowDownToLine :size="17" /> {{ labels[file.architecture] }}
        <span>{{ size(file.size) }}</span>
      </ActionLink>
      <p v-if="file.unnotarized" class="download-warning">
        Not notarized by Apple. macOS may block the first launch.
        <a href="https://support.apple.com/en-us/102445">Installation help</a>
      </p>
      <small v-if="file.architecture === 'universal'"
        >For Apple Silicon and Intel Macs</small
      >
      <small v-else-if="file.architecture === 'unknown'">{{ file.name }}</small>
    </div>
  </div>
  <p v-else class="release-description">
    No Mac installer was published for this version.
  </p>
</template>
