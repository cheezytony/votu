<script setup lang="ts">
type Variant = 'default' | 'success' | 'warning' | 'danger';

const props = withDefaults(defineProps<{ variant?: Variant }>(), {
  variant: 'default',
});

const classes: Record<Variant, string> = {
  default: 'bg-gray-100 text-gray-700',
  success: 'bg-green-100 text-green-700',
  warning: 'bg-yellow-100 text-yellow-800',
  danger: 'bg-red-100 text-red-700',
};
</script>

<template>
  <span
    class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
    :class="classes[props.variant]"
  >
    <slot />
  </span>
</template>
