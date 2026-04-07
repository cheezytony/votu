<script setup lang="ts">
import type { ApiError } from '~/types/api';

definePageMeta({
  layout: 'auth',
  middleware: 'guest',
});

useSeoMeta({ title: 'Log in — Votu' });

const { login } = useAuth();

const email = ref('');
const password = ref('');
const pending = ref(false);
const error = ref<string | null>(null);

async function submit() {
  error.value = null;
  pending.value = true;

  try {
    await login(email.value, password.value);
    await navigateTo('/');
  } catch (err: unknown) {
    const apiErr = err as ApiError;
    error.value = Array.isArray(apiErr.message)
      ? apiErr.message.join(' · ')
      : (apiErr.message ?? 'Login failed. Please try again.');
  } finally {
    pending.value = false;
  }
}
</script>

<template>
  <div>
    <h1 class="mb-6 text-center text-2xl font-bold text-gray-800">
      Welcome back
    </h1>

    <UiAppAlert v-if="error" variant="error" class="mb-4">
      {{ error }}
    </UiAppAlert>

    <form class="flex flex-col gap-4" novalidate @submit.prevent="submit">
      <div>
        <label for="email" class="mb-1 block text-sm font-medium text-gray-700"
          >Email</label
        >
        <input
          id="email"
          v-model="email"
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
          v-model="password"
          type="password"
          autocomplete="current-password"
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
        Log in
      </button>
    </form>

    <p class="mt-4 text-center text-sm text-gray-500">
      Don't have an account?
      <NuxtLink
        to="/register"
        class="font-medium text-indigo-600 hover:underline"
      >
        Sign up
      </NuxtLink>
    </p>
  </div>
</template>
