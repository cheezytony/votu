<script setup lang="ts">
const props = defineProps<{
  page: number;
  limit: number;
  total: number;
}>();

const emit = defineEmits<{ 'update:page': [page: number] }>();

const totalPages = computed(() => Math.ceil(props.total / props.limit));
const hasPrev = computed(() => props.page > 1);
const hasNext = computed(() => props.page < totalPages.value);

const visiblePages = computed(() => {
  const pages: number[] = [];
  const range = 2;
  const start = Math.max(1, props.page - range);
  const end = Math.min(totalPages.value, props.page + range);
  for (let i = start; i <= end; i++) pages.push(i);
  return pages;
});
</script>

<template>
  <nav
    v-if="totalPages > 1"
    aria-label="Pagination"
    class="flex items-center justify-center gap-1"
  >
    <button
      class="rounded px-3 py-1.5 text-sm font-medium disabled:opacity-40"
      :class="hasPrev ? 'hover:bg-gray-100' : 'cursor-not-allowed'"
      :disabled="!hasPrev"
      aria-label="Previous page"
      @click="emit('update:page', page - 1)"
    >
      ‹
    </button>

    <template v-for="p in visiblePages" :key="p">
      <button
        class="rounded px-3 py-1.5 text-sm font-medium"
        :class="p === page ? 'bg-indigo-600 text-white' : 'hover:bg-gray-100'"
        :aria-current="p === page ? 'page' : undefined"
        @click="emit('update:page', p)"
      >
        {{ p }}
      </button>
    </template>

    <button
      class="rounded px-3 py-1.5 text-sm font-medium disabled:opacity-40"
      :class="hasNext ? 'hover:bg-gray-100' : 'cursor-not-allowed'"
      :disabled="!hasNext"
      aria-label="Next page"
      @click="emit('update:page', page + 1)"
    >
      ›
    </button>
  </nav>
</template>
