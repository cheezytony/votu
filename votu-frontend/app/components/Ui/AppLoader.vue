<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    fullscreen?: boolean;
    message?: string;
  }>(),
  { fullscreen: true, message: 'Loading…' },
);
</script>

<template>
  <div
    class="z-50 flex items-center justify-center bg-white/80"
    :class="[
      fullscreen
        ? 'fixed inset-0'
        : 'absolute inset-0 rounded-lg border border-gray-200',
    ]"
  >
    <div class="flex flex-col items-center gap-3">
      <UiAppSpinner size="lg" />
      <span class="text-base font-medium text-gray-700">{{ message }}</span>
    </div>
  </div>
</template>
