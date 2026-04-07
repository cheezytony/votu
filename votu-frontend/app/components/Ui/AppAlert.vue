<script setup lang="ts">
type Variant = 'info' | 'success' | 'error';

const props = withDefaults(defineProps<{ variant?: Variant }>(), {
  variant: 'info',
});

const styles: Record<Variant, string> = {
  info: 'bg-blue-50 border-blue-300 text-blue-800',
  success: 'bg-green-50 border-green-300 text-green-800',
  error: 'bg-red-50 border-red-300 text-red-800',
};
</script>

<template>
  <div
    role="alert"
    class="rounded-md border px-4 py-3 text-sm"
    :class="styles[props.variant]"
  >
    <slot />
  </div>
</template>
