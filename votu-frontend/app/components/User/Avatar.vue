<script setup lang="ts">
const props = defineProps<{
  displayName: string;
  avatarUrl: string | null;
  size?: 'sm' | 'md' | 'lg';
}>();

const sizeClasses: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'h-6 w-6 text-xs',
  md: 'h-8 w-8 text-sm',
  lg: 'h-10 w-10 text-base',
};

const resolvedSize = computed(() => props.size ?? 'md');

const initials = computed(() => {
  const parts = props.displayName.trim().split(/\s+/);
  if (parts.length === 1) return (parts[0]?.[0] ?? '?').toUpperCase();
  return (
    (parts[0]?.[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '')
  ).toUpperCase();
});

// Stable colour derived from first char code so re-renders are consistent.
const PALETTE = [
  'bg-red-100 text-red-700',
  'bg-orange-100 text-orange-700',
  'bg-yellow-100 text-yellow-800',
  'bg-green-100 text-green-700',
  'bg-teal-100 text-teal-700',
  'bg-blue-100 text-blue-700',
  'bg-indigo-100 text-indigo-700',
  'bg-purple-100 text-purple-700',
  'bg-pink-100 text-pink-700',
] as const;

const colorClass = computed(
  () => PALETTE[(props.displayName.charCodeAt(0) ?? 0) % PALETTE.length],
);
</script>

<template>
  <span
    class="inline-flex shrink-0 items-center justify-center rounded-full font-medium"
    :class="sizeClasses[resolvedSize]"
  >
    <img
      v-if="avatarUrl"
      :src="avatarUrl"
      :alt="displayName"
      class="h-full w-full rounded-full object-cover"
    />
    <span
      v-else
      class="inline-flex h-full w-full items-center justify-center rounded-full leading-none"
      :class="colorClass"
      aria-hidden="true"
    >
      {{ initials }}
    </span>
  </span>
</template>
