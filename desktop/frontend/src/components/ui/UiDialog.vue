<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue'
import { X } from '@lucide/vue'
import UiButton from './UiButton.vue'
defineProps<{ title: string; busy?: boolean }>()
const emit = defineEmits<{ close: [] }>()
const dialog = ref<HTMLDialogElement>()
onMounted(() => dialog.value?.showModal())
onBeforeUnmount(() => dialog.value?.close())
</script>
<template>
  <dialog
    ref="dialog"
    class="dialog"
    aria-labelledby="dialog-title"
    @cancel.prevent="!busy && emit('close')"
  >
    <header class="dialog__header">
      <h2 id="dialog-title">{{ title }}</h2>
      <UiButton
        variant="ghost"
        :icon="X"
        :disabled="busy"
        aria-label="Close dialog"
        @click="emit('close')"
      />
    </header>
    <div class="dialog__body"><slot /></div>
    <footer class="dialog__footer"><slot name="footer" /></footer>
  </dialog>
</template>
