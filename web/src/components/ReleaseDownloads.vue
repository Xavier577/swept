<script setup lang="ts">
import { computed } from "vue";
import { ArrowUpRight, Check, ChevronDown, HardDrive } from "@lucide/vue";
import ActionLink from "./ActionLink.vue";
import DownloadLinks from "./DownloadLinks.vue";
import type { ReleaseCatalog } from "../releases";

const props = defineProps<{ catalog: ReleaseCatalog }>();
const current = computed(
  () =>
    props.catalog.releases.find(
      (release) =>
        release.tag === props.catalog.latestTag && !release.prerelease,
    ) ||
    props.catalog.releases.find((release) => !release.prerelease) ||
    props.catalog.releases[0],
);
function date(value: string) {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}
</script>
<template>
  <div class="download-card">
    <div class="download-card-heading">
      <span class="download-symbol"><HardDrive :size="25" /></span>
      <div>
        <h3>Swept for Mac</h3>
        <p>Make room for what’s next.</p>
      </div>
    </div>
    <template v-if="current">
      <div class="current-release">
        <strong>{{ current.tag }}</strong
        ><span
          :class="[
            'release-badge',
            { 'release-badge--preview': current.prerelease },
          ]"
          >{{ current.prerelease ? "Preview release" : "Latest release" }}</span
        >
      </div>
      <p class="release-date">Released {{ date(current.publishedAt) }}</p>
      <DownloadLinks :downloads="current.downloads" :version="current.tag" />
      <a class="release-notes" :href="current.notesUrl"
        >What’s new <ArrowUpRight :size="13"
      /></a>
    </template>
    <template v-else>
      <div class="release-status">
        <span class="status-dot" /><strong
          >Getting ready for the first release</strong
        >
      </div>
      <p class="release-description">
        The public download will be here once signing and compatibility checks
        are complete.
      </p>
      <ActionLink href="https://github.com/Xavier577/swept/releases" secondary
        >View releases on GitHub <ArrowUpRight :size="17"
      /></ActionLink>
    </template>
    <div class="install-note">
      <Check :size="16" /><span
        >A familiar install: open the DMG, drag Swept to Applications.</span
      >
    </div>
  </div>
  <details v-if="catalog.releases.length" class="version-history">
    <summary>
      <span
        >All versions <small>{{ catalog.releases.length }}</small></span
      ><ChevronDown :size="18" />
    </summary>
    <p class="history-intro">
      Choose a previous version or try a preview. Each button downloads the
      installer directly.
    </p>
    <article
      v-for="release in catalog.releases"
      :key="release.tag"
      class="version-row"
      :aria-label="`Swept ${release.tag}`"
    >
      <div class="version-info">
        <div class="current-release">
          <h3>{{ release.tag }}</h3>
          <span
            v-if="release.prerelease"
            class="release-badge release-badge--preview"
            >Preview</span
          ><span v-else-if="release.tag === current?.tag" class="release-badge"
            >Latest</span
          >
        </div>
        <p class="release-date">{{ date(release.publishedAt) }}</p>
        <a :href="release.notesUrl" class="release-notes"
          >Release notes <ArrowUpRight :size="13"
        /></a>
      </div>
      <DownloadLinks
        :downloads="release.downloads"
        :version="release.tag"
        secondary
      />
    </article>
  </details>
</template>
