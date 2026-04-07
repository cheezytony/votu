<script setup lang="ts">
import { useToastStore } from '~/stores/toast';

const store = useToastStore();
</script>

<template>
  <Teleport to="body">
    <div
      aria-live="polite"
      aria-atomic="false"
      class="fixed bottom-4 right-4 z-50 flex flex-col gap-2"
    >
      <TransitionGroup name="toast">
        <div
          v-for="toast in store.toasts"
          :key="toast.id"
          class="flex items-start gap-3 rounded-lg px-4 py-3 shadow-lg text-sm font-medium text-white w-72"
          :class="{
            'bg-gray-800': toast.variant === 'info',
            'bg-green-600': toast.variant === 'success',
            'bg-red-600': toast.variant === 'error',
          }"
        >
          <span class="flex-1">{{ toast.message }}</span>
          <button
            class="shrink-0 opacity-70 hover:opacity-100"
            aria-label="Dismiss"
            @click="store.remove(toast.id)"
          >
            ✕
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.25s ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(1rem);
}
</style>
