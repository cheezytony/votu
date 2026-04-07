<script setup lang="ts">
import { usePollStore } from '~/stores/poll';
const props = defineProps<{ pollReference: string }>();

const { votes, meta, pending, setPage } = useVotes(props.pollReference);
const pollStore = usePollStore();
const poll = computed(() => pollStore.poll);
</script>

<template>
  <div>
    <!-- Skeleton -->
    <template v-if="pending">
      <div class="space-y-3">
        <div v-for="n in 5" :key="n" class="flex items-center gap-3">
          <UiAppSkeleton height="2rem" width="2rem" :rounded="true" />
          <div class="flex-1 space-y-1">
            <UiAppSkeleton height="0.875rem" width="40%" />
            <UiAppSkeleton height="0.75rem" width="25%" />
          </div>
        </div>
      </div>
    </template>

    <template v-else>
      <UiAppEmptyState
        v-if="votes.length === 0"
        :title="poll.value && poll.value.status === 'closed' ? 'No votes were cast' : 'No votes cast yet.'"
      />
      <ul v-else class="divide-y divide-gray-100">
        <VoteListItem v-for="vote in votes" :key="vote.id" :vote="vote" />
      </ul>

      <div v-if="meta" class="mt-4">
        <UiAppPagination
          :page="meta.page"
          :limit="meta.limit"
          :total="meta.total"
          @update:page="setPage"
        />
      </div>
    </template>
  </div>
</template>
