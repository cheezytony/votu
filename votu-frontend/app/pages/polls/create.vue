<script setup lang="ts">
import type { PollFormData } from '~/components/Poll/Form.vue';
import { useApiMutation } from '~/composables/api';
import type { Poll } from '~/types/poll';

definePageMeta({ middleware: 'auth' });

useSeoMeta({ title: 'Create poll — Votu' });

const { add: addToast } = useToast();
const invalidate = useInvalidateQuery();

const mutation = useApiMutation<PollFormData, Poll>({
  request: { url: '/polls', method: 'POST' },
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
    const poll = await mutation.mutateAsync(data);
    await invalidate(['polls']);
    addToast({ message: 'Poll created!', variant: 'success' });
    await navigateTo(`/polls/${poll.reference}`);
  } catch {
    // error is exposed reactively via mutation.error
  }
}
</script>

<template>
  <div class="mx-auto max-w-xl px-4 py-10">
    <!-- Page heading -->
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900">Create a poll</h1>
      <p class="mt-1 text-sm text-gray-500">
        Write a question, add your options, then activate it when ready.
      </p>
    </div>

    <!-- Card -->
    <div class="rounded-2xl border border-gray-200 bg-white p-7 shadow-sm">
      <UiAppAlert v-if="error" variant="error" class="mb-6">
        {{ error }}
      </UiAppAlert>

      <PollForm
        :loading="mutation.isPending.value"
        submit-label="Create poll"
        @submit="handleSubmit"
      />
    </div>
  </div>
</template>
