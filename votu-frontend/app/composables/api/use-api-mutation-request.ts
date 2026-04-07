import { useMutation, type UseMutationOptions } from '@tanstack/vue-query';
import type { ApiError } from '~/types/api';
import { parseServerValidationErrors, type ValidationErrorItem } from '~/utils/api';

export type ApiMutationRequestConfig = {
  url: string;
  method?: string;
  body?: unknown;
};

export type ApiMutationOptions<TData, TVariables> = Omit<
  UseMutationOptions<TData, ApiError, TVariables>,
  'mutationFn'
> & {
  request:
    | ApiMutationRequestConfig
    | ((variables: TVariables) => ApiMutationRequestConfig);
  setErrors?: (errors: Record<string, string>) => void;
  onError?: (err: ApiError, variables: TVariables) => void;
};

export function useApiMutation<TVariables = void, TData = unknown>({
  request,
  setErrors,
  onError: customOnError,
  ...options
}: ApiMutationOptions<TData, TVariables>) {
  const { request: apiFetch, normalizeError } = useApi();

  return useMutation<TData, ApiError, TVariables>({
    mutationFn: async (variables: TVariables) => {
      let url: string;
      let method: string;
      let body: unknown;

      if (typeof request === 'function') {
        const config = request(variables);
        url = config.url;
        method = config.method ?? 'POST';
        body = 'body' in config ? config.body : variables;
      } else {
        url = request.url;
        method = request.method ?? 'POST';
        body = request.body !== undefined ? request.body : variables;
      }

      try {
        return await apiFetch<TData>(url, { method: method as 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', body: body as Record<string, unknown> });
      } catch (err) {
        throw normalizeError(err);
      }
    },
    onError: (err, variables) => {
      if (setErrors && err.message === 'validation_failed' && Array.isArray(err.data)) {
        setErrors(parseServerValidationErrors(err.data as ValidationErrorItem[]));
      }
      customOnError?.(err, variables);
    },
    ...options,
  });
}
