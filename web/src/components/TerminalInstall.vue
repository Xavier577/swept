<script setup lang="ts">
import { computed, ref } from "vue";
import { Check, ChevronDown, Copy, Terminal } from "@lucide/vue";

const props = defineProps<{ version: string; unnotarized: boolean }>();
const copied = ref(false);
const error = ref("");
const script = "https://xavier577.github.io/swept/install.sh";
const command = computed(
  () =>
    `curl -fsSL ${script} | /bin/bash -s -- --version ${props.version}${props.unnotarized ? " --unnotarized" : ""}`,
);
async function copy() {
  error.value = "";
  try {
    await navigator.clipboard.writeText(command.value);
    copied.value = true;
    setTimeout(() => (copied.value = false), 2500);
  } catch {
    error.value = "Select and copy the command below.";
  }
}
</script>
<template>
  <details class="terminal-install">
    <summary>
      <Terminal :size="17" /> Install from Terminal
      <ChevronDown class="terminal-chevron" :size="15" />
    </summary>
    <p>
      Paste into Terminal. Verifies the download and installs into
      <code>~/Applications</code>. No sudo needed.
    </p>
    <p v-if="unnotarized" class="download-warning">
      Asks before removing Swept’s quarantine flag to skip its first-launch
      block. This skips Apple’s downloaded-app check for Swept only; it does not
      notarize the app or disable Gatekeeper for other apps.
    </p>
    <div class="install-command">
      <code>{{ command }}</code>
      <button
        type="button"
        @click="copy"
        :aria-label="copied ? 'Command copied' : 'Copy install command'"
      >
        <Check v-if="copied" :size="16" /><Copy v-else :size="16" />
        {{ copied ? "Copied" : "Copy" }}
      </button>
    </div>
    <p v-if="error" role="status">{{ error }}</p>
    <p class="installer-details">
      Checks SHA-256 against the release checksum and verifies the app’s
      signature. These checks do not certify it as malware-free.
      <a :href="script">Read the installer</a> before running it. Quit Swept
      first if you’re updating; settings and history stay in place.
    </p>
  </details>
</template>
