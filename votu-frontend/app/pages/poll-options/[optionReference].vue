<script setup lang="ts">
import { useApiQueryRequest } from '~/composables/api';
import type { Paginated } from '~/types/api';
import type { Poll, PollOption } from '~/types/poll';
import type { Vote } from '~/types/vote';

const route = useRoute();
const optionReference = route.params.optionReference as string;

const page = ref(1);

const optionQuery = useApiQueryRequest<PollOption>({
  queryKey: ['poll-option', optionReference],
  request: { url: `/polls/options/ref/${optionReference}` },
});

const votersQuery = useApiQueryRequest<Paginated<Vote>>({
  queryKey: ['votes', 'option', optionReference],
  request: () => ({
    url: '/votes',
    query: { pollOptionReference: optionReference, page: page.value, limit: 20 },
  }),
});

const option = computed(() => optionQuery.data.value ?? null);
const poll = computed(() => (option.value?.poll as Poll | undefined) ?? null);
const creator = computed(() => poll.value?.createdBy ?? null);
const voters = computed(() => votersQuery.data.value?.data ?? []);
const meta = computed(() => votersQuery.data.value?.meta ?? null);
const votesCount = computed(() => meta.value?.total ?? 0);
const pending = computed(() => optionQuery.isPending.value || votersQuery.isPending.value);

function setPage(p: number) {
  page.value = p;
}
</script>

<template>
  <div class="mx-auto max-w-2xl px-4 py-8">
    <template v-if="pending">
      <UiAppSkeleton height="2rem" width="70%" />
      <UiAppSkeleton height="1rem" width="40%" />
      <UiAppSkeleton height="1rem" />
      <UiAppSkeleton height="1rem" width="85%" />
    </template>

    <template v-else-if="option && poll && creator">
      <h1 class="text-2xl font-bold mb-2">Option: {{ option.label }}</h1>

      <p v-if="option.description" class="mb-2 text-gray-700">{{ option.description }}</p>

      <div class="mb-4">
        <span class="font-semibold">Poll: </span>
        <NuxtLink :to="`/polls/${poll.reference}`" class="text-indigo-600 hover:underline">{{ poll.title }}</NuxtLink>
      </div>

      <div class="mb-4">
        <span class="font-semibold">Created by: </span>
        <UserAvatar :display-name="creator.displayName" :avatar-url="creator.avatarUrl"
          class="inline-block align-middle mr-2" />
        <span>{{ creator.displayName }}</span>
      </div>

      <div class="mb-6">
        <span class="font-semibold">Votes for this option <strong>({{ votesCount }})</strong>:</span>
        <ul v-if="voters.length > 0" class="divide-y divide-gray-100 mt-2">
          <VoteListItem v-for="vote in voters" :key="vote.id" :vote="vote" />
        </ul>

        <UiAppEmptyState v-else title="No votes for this option yet." />

        <div v-if="meta" class="mt-4">
          <UiAppPagination :page="meta.page" :limit="meta.limit" :total="meta.total" @update:page="setPage" />
        </div>
      </div>
    </template>
    <template v-else>
      <UiAppEmptyState title="Option not found." />
    </template>
  </div>
</template>
