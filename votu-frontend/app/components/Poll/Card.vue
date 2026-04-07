<script setup lang="ts">
import type { PollSummary } from '~/types/poll';

defineProps<{ poll: PollSummary }>();
</script>

<template>
  <article
    class="rounded-xl border border-gray-200 bg-white p-0 shadow-sm transition-shadow hover:shadow-md"
  >
    <!-- Status banner -->
    <div
      v-if="poll.status === 'draft'"
      class="flex items-center gap-2 rounded-t-xl bg-yellow-50 px-5 py-3 border-b border-yellow-100"
    >
      <svg
        class="h-5 w-5 text-yellow-500"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          stroke-width="2"
          fill="none"
        />
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M12 8v4m0 4h.01"
        />
      </svg>
      <span class="font-semibold text-yellow-800"
        >Draft — Not yet published</span
      >
    </div>
    <div
      v-else-if="poll.status === 'active'"
      class="flex items-center gap-2 rounded-t-xl bg-green-50 px-5 py-3 border-b border-green-100"
    >
      <svg
        class="h-5 w-5 text-green-600"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          stroke-width="2"
          fill="none"
        />
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M9 12l2 2 4-4"
        />
      </svg>
      <span class="font-semibold text-green-800">Active — Open for voting</span>
    </div>
    <div
      v-else
      class="flex items-center gap-2 rounded-t-xl bg-gray-100 px-5 py-3 border-b border-gray-200"
    >
      <svg
        class="h-5 w-5 text-gray-500"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          stroke-width="2"
          fill="none"
        />
        <path stroke-linecap="round" stroke-linejoin="round" d="M8 12h8" />
      </svg>
      <span class="font-semibold text-gray-700">Closed — Voting ended</span>
    </div>

    <!-- Title + link -->
    <div class="flex items-start justify-between gap-3 px-5 pt-4">
      <NuxtLink :to="`/polls/${poll.reference}`" class="group min-w-0 flex-1">
        <h2
          class="truncate text-base font-semibold text-gray-900 group-hover:text-indigo-600"
        >
          {{ poll.title }}
        </h2>
      </NuxtLink>
    </div>

    <!-- Optional description -->
    <p
      v-if="poll.description"
      class="mt-1 px-5 line-clamp-2 text-sm text-gray-600"
    >
      {{ poll.description }}
    </p>

    <!-- Meta: creator + timestamps -->
    <div class="mt-3 px-5">
      <PollMeta
        :created-by="poll.createdBy"
        :created-at="poll.createdAt"
        :expires-at="poll.expiresAt"
        :status="poll.status"
      />
    </div>

    <!-- Stats row -->
    <div
      class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 px-5 pb-4 text-sm text-gray-500"
    >
      <span>
        {{ poll.votesCount }} {{ poll.votesCount === 1 ? 'vote' : 'votes' }}
      </span>
      <span>
        {{ poll.optionsCount }}
        {{ poll.optionsCount === 1 ? 'option' : 'options' }}
      </span>

      <template v-if="poll.myVote !== undefined">
        <span
          v-if="poll.myVote"
          class="flex items-center gap-1 font-medium text-indigo-600"
        >
          <svg
            class="h-4 w-4"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fill-rule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clip-rule="evenodd"
            />
          </svg>
          Voted: {{ poll.myVote.optionLabel }}
        </span>
        <span v-else class="text-gray-400">Not voted</span>
      </template>
    </div>
  </article>
</template>
