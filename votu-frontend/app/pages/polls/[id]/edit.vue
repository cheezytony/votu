<script setup lang="ts">
import type { PollFormData } from '~/components/Poll/Form.vue';
import { useApiMutation, useInvalidateQuery } from '~/composables/api';
import type { Poll } from '~/types/poll';

definePageMeta({ middleware: 'auth' });

const route = useRoute();
const reference = route.params.id as string;

const { poll, pending, notFound } = usePoll(reference);
const { add: addToast } = useToast();
const invalidate = useInvalidateQuery();

// Guard: redirect away if the poll is not editable once loaded.
watch(
  [pending, poll, notFound],
  ([isPending, currentPoll, isNotFound]) => {
    if (isPending) return;
    if (isNotFound || (currentPoll && currentPoll.status !== 'draft')) {
      navigateTo(`/polls/${poll.value?.reference ?? reference}`, {
        replace: true,
      });
    }
  },
  { immediate: true },
);

useSeoMeta({ title: () => `Edit "${poll.value?.title ?? 'Poll'}" — Votu` });

const initialValues = computed(() =>
  poll.value
    ? {
        title: poll.value.title,
        description: poll.value.description,
        canChangeOption: poll.value.canChangeOption,
        expiresAt: poll.value.expiresAt,
        options: poll.value.options.map((o) => ({
          reference: o.reference,
          label: o.label,
          description: o.description,
        })),
      }
    : undefined,
);

const mutation = useApiMutation<PollFormData, Poll>({
  request: () => ({
    url: `/polls/${poll.value!.id}`,
    method: 'PATCH',
  }),
});

const error = computed(() => {
  const e = mutation.error.value;
  if (!e) return null;
  return typeof e.message === 'string'
    ? e.message
    : (e.message[0] ?? 'An error occurred.');
});

async function handleSubmit(data: PollFormData) {
  try {
    await mutation.mutateAsync(data);
    await invalidate(['poll', reference]);
    await invalidate(['polls']);
    addToast({ message: 'Poll updated!', variant: 'success' });
    await navigateTo(`/polls/${poll.value?.reference ?? reference}`);
  } catch {
    // error is exposed reactively via mutation.error
  }
}
</script>

<template>
  <div class="mx-auto max-w-xl px-4 py-10">
    <!-- Back link -->
    <NuxtLink
      :to="`/polls/${reference}`"
      class="mb-6 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
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
      Back to poll
    </NuxtLink>

    <!-- Page heading -->
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900">Edit poll</h1>
      <p class="mt-1 text-sm text-gray-500">
        Update your draft before activating it.
      </p>
    </div>

    <!-- Card -->
    <div class="rounded-2xl border border-gray-200 bg-white p-7 shadow-sm">
      <!-- Skeleton while loading -->
      <div v-if="pending" class="space-y-5" aria-hidden="true">
        <UiAppSkeleton height="2.5rem" />
        <UiAppSkeleton height="5rem" />
        <UiAppSkeleton height="2.5rem" />
        <UiAppSkeleton height="10rem" />
        <UiAppSkeleton height="2.5rem" />
      </div>

      <template v-else-if="poll">
        <UiAppAlert v-if="error" variant="error" class="mb-6">
          {{ error }}
        </UiAppAlert>

        <PollForm
          :initial-values="initialValues"
          :loading="mutation.isPending.value"
          submit-label="Save changes"
          @submit="handleSubmit"
        />
      </template>
    </div>
  </div>
</template>
