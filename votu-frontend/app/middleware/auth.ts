/**
 * Protects routes that require authentication.
 *
 * Auth tokens are memory-only (never persisted to disk). Checking auth on the
 * server is unreliable because the SSR process has its own memory space and
 * may not have successfully hydrated the session (e.g. during dev restarts or
 * if the refresh-token API call fails transiently). We therefore skip the
 * check on the server and let the client — which always has access to the
 * HttpOnly refresh-token cookie — be the authoritative guard.
 *
 * The server plugin still runs hydrate() so that SSR-fetched data (polls,
 * votes, etc.) can be authenticated — this middleware is purely a navigation
 * guard and does not affect data fetching.
 */
export default defineNuxtRouteMiddleware(async () => {
  if (import.meta.server) return;

  const { $authReady } = useNuxtApp();
  await $authReady;

  const authStore = useAuthStore();
  if (!authStore.user) {
    return navigateTo('/login');
  }
});
