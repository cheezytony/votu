<script setup lang="ts">
import { ref } from 'vue';
const { $authReady } = useNuxtApp();
const loading = ref(true);

onMounted(async () => {
  await $authReady;
  loading.value = false;
});
</script>

<template>
  <div class="flex min-h-screen flex-col bg-gray-50">
    <NuxtRouteAnnouncer />
    <AppHeader />

    <main class="flex-1">
      <UiAppLoader v-if="loading" />
      <template v-else>
        <slot />
      </template>
    </main>

    <AppFooter />
    <UiAppToast />
  </div>
</template>
