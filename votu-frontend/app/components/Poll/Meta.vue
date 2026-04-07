<script setup lang="ts">
import type { PollStatus } from '~/types/poll';
import type { UserSummary } from '~/types/user';
import { formatDate, formatRelativeDate } from '~/utils/formatDate';

const props = defineProps<{
  createdBy: UserSummary;
  createdAt: string;
  expiresAt: string | null;
  status: PollStatus;
}>();

const expiresLabel = computed(() => {
  if (!props.expiresAt) return null;
  const prefix = props.status === 'closed' ? 'Closed' : 'Expires';
  return `${prefix} ${formatRelativeDate(props.expiresAt)}`;
});
</script>

<template>
  <div
    class="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-500"
  >
    <UserAvatar
      :display-name="createdBy.displayName"
      :avatar-url="createdBy.avatarUrl"
      size="sm"
    />
    <span>{{ createdBy.displayName }}</span>
    <span aria-hidden="true">&middot;</span>
    <time :datetime="createdAt" :title="formatDate(createdAt)">
      {{ formatRelativeDate(createdAt) }}
    </time>
    <template v-if="expiresLabel && expiresAt">
      <span aria-hidden="true">&middot;</span>
      <time :datetime="expiresAt" :title="formatDate(expiresAt)">
        {{ expiresLabel }}
      </time>
    </template>
  </div>
</template>
