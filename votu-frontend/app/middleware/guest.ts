/**
 * Redirects authenticated users away from guest-only pages (login, register).
 * Awaits $authReady so the redirect is accurate after hydration.
 */
export default defineNuxtRouteMiddleware(async () => {
  const { $authReady } = useNuxtApp();
  await $authReady;

  const authStore = useAuthStore();
  if (authStore.user) {
    return navigateTo('/');
  }
});
