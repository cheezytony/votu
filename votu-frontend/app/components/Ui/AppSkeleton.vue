<script setup lang="ts">
withDefaults(
  defineProps<{
    height?: string;
    width?: string;
    rounded?: boolean;
  }>(),
  { height: '1rem', width: '100%', rounded: false },
);
</script>

<template>
  <div
    role="presentation"
    aria-hidden="true"
    class="animate-pulse bg-gray-200"
    :class="rounded ? 'rounded-full' : 'rounded'"
    :style="{ height, width }"
  />
</template>
