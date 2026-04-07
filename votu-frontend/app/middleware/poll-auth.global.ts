// Ensures auth is hydrated before poll page loads, so poll.myVote is always correct for authenticated users.
export default defineNuxtRouteMiddleware(async (to, from) => {
  const { $authReady } = useNuxtApp();
  await $authReady;
});
