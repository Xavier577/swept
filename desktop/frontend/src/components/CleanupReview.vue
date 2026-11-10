<script setup lang="ts">
import { computed, ref } from 'vue'
import { Flame, Trash2, ShieldCheck } from '@lucide/vue'
import type { Item } from '../../bindings/swept/internal/cleaner/models'
import { bytes } from '../lib/format'
import UiDialog from './ui/UiDialog.vue'
import UiButton from './ui/UiButton.vue'
import ItemStatusBadge from './ItemStatusBadge.vue'
const props = defineProps<{ items: Item[]; busy: boolean }>()
defineEmits<{ close: []; confirm: [mode: 'permanent' | 'trash'] }>()
const mode = ref<'permanent' | 'trash'>('permanent')
const acknowledged = ref(false)
const confirmation = ref('')
const total = computed(() => props.items.reduce((sum, item) => sum + item.bytes, 0))
const personal = computed(() => props.items.some((item) => item.risk === 'personal'))
const ready = computed(
  () =>
    props.items.length > 0 &&
    (mode.value === 'trash' ||
      (acknowledged.value && (!personal.value || confirmation.value === 'CLEAN'))),
)
</script>
<template>
  <UiDialog title="Review your sweep" :busy="busy" @close="$emit('close')"
    ><div class="review-total">
      <span>{{ items.length }} selected {{ items.length === 1 ? 'item' : 'items' }}</span
      ><strong>{{ bytes(total) }}</strong
      ><small>Estimated size on disk</small>
    </div>
    <div class="segmented">
      <button
        :class="{ active: mode === 'permanent' }"
        :disabled="busy"
        @click="mode = 'permanent'"
      >
        <Flame :size="16" /> Clean now</button
      ><button :class="{ active: mode === 'trash' }" :disabled="busy" @click="mode = 'trash'">
        <Trash2 :size="16" /> Move to Trash
      </button>
    </div>
    <p class="muted">
      {{
        mode === 'permanent'
          ? 'These items will be permanently removed. Close related apps and builds before continuing.'
          : 'These items can be recovered from macOS Trash. Space is released when you empty Trash in Finder.'
      }}
    </p>
    <div class="review-list">
      <article v-for="item in items" :key="item.id">
        <div class="row">
          <strong class="truncate">{{ item.name }}</strong
          ><span>{{ bytes(item.bytes) }}</span>
        </div>
        <p class="path">{{ item.path }}</p>
        <div class="row">
          <ItemStatusBadge :item="item" /><small>{{ item.reason }}</small>
        </div>
      </article>
    </div>
    <div v-if="mode === 'permanent'" class="confirmation">
      <label class="check-label"
        ><input v-model="acknowledged" type="checkbox" :disabled="busy" /> I understand these files
        cannot be restored by Swept.</label
      ><label v-if="personal" class="field"
        ><span
          >Some selected contents may not be replaceable. Type <strong>CLEAN</strong> to
          continue.</span
        ><input
          v-model="confirmation"
          :disabled="busy"
          placeholder="CLEAN"
          autocomplete="off"
          aria-label="Confirm reviewed contents cleanup"
      /></label>
    </div>
    <p class="fine-print">
      <ShieldCheck :size="14" /> Swept rechecks every selected item before cleanup. Free-space
      changes can differ because of APFS snapshots, shared data, and other disk activity.
    </p>
    <p v-if="busy" role="status" class="muted">
      Cleanup is in progress. Swept will stay open until it finishes.
    </p>
    <template #footer
      ><UiButton :disabled="busy" autofocus @click="$emit('close')">Keep files</UiButton
      ><UiButton
        :variant="mode === 'permanent' ? 'danger' : 'primary'"
        :icon="mode === 'permanent' ? Flame : Trash2"
        :disabled="!ready"
        :loading="busy"
        @click="$emit('confirm', mode)"
        >{{ mode === 'permanent' ? 'Permanently clean' : 'Move to Trash' }}
        {{ bytes(total) }}</UiButton
      ></template
    ></UiDialog
  >
</template>
