<template>
  <div class="flex min-h-screen items-center justify-center bg-gray-50 px-4">
    <NuxtRouteAnnouncer />
    <div class="w-full max-w-sm rounded-xl bg-white p-8 shadow-md">
      <NuxtLink to="/" class="mb-6 flex justify-center">
        <span class="text-2xl font-bold text-indigo-600 tracking-tight">
          Votu
        </span>
      </NuxtLink>
      <slot />
    </div>
  </div>
</template>
