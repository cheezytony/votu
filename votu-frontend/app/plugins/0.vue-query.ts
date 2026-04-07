import { QueryClient, VueQueryPlugin, dehydrate, hydrate } from '@tanstack/vue-query';

export default defineNuxtPlugin((nuxt) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 30, // 30 seconds
        refetchOnWindowFocus: false,
      },
    },
  });

  nuxt.vueApp.use(VueQueryPlugin, { queryClient });

  if (import.meta.server) {
    nuxt.hooks.hook('app:rendered', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (nuxt.payload as any).vueQueryState = dehydrate(queryClient);
    });
  }

  if (import.meta.client) {
    nuxt.hooks.hook('app:created', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      hydrate(queryClient, (nuxt.payload as any).vueQueryState);
    });
  }
});
