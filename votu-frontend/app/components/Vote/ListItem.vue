<script setup lang="ts">
import type { Vote } from '~/types/vote';
import { formatDate, formatRelativeDate } from '~/utils/formatDate';

defineProps<{ vote: Vote }>();
</script>

<template>
  <li class="flex items-center gap-3 py-3">
    <UserAvatar
      :display-name="vote.voter.displayName"
      :avatar-url="vote.voter.avatarUrl"
      size="sm"
    />
    <div class="min-w-0 flex-1">
      <p class="truncate text-sm font-medium text-gray-900">
        {{ vote.voter.displayName }}
      </p>
      <p class="truncate text-xs text-gray-500">{{ vote.option.label }}</p>
    </div>
    <time
      class="shrink-0 text-xs text-gray-400"
      :datetime="vote.createdAt"
      :title="formatDate(vote.createdAt)"
    >
      {{ formatRelativeDate(vote.createdAt) }}
    </time>
  </li>
</template>
