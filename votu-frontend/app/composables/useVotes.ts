import type { Paginated } from '~/types/api';
import type { Vote } from '~/types/vote';
import { useApiQueryRequest } from './api';

export function useVotes(pollReference: string) {
  const page = ref(1);

  const query = useApiQueryRequest<Paginated<Vote>>({
    queryKey: ['votes', pollReference],
    request: () => ({
      url: '/votes',
      query: { page: page.value, limit: 20, pollReference },
    }),
  });

  function setPage(p: number) {
    page.value = p;
  }

  return {
    votes: computed(() => query.data.value?.data ?? []),
    meta: computed(() => query.data.value?.meta ?? null),
    pending: query.isPending,
    page: computed(() => page.value),
    setPage,
    refresh: query.refetch,
  };
}
