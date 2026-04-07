import { useQueryClient, type QueryKey } from '@tanstack/vue-query';

export function useInvalidateQuery() {
  const queryClient = useQueryClient();

  return async function invalidateQuery(queryKey: QueryKey, exact = false) {
    if (!queryKey || queryKey.length === 0) {
      return;
    }

    try {
      await queryClient.invalidateQueries(
        exact
          ? {
              queryKey,
            }
          : {
              predicate: (query) => {
                if (!query.queryKey || !Array.isArray(query.queryKey)) {
                  return false;
                }

                return query.queryKey.some((key) => {
                  if (typeof key === 'string') {
                    return queryKey.includes(key);
                  }
                  return false;
                });
              },
            }
      );
    } catch (error) {
      console.error('Error invalidating query:', error);
    }
  };
}
