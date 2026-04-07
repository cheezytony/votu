<script setup lang="ts">
const authStore = useAuthStore();

const navLinks = [{ label: 'Polls', to: '/' }];
</script>

<template>
  <header class="sticky top-0 z-30 bg-white shadow-sm">
    <div class="mx-auto flex h-20 max-w-5xl items-center justify-between px-6">
      <!-- Logo with icon -->
      <NuxtLink
        to="/"
        class="flex items-center gap-2 text-2xl font-bold tracking-tight text-indigo-700 hover:text-indigo-800 transition"
      >
        <span
          class="inline-flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50"
        >
          <svg
            class="h-5 w-5 text-indigo-500"
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
              d="M8 12l2.5 2.5L16 9"
            />
          </svg>
        </span>
        Votu
      </NuxtLink>

      <!-- Nav -->
      <nav class="flex items-center gap-8 text-base font-medium">
        <NuxtLink
          v-for="link in navLinks"
          :key="link.to"
          :to="link.to"
          class="rounded-lg px-3 py-2 text-gray-700 transition hover:bg-indigo-50 hover:text-indigo-700"
          active-class="bg-indigo-50 text-indigo-700"
        >
          {{ link.label }}
        </NuxtLink>
      </nav>

      <!-- Auth actions -->
      <div class="flex items-center gap-4 text-base">
        <template v-if="!authStore.isAuthenticated">
          <NuxtLink
            to="/login"
            class="rounded-lg px-3 py-2 text-gray-500 transition hover:bg-gray-100 hover:text-indigo-700"
          >
            Log in
          </NuxtLink>
          <NuxtLink
            to="/register"
            class="rounded-full bg-indigo-600 px-5 py-2 font-semibold text-white shadow-sm transition hover:bg-indigo-700"
          >
            Sign up
          </NuxtLink>
        </template>
        <AppUserDropdown v-else />
      </div>
    </div>
    <div
      class="h-px w-full bg-gradient-to-r from-transparent via-gray-200 to-transparent"
    />
  </header>
</template>
