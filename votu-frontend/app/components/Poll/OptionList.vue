<script setup lang="ts">
import type { PollOption } from '~/types/poll';
import { formatPercentage } from '~/utils/formatDate';

defineProps<{
  options: PollOption[];
  votesCount: number;
  /** optionId the current user voted for (undefined = unauthenticated, null = not voted) */
  myVoteOptionId?: string | null;
}>();
</script>

<template>
  <ul class="space-y-3" aria-label="Poll options">
    <template v-for="option in options" :key="option.id">
      <li>
        <NuxtLink :to="`/poll-options/${option.reference}`" class="overflow-hidden rounded-lg border p-3 block" :class="myVoteOptionId === option.id
          ? 'border-indigo-300 bg-indigo-50'
          : 'border-gray-200 bg-white'
          ">
          <div class="flex items-center justify-between gap-2 text-sm">
            {{ option.label }}

            <span class="shrink-0 text-gray-500">
              {{ formatPercentage(option.percentage) }}
              <span class="ml-0.5 text-xs text-gray-400">({{ option.votesCount }})</span>
            </span>
          </div>

          <!-- Percentage bar -->
          <div class="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-200" aria-hidden="true">
            <div class="h-full rounded-full transition-all duration-500" :class="myVoteOptionId === option.id ? 'bg-indigo-500' : 'bg-gray-400'
              " :style="{ width: `${option.percentage}%` }" />
          </div>

          <p v-if="option.description" class="mt-1 text-xs text-gray-500">
            {{ option.description }}
          </p>
        </NuxtLink>
      </li>
    </template>
  </ul>

  <p v-if="votesCount > 0" class="mt-2 text-right text-xs text-gray-400">
    {{ votesCount }} {{ votesCount === 1 ? 'vote' : 'votes' }} total
  </p>
</template>
