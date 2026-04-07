import type { Paginated } from '~/types/api';
import type { PollSummary } from '~/types/poll';
import { useApiQueryRequest } from './api';

export function usePolls() {
  const store = usePollsStore();

  const query = useApiQueryRequest<Paginated<PollSummary>>({
    queryKey: ['polls'],
    request: () => ({
      url: '/polls',
      query: {
        page: store.filters.page,
        limit: 20,
        ...(store.filters.status ? { status: store.filters.status } : {}),
        ...(store.filters.q ? { q: store.filters.q } : {}),
      },
    }),
  });

  watch(query.data, (result) => {
    if (result) {
      store.items = result.data;
      store.meta = result.meta;
    }
  }, { immediate: true });

  watch(query.isPending, (val) => {
    store.pending = val;
  }, { immediate: true });

  return {
    polls: computed(() => store.items),
    meta: computed(() => store.meta),
    pending: computed(() => store.pending),
    filters: store.filters,
    refresh: query.refetch,
  };
}
