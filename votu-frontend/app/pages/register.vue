<script setup lang="ts">
import type { RegisterPayload } from '~/composables/useAuth';
import type { ApiError } from '~/types/api';

definePageMeta({
  layout: 'auth',
  middleware: 'guest',
});

useSeoMeta({ title: 'Create account — Votu' });

const { register } = useAuth();

const form = reactive<RegisterPayload>({
  firstName: '',
  middleName: '',
  lastName: '',
  email: '',
  password: '',
});

const pending = ref(false);
const error = ref<string | null>(null);

async function submit() {
  error.value = null;
  pending.value = true;

  // Strip empty optional fields before sending
  const payload: RegisterPayload = {
    firstName: form.firstName,
    lastName: form.lastName,
    email: form.email,
    password: form.password,
    ...(form.middleName ? { middleName: form.middleName } : {}),
  };

  try {
    await register(payload);
    await navigateTo('/');
  } catch (err: unknown) {
    const apiErr = err as ApiError;
    error.value = Array.isArray(apiErr.message)
      ? apiErr.message.join(' · ')
      : (apiErr.message ?? 'Registration failed. Please try again.');
  } finally {
    pending.value = false;
  }
}
</script>

<template>
  <div>
    <h1 class="mb-6 text-center text-2xl font-bold text-gray-800">
      Create your account
    </h1>

    <UiAppAlert v-if="error" variant="error" class="mb-4">
      {{ error }}
    </UiAppAlert>

    <form class="flex flex-col gap-4" novalidate @submit.prevent="submit">
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label
            for="firstName"
            class="mb-1 block text-sm font-medium text-gray-700"
            >First name</label
          >
          <input
            id="firstName"
            v-model="form.firstName"
            type="text"
            autocomplete="given-name"
            required
            class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label
            for="lastName"
            class="mb-1 block text-sm font-medium text-gray-700"
            >Last name</label
          >
          <input
            id="lastName"
            v-model="form.lastName"
            type="text"
            autocomplete="family-name"
            required
            class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>

      <div>
        <label
          for="middleName"
          class="mb-1 block text-sm font-medium text-gray-700"
        >
          Middle name <span class="font-normal text-gray-400">(optional)</span>
        </label>
        <input
          id="middleName"
          v-model="form.middleName"
          type="text"
          autocomplete="additional-name"
          class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      <div>
        <label for="email" class="mb-1 block text-sm font-medium text-gray-700"
          >Email</label
        >
        <input
          id="email"
          v-model="form.email"
          type="email"
          autocomplete="email"
          required
          class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          placeholder="you@example.com"
        />
      </div>

      <div>
        <label
          for="password"
          class="mb-1 block text-sm font-medium text-gray-700"
          >Password</label
        >
        <input
          id="password"
          v-model="form.password"
          type="password"
          autocomplete="new-password"
          required
          class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          placeholder="••••••••"
        />
      </div>

      <button
        type="submit"
        :disabled="pending"
        class="flex w-full items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
      >
        <UiAppSpinner v-if="pending" size="sm" class="mr-2" />
        Create account
      </button>
    </form>

    <p class="mt-4 text-center text-sm text-gray-500">
      Already have an account?
      <NuxtLink to="/login" class="font-medium text-indigo-600 hover:underline">
        Log in
      </NuxtLink>
    </p>
  </div>
</template>
