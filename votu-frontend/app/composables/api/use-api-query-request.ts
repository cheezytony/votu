import { useQuery, type QueryKey, type UseQueryOptions } from '@tanstack/vue-query';
import type { ApiError } from '~/types/api';

export type ApiQueryRequestConfig = {
  url: string;
  query?: Record<string, unknown>;
};

export type ApiQueryOptions<TData> = Omit<
  UseQueryOptions<TData, ApiError>,
  'queryKey'
> & {
  queryKey: QueryKey;
  request: ApiQueryRequestConfig | (() => ApiQueryRequestConfig);
};

export function useApiQueryRequest<TData = unknown>({
  queryKey,
  request,
  queryFn: customQueryFn,
  ...options
}: ApiQueryOptions<TData>) {
  const { request: apiFetch, normalizeError } = useApi();

  const resolveRequest = (): ApiQueryRequestConfig =>
    typeof request === 'function' ? request() : request;

  const computedQueryKey = computed<QueryKey>(() => {
    const { url, query } = resolveRequest();
    return [...(queryKey as unknown[]), url, ...(query ? [query] : [])] as QueryKey;
  });

  const defaultQueryFn = async (): Promise<TData> => {
    const { url, query } = resolveRequest();
    try {
      return await apiFetch<TData>(url, query ? { query } : {});
    } catch (err) {
      throw normalizeError(err);
    }
  };

  return useQuery<TData, ApiError>({
    queryFn: customQueryFn ?? defaultQueryFn,
    ...options,
    queryKey: computedQueryKey,
  });
}
