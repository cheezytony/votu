<script setup lang="ts">
export interface PollFormOption {
  label: string;
  description: string;
}

export interface PollFormData {
  title: string;
  description: string | null;
  canChangeOption: boolean;
  expiresAt: string | null; // ISO 8601 string or null
  options: Array<{
    reference?: string;
    label: string;
    description: string | null;
  }>;
}

interface InitialValues {
  title?: string;
  description?: string | null;
  canChangeOption?: boolean;
  expiresAt?: string | null;
  options?: Array<{
    reference?: string;
    label: string;
    description: string | null;
  }>;
}

const props = withDefaults(
  defineProps<{
    initialValues?: InitialValues;
    loading?: boolean;
    submitLabel?: string;
  }>(),
  { loading: false, submitLabel: 'Create poll' },
);

const emit = defineEmits<{
  submit: [data: PollFormData];
}>();

// ─── Form state ────────────────────────────────────────────────────────────

const title = ref(props.initialValues?.title ?? '');
const description = ref(props.initialValues?.description ?? '');
const canChangeOption = ref(props.initialValues?.canChangeOption ?? false);

// Store as a datetime-local string (YYYY-MM-DDTHH:mm) for the input value.
const expiresAtLocal = ref(
  props.initialValues?.expiresAt
    ? isoToDatetimeLocal(props.initialValues.expiresAt)
    : '',
);

interface FormOption {
  reference?: string;
  label: string;
  description: string;
}

const options = ref<FormOption[]>(
  props.initialValues?.options?.map((o) => ({
    reference: o.reference,
    label: o.label,
    description: o.description ?? '',
  })) ?? [
    { label: '', description: '' },
    { label: '', description: '' },
  ],
);

// ─── Options list management ───────────────────────────────────────────────

const MIN_OPTIONS = 2;
const MAX_OPTIONS = 20;

const canRemove = computed(() => options.value.length > MIN_OPTIONS);
const canAdd = computed(() => options.value.length < MAX_OPTIONS);

function addOption() {
  if (canAdd.value) options.value.push({ label: '', description: '' });
}

function removeOption(index: number) {
  if (canRemove.value) options.value.splice(index, 1);
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function isoToDatetimeLocal(iso: string): string {
  // Convert ISO 8601 to YYYY-MM-DDTHH:mm (local, no seconds) for datetime-local input.
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ─── Submit ────────────────────────────────────────────────────────────────

function handleSubmit() {
  emit('submit', {
    title: title.value.trim(),
    description: description.value.trim() || null,
    canChangeOption: canChangeOption.value,
    expiresAt: expiresAtLocal.value
      ? new Date(expiresAtLocal.value).toISOString()
      : null,
    options: options.value.map((o) => ({
      ...(o.reference ? { reference: o.reference } : {}),
      label: o.label.trim(),
      description: o.description.trim() || null,
    })),
  });
}
</script>

<template>
  <form class="space-y-6" @submit.prevent="handleSubmit">
    <!-- Title -->
    <div>
      <label
        for="poll-title"
        class="mb-1.5 block text-sm font-medium text-gray-800"
      >
        Title <span class="text-red-500" aria-hidden="true">*</span>
      </label>
      <input
        id="poll-title"
        v-model="title"
        type="text"
        required
        maxlength="200"
        placeholder="What would you like to ask?"
        class="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
      />
    </div>

    <!-- Description -->
    <div>
      <label
        for="poll-description"
        class="mb-1.5 flex items-center gap-2 text-sm font-medium text-gray-800"
      >
        Description
        <span
          class="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-normal text-gray-500"
          >optional</span
        >
      </label>
      <textarea
        id="poll-description"
        v-model="description"
        rows="3"
        placeholder="Add any context that helps people understand the question…"
        class="w-full resize-none rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
      />
    </div>

    <!-- Divider: Options -->
    <div class="relative pt-2">
      <div class="absolute inset-0 flex items-center" aria-hidden="true">
        <div class="w-full border-t border-gray-100" />
      </div>
      <div class="relative flex items-center justify-between">
        <span
          class="bg-white pr-3 text-xs font-semibold uppercase tracking-wider text-gray-400"
        >
          Options
        </span>
        <span class="bg-white pl-3 text-xs text-gray-400">
          {{ options.length }} / {{ MAX_OPTIONS }}
        </span>
      </div>
    </div>

    <!-- Options list -->
    <div class="space-y-3">
      <div
        v-for="(opt, idx) in options"
        :key="idx"
        class="group rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-indigo-200"
      >
        <!-- Option header -->
        <div class="mb-3 flex items-center justify-between">
          <span
            class="inline-flex h-5 w-5 items-center justify-center rounded-full bg-indigo-50 text-xs font-bold text-indigo-600"
          >
            {{ idx + 1 }}
          </span>
          <button
            v-if="canRemove"
            type="button"
            class="rounded-md p-1 text-gray-300 opacity-0 transition-all group-hover:opacity-100 hover:bg-red-50 hover:text-red-400"
            :aria-label="`Remove option ${idx + 1}`"
            @click="removeOption(idx)"
          >
            <svg
              class="h-4 w-4"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fill-rule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clip-rule="evenodd"
              />
            </svg>
          </button>
        </div>

        <div class="space-y-2">
          <input
            v-model="opt.label"
            type="text"
            required
            placeholder="Label"
            class="w-full rounded-lg border border-gray-200 px-3.5 py-2 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
          <input
            v-model="opt.description"
            type="text"
            placeholder="Description (optional)"
            class="w-full rounded-lg border border-gray-100 bg-gray-50 px-3.5 py-2 text-sm text-gray-700 placeholder:text-gray-400 transition focus:border-indigo-300 focus:bg-white focus:outline-none"
          />
        </div>
      </div>
    </div>

    <!-- Add option button -->
    <button
      v-if="canAdd"
      type="button"
      class="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 py-3 text-sm font-medium text-gray-500 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600"
      @click="addOption"
    >
      <svg
        class="h-4 w-4"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          fill-rule="evenodd"
          d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
          clip-rule="evenodd"
        />
      </svg>
      Add option
    </button>

    <!-- Divider: Settings -->
    <div class="relative pt-2">
      <div class="absolute inset-0 flex items-center" aria-hidden="true">
        <div class="w-full border-t border-gray-100" />
      </div>
      <div class="relative">
        <span
          class="bg-white pr-3 text-xs font-semibold uppercase tracking-wider text-gray-400"
        >
          Settings
        </span>
      </div>
    </div>

    <!-- Expires at -->
    <div>
      <label
        for="poll-expires"
        class="mb-1.5 flex items-center gap-2 text-sm font-medium text-gray-800"
      >
        Expires at
        <span
          class="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-normal text-gray-500"
          >optional</span
        >
      </label>
      <input
        id="poll-expires"
        v-model="expiresAtLocal"
        type="datetime-local"
        class="w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
      />
    </div>

    <!-- Can change vote toggle -->
    <label
      class="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-indigo-200"
    >
      <input
        v-model="canChangeOption"
        type="checkbox"
        class="mt-0.5 h-4 w-4 shrink-0 rounded accent-indigo-600"
      />
      <div>
        <p class="text-sm font-medium text-gray-800">
          Allow voters to change their vote
        </p>
        <p class="mt-0.5 text-xs text-gray-500">
          Voters can update their selection after submitting
        </p>
      </div>
    </label>

    <!-- Submit -->
    <button
      type="submit"
      class="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
      :disabled="loading"
    >
      <svg
        v-if="loading"
        class="h-4 w-4 animate-spin"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <circle
          class="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          stroke-width="4"
        />
        <path
          class="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
        />
      </svg>
      {{ loading ? 'Saving…' : submitLabel }}
    </button>
  </form>
</template>
