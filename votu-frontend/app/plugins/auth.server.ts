/**
 * Server-side auth hydration.
 *
 * Fires hydration without blocking SSR rendering — the returned promise is
 * stored as $authReady so only routes that need auth (via middleware) pay the
 * async cost. Public pages get their HTML immediately.
 */
export default defineNuxtPlugin(() => {
  const { cookie } = useRequestHeaders(['cookie']);
  const { hydrate } = useAuth();

  const authReady: Promise<void> = cookie ? hydrate(cookie) : Promise.resolve();

  return { provide: { authReady } };
});
