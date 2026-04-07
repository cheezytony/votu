<script setup lang="ts">
import type { Poll } from '~/types/poll';

const props = defineProps<{
  poll: Poll;
  loading?: boolean;
}>();

const emit = defineEmits<{
  submit: [optionId: string];
}>();

// Pre-select only when already voted; empty string = nothing selected.
const selected = ref<string>(props.poll.myVote?.optionId ?? '');

const isChanging = computed(
  () => props.poll.myVote !== null && props.poll.myVote !== undefined,
);

// Only enable submit when a selection is made AND it differs from the current vote.
const canSubmit = computed(
  () => selected.value !== '' && selected.value !== props.poll.myVote?.optionId,
);

// Active options only (disabled ones are already filtered by the backend for
// active/closed polls, but we guard here too as a safety net).
const activeOptions = computed(() =>
  props.poll.options.filter((o) => o.status === 'active'),
);

function handleSubmit() {
  if (!canSubmit.value) return;
  emit('submit', selected.value);
}
</script>

<template>
  <!--
    Three-state guard:
      poll.myVote === undefined → unauthenticated → render nothing
      poll.myVote === null      → can cast a vote
      poll.myVote is MyVote    → already voted
  -->
  <div v-if="poll.myVote !== undefined">
    <!-- Already voted + cannot change → read-only message -->
    <template v-if="poll.myVote !== null && !poll.canChangeOption">
      <p class="rounded-lg bg-indigo-50 px-4 py-3 text-sm text-indigo-700">
        You voted for
        <span class="font-semibold">{{ poll.myVote.optionLabel }}</span
        >.
      </p>
    </template>

    <!-- Can vote or change vote -->
    <template v-else>
      <form @submit.prevent="handleSubmit">
        <fieldset :disabled="loading">
          <legend class="mb-3 text-sm font-semibold text-gray-700">
            {{ isChanging ? 'Change your vote' : 'Cast your vote' }}
          </legend>

          <div class="space-y-2">
            <label
              v-for="opt in activeOptions"
              :key="opt.id"
              class="flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors"
              :class="
                selected === opt.id
                  ? 'border-indigo-400 bg-indigo-50'
                  : 'border-gray-200 bg-white hover:border-indigo-200 hover:bg-indigo-50/40'
              "
            >
              <input
                v-model="selected"
                type="radio"
                :value="opt.id"
                class="accent-indigo-600"
              />
              <span class="text-sm font-medium text-gray-900">{{
                opt.label
              }}</span>
            </label>
          </div>

          <button
            type="submit"
            class="mt-4 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="loading || !canSubmit"
          >
            <span v-if="loading">Submitting…</span>
            <span v-else>{{ isChanging ? 'Change vote' : 'Cast vote' }}</span>
          </button>
        </fieldset>
      </form>
    </template>
  </div>
</template>
