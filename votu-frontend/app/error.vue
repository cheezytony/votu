<script setup lang="ts">
import type { NuxtError } from '#app';

const props = defineProps<{ error: NuxtError }>();

function is404(error: NuxtError) {
  return error.statusCode === 404;
}

function goHome() {
  clearError({ redirect: '/' });
}
</script>

<template>
  <div
    class="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center"
  >
    <h1 class="text-4xl font-bold text-gray-800">
      {{ is404(error) ? '404' : 'Oops' }}
    </h1>

    <UiAppAlert variant="error">
      {{
        is404(error)
          ? 'Page not found.'
          : error.message || 'An unexpected error occurred.'
      }}
    </UiAppAlert>

    <button
      class="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
      @click="goHome"
    >
      Go home
    </button>
  </div>
</template>
