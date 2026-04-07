<script setup lang="ts">
import { useInvalidateQuery } from '~/composables/api';
import type { ApiError } from '~/types/api';
import { canActivate, isEditable } from '~/utils/pollHelpers';

const route = useRoute();
const reference = route.params.id as string;

const { poll, pending, notFound, castVote, changeVote, activate } =
  usePoll(reference);
const invalidate = useInvalidateQuery();
const authStore = useAuthStore();
const { add: addToast } = useToast();

useSeoMeta({
  title: () => poll.value?.title ?? 'Poll',
  description: () => poll.value?.description ?? '',
  ogTitle: () => poll.value?.title ?? 'Poll',
  ogDescription: () => poll.value?.description ?? '',
});

const showActivate = computed(
  () =>
    poll.value !== null &&
    poll.value !== undefined &&
    authStore.user !== null &&
    canActivate(poll.value, authStore.user.id),
);

const showVoteForm = computed(
  () =>
    poll.value !== null &&
    poll.value !== undefined &&
    poll.value.status === 'active' &&
    poll.value.myVote !== undefined,
);

const showLoginPrompt = computed(
  () =>
    poll.value !== null &&
    poll.value !== undefined &&
    poll.value.status === 'active' &&
    poll.value.myVote === undefined,
);

const voteLoading = ref(false);
const voteError = ref<string | null>(null);
const activateLoading = ref(false);
const activateError = ref<string | null>(null);

async function handleVote(optionId: string) {
  if (!poll.value) return;

  voteLoading.value = true;
  voteError.value = null;

  try {
    if (poll.value.myVote === null) {
      await castVote(optionId);
    } else {
      await changeVote(optionId);
    }

    await invalidate(['votes']);
    addToast({ message: 'Your vote has been recorded.', variant: 'success' });
  } catch (err: unknown) {
    const apiErr = err as ApiError;

    voteError.value =
      typeof apiErr.message === 'string'
        ? apiErr.message
        : (apiErr.message[0] ?? 'An error occurred.');
  } finally {
    voteLoading.value = false;
  }
}

async function handleActivate() {
  if (!poll.value) return;

  activateLoading.value = true;
  activateError.value = null;

  try {
    await activate(poll.value.id);

    addToast({ message: 'Poll is now active!', variant: 'success' });
  } catch (err: unknown) {
    const apiErr = err as ApiError;

    activateError.value =
      typeof apiErr.message === 'string'
        ? apiErr.message
        : (apiErr.message[0] ?? 'An error occurred.');
  } finally {
    activateLoading.value = false;
  }
}
</script>

<template>
  <div class="mx-auto max-w-2xl px-4 py-8">
    <!-- Back link -->
    <NuxtLink
      to="/"
      class="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
    >
      <svg
        class="h-4 w-4"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          fill-rule="evenodd"
          d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
          clip-rule="evenodd"
        />
      </svg>
      Back to polls
    </NuxtLink>

    <!-- Loading skeleton -->
    <template v-if="pending">
      <div class="mt-6 space-y-4">
        <UiAppSkeleton height="2rem" width="70%" />
        <UiAppSkeleton height="1rem" width="40%" />
        <UiAppSkeleton height="1rem" />
        <UiAppSkeleton height="1rem" width="85%" />
      </div>
    </template>

    <!-- Not found -->
    <UiAppEmptyState v-else-if="notFound" class="mt-12" title="Poll not found">
      <template #cta>
        <NuxtLink
          to="/"
          class="text-sm font-medium text-indigo-600 hover:underline"
        >
          Browse all polls
        </NuxtLink>
      </template>
    </UiAppEmptyState>

    <!-- Poll detail -->
    <template v-else-if="poll">
      <div class="mt-6 space-y-6">
        <!-- Status banner -->
        <div>
          <div
            v-if="poll.status === 'draft'"
            class="flex items-center gap-2 rounded-t-xl bg-yellow-50 py-3 border-b border-yellow-100"
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
            class="flex items-center gap-2 rounded-t-xl bg-green-50 py-3 border-b border-green-100"
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
            <span class="font-semibold text-green-800"
              >Active — Open for voting</span
            >
          </div>
          <div
            v-else
            class="flex items-center gap-2 rounded-t-xl bg-gray-100 py-3 border-b border-gray-200"
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
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M8 12h8"
              />
            </svg>
            <span class="font-semibold text-gray-700"
              >Closed — Voting ended</span
            >
          </div>

          <!-- Header -->
          <div class="flex flex-wrap items-start gap-3 pt-4">
            <h1 class="flex-1 text-2xl font-bold text-gray-900">
              {{ poll.title }}
            </h1>
          </div>

          <div class="mt-2">
            <PollMeta
              :created-by="poll.createdBy"
              :created-at="poll.createdAt"
              :expires-at="poll.expiresAt"
              :status="poll.status"
            />
          </div>

          <p v-if="poll.description" class="mt-3 text-gray-700">
            {{ poll.description }}
          </p>

          <p v-if="poll.reference" class="mt-2 text-sm text-gray-500">
            Reference:
            <a
              :href="poll.reference"
              target="_blank"
              rel="noopener noreferrer"
              class="break-all text-indigo-600 hover:underline"
              >{{ poll.reference }}</a
            >
          </p>
        </div>

        <!-- Actions: activate + edit (for draft polls) -->
        <div
          v-if="showActivate || isEditable(poll)"
          class="flex flex-wrap gap-3"
        >
          <button
            v-if="showActivate"
            type="button"
            class="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            :disabled="activateLoading"
            @click="handleActivate"
          >
            <span v-if="activateLoading">Activating…</span>
            <span v-else>Activate poll</span>
          </button>

          <NuxtLink
            v-if="isEditable(poll) && authStore.user?.id === poll.createdBy.id"
            :to="`/polls/${poll.reference}/edit`"
            class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Edit poll
          </NuxtLink>
        </div>

        <UiAppAlert v-if="activateError" variant="error">
          {{ activateError }}
        </UiAppAlert>

        <!-- Options / vote distribution -->
        <section aria-labelledby="options-heading">
          <h2
            id="options-heading"
            class="mb-3 text-base font-semibold text-gray-900"
          >
            Options
          </h2>
          <PollOptionList
            :options="poll.options"
            :votes-count="poll.votesCount"
            :my-vote-option-id="poll.myVote?.optionId"
          />
        </section>

        <!-- Vote form (authenticated + active poll only) -->
        <section v-if="showVoteForm" aria-labelledby="vote-heading">
          <h2 id="vote-heading" class="sr-only">Vote</h2>
          <UiAppAlert v-if="voteError" variant="error" class="mb-3">
            {{ voteError }}
          </UiAppAlert>

          <PollVoteForm
            :poll="poll"
            :loading="voteLoading"
            @submit="handleVote"
          />
        </section>

        <!-- Login prompt for unauthenticated users on active polls -->
        <div
          v-else-if="showLoginPrompt"
          class="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-700"
        >
          <NuxtLink to="/login" class="font-medium underline">Sign in</NuxtLink>
          to cast your vote.
        </div>

        <!-- Login prompt for unauthenticated users on active polls -->
        <div
          v-else-if="poll.status === 'active' && poll.myVote === undefined"
          class="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-700"
        >
          <NuxtLink to="/login" class="font-medium underline">Sign in</NuxtLink>
          to cast your vote.
        </div>

        <!-- Votes list -->
        <section aria-labelledby="votes-heading">
          <h2
            id="votes-heading"
            class="mb-3 text-base font-semibold text-gray-900"
          >
            Votes
            <span class="ml-1 text-sm font-normal text-gray-400">
              ({{ poll.votesCount }})
            </span>
          </h2>
          <VoteList :poll-reference="poll.reference" />
        </section>
      </div>
    </template>
  </div>
</template>
