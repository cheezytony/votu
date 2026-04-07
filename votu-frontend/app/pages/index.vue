<script setup lang="ts">
import type { PollStatus } from '~/types/poll';

useSeoMeta({
  title: 'Votu — Vote on anything',
  description: 'Browse and vote on polls that matter.',
});

const { polls, meta, pending, filters, refresh } = usePolls();

// ─── Search ──────────────────────────────────────────────────────────────────

const searchInput = ref(filters.q ?? '');
let searchTimer: ReturnType<typeof setTimeout> | null = null;

watch(searchInput, (val) => {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    const q = val.trim() || undefined;
    if (q !== filters.q) {
      filters.q = q;
      filters.page = 1;
      refresh();
    }
    searchTimer = null;
  }, 300);
});

onBeforeUnmount(() => {
  if (searchTimer) clearTimeout(searchTimer);
});

// ─── Status filter ────────────────────────────────────────────────────────────

const STATUS_OPTIONS: { label: string; value: PollStatus | undefined }[] = [
  { label: 'All', value: undefined },
  { label: 'Active', value: 'active' },
  { label: 'Draft', value: 'draft' },
  { label: 'Closed', value: 'closed' },
];

function setStatus(status: PollStatus | undefined) {
  filters.status = status;
  filters.page = 1;
  refresh();
}

// ─── Pagination ───────────────────────────────────────────────────────────────

function setPage(page: number) {
  filters.page = page;
  refresh();
}
</script>

<template>
  <div class="mx-auto max-w-3xl px-4 py-8">
    <!-- Page heading -->
    <h1 class="text-2xl font-bold text-gray-900">Polls</h1>

    <!-- Toolbar: search + filter -->
    <div class="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
      <!-- Search -->
      <label
        class="flex flex-1 items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500"
      >
        <svg
          class="h-4 w-4 shrink-0 text-gray-400"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fill-rule="evenodd"
            d="M9 3a6 6 0 100 12A6 6 0 009 3zM1 9a8 8 0 1114.32 4.906l3.387 3.387a1 1 0 01-1.414 1.414l-3.387-3.387A8 8 0 011 9z"
            clip-rule="evenodd"
          />
        </svg>
        <input
          v-model="searchInput"
          type="search"
          placeholder="Search polls…"
          aria-label="Search polls"
          class="min-w-0 flex-1 bg-transparent text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none"
        />
      </label>

      <!-- Status tabs -->
      <div
        class="flex items-center gap-1"
        role="group"
        aria-label="Filter by status"
      >
        <button
          v-for="opt in STATUS_OPTIONS"
          :key="String(opt.value)"
          type="button"
          class="rounded-full px-3 py-1.5 text-sm font-medium transition-colors"
          :class="
            filters.status === opt.value
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          "
          :aria-pressed="filters.status === opt.value"
          @click="setStatus(opt.value)"
        >
          {{ opt.label }}
        </button>
      </div>
    </div>

    <!-- Poll list -->
    <div class="mt-6 space-y-4">
      <!-- Skeleton placeholders while loading -->
      <template v-if="pending">
        <div
          v-for="n in 6"
          :key="n"
          class="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
          aria-hidden="true"
        >
          <div class="flex items-start justify-between gap-3">
            <UiAppSkeleton height="1.25rem" width="60%" />
            <UiAppSkeleton height="1.25rem" width="4rem" :rounded="true" />
          </div>
          <div class="mt-3 space-y-2">
            <UiAppSkeleton height="0.875rem" />
            <UiAppSkeleton height="0.875rem" width="75%" />
          </div>
          <div class="mt-3 flex gap-3">
            <UiAppSkeleton height="1.5rem" width="1.5rem" :rounded="true" />
            <UiAppSkeleton height="0.875rem" width="30%" />
          </div>
        </div>
      </template>

      <!-- Empty state -->
      <UiAppEmptyState v-else-if="polls.length === 0" title="No polls found">
        <template #illustration>
          <svg
            class="mx-auto h-12 w-12"
            fill="none"
            viewBox="0 0 48 48"
            aria-hidden="true"
          >
            <circle
              cx="24"
              cy="24"
              r="20"
              stroke="currentColor"
              stroke-width="2"
            />
            <path
              d="M16 24h16M24 16v16"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            />
          </svg>
        </template>
        <template v-if="filters.q || filters.status" #cta>
          <button
            type="button"
            class="text-sm font-medium text-indigo-600 hover:underline"
            @click="
              () => {
                searchInput = '';
                filters.q = undefined;
                filters.status = undefined;
                filters.page = 1;
                refresh();
              }
            "
          >
            Clear filters
          </button>
        </template>
      </UiAppEmptyState>

      <!-- Poll cards -->
      <template v-else>
        <PollCard v-for="poll in polls" :key="poll.id" :poll="poll" />
      </template>
    </div>

    <!-- Pagination -->
    <div v-if="meta && !pending" class="mt-8">
      <UiAppPagination
        :page="meta.page"
        :limit="meta.limit"
        :total="meta.total"
        @update:page="setPage"
      />
    </div>
  </div>
</template>
