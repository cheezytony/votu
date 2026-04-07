<script setup lang="ts">
defineProps<{
  title: string;
}>();
</script>

<template>
  <div
    class="flex flex-col items-center justify-center gap-4 py-16 text-center"
  >
    <div v-if="$slots.illustration" class="text-gray-300">
      <slot name="illustration" />
    </div>

    <p class="text-lg font-medium text-gray-600">{{ title }}</p>

    <div v-if="$slots.cta">
      <slot name="cta" />
    </div>
  </div>
</template>
