/**
 * Client-side auth hydration fallback.
 *
 * Mirrors the server plugin — non-blocking. The promise is provided as
 * $authReady for middleware to await when auth state is needed.
 */
export default defineNuxtPlugin(() => {
  const authStore = useAuthStore();
  const { hydrate } = useAuth();

  // If SSR already hydrated the session via Nuxt payload, resolve immediately.
  const authReady: Promise<void> = authStore.accessToken
    ? Promise.resolve()
    : hydrate();

  return { provide: { authReady } };
});
