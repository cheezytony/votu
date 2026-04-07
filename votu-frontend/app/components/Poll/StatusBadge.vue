<script setup lang="ts">
import type { PollStatus } from '~/types/poll';

defineProps<{ status: PollStatus }>();

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger';

const variantMap: Record<PollStatus, BadgeVariant> = {
  draft: 'default',
  active: 'success',
  closed: 'warning',
};

const labelMap: Record<PollStatus, string> = {
  draft: 'Draft',
  active: 'Active',
  closed: 'Closed',
};
</script>

<template>
  <UiAppBadge :variant="variantMap[status]">
    {{ labelMap[status] }}
  </UiAppBadge>
</template>
