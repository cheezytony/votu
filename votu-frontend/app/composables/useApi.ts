import type { ApiError } from '~/types/api';

/**
 * Singleton in-flight refresh lock.
 * Module-level so all concurrent 401s queue on the same Promise rather than
 * firing parallel refresh requests. Guarded by import.meta.client — never
 * mutated during SSR so there is no cross-request state leak.
 */
let refreshPromise: Promise<string> | null = null;

export function useApi() {
  const config = useRuntimeConfig();
  const authStore = useAuthStore();
  const baseURL = config.public.apiBase as string;

  // ─── Token Refresh ───────────────────────────────────────────────────────

  function acquireToken(): Promise<string> {
    if (refreshPromise) return refreshPromise;

    refreshPromise = $fetch<{ accessToken: string }>('/auth/refresh', {
      method: 'POST',
      baseURL,
      credentials: 'include',
    })
      .then(({ accessToken }) => {
        // Update store with new token; keep existing user in place.
        if (authStore.user) {
          authStore.setSession({ user: authStore.user, accessToken });
        } else {
          authStore.accessToken = accessToken;
        }
        return accessToken;
      })
      .catch((err) => {
        authStore.clearSession();
        // Redirect to login (client-side only — this path is only reached on the client).
        navigateTo('/login');
        throw err;
      })
      .finally(() => {
        refreshPromise = null;
      });

    return refreshPromise;
  }

  // ─── Core Request ─────────────────────────────────────────────────────────

  async function request<T>(
    path: string,
    options: Parameters<typeof $fetch>[1] = {},
  ): Promise<T> {
    const authHeaders: Record<string, string> = authStore.accessToken
      ? { Authorization: `Bearer ${authStore.accessToken}` }
      : {};

    try {
      return await $fetch<T>(path, {
        baseURL,
        credentials: 'include',
        ...options,
        headers: {
          ...authHeaders,
          ...(options.headers as Record<string, string> | undefined),
        },
      });
    } catch (err: unknown) {
      const fetchErr = err as {
        status?: number;
        statusCode?: number;
        data?: unknown;
      };
      const status = fetchErr.status ?? fetchErr.statusCode;

      // Only attempt refresh on 401 when we had a token (i.e. we were authenticated)
      // AND we're on the client (cookie unavailable server-side for refresh).
      // Never retry the refresh endpoint itself to prevent an infinite loop.
      if (
        status === 401 &&
        authStore.accessToken &&
        import.meta.client &&
        !path.includes('/auth/refresh')
      ) {
        try {
          const newToken = await acquireToken();
          return await $fetch<T>(path, {
            baseURL,
            credentials: 'include',
            ...options,
            headers: {
              Authorization: `Bearer ${newToken}`,
              ...(options.headers as Record<string, string> | undefined),
            },
          });
        } catch {
          // clearSession + redirect already performed inside acquireToken on failure.
          throw normalizeError(err);
        }
      }

      throw normalizeError(err);
    }
  }

  // ─── Error Normalisation ──────────────────────────────────────────────────

  function normalizeError(err: unknown): ApiError {
    const fetchErr = err as {
      status?: number;
      statusCode?: number;
      data?: Partial<ApiError>;
      message?: string;
    };
    const body = fetchErr.data;

    if (body && typeof body === 'object') {
      return {
        statusCode:
          body.statusCode ?? fetchErr.status ?? fetchErr.statusCode ?? 500,
        error: body.error ?? 'Error',
        message: body.message ?? 'An unknown error occurred',
        data: (body as Record<string, unknown>).data,
      };
    }

    return {
      statusCode: fetchErr.status ?? fetchErr.statusCode ?? 500,
      error: 'Error',
      message: fetchErr.message ?? 'An unknown error occurred',
    };
  }

  return { request, normalizeError, acquireToken };
}
