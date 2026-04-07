import type { AuthResponse } from '~/types/auth';
import type { User } from '~/types/user';
import { useApiMutation } from './api';

export interface RegisterPayload {
  firstName: string;
  middleName?: string;
  lastName: string;
  email: string;
  password: string;
}

export function useAuth() {
  const authStore = useAuthStore();
  const config = useRuntimeConfig();

  const loginMutation = useApiMutation<{ email: string; password: string }, AuthResponse>({
    request: { url: '/auth/login', method: 'POST' },
  });

  const registerMutation = useApiMutation<RegisterPayload, AuthResponse>({
    request: { url: '/auth/register', method: 'POST' },
  });

  const logoutMutation = useApiMutation<void, void>({
    request: { url: '/auth/logout', method: 'POST' },
  });

  /**
   * Login with email + password. Stores the returned accessToken; the server
   * sets the refresh token as an HttpOnly cookie automatically.
   */
  async function login(email: string, password: string): Promise<AuthResponse> {
    const data = await loginMutation.mutateAsync({ email, password });
    authStore.setSession({ user: data.user, accessToken: data.accessToken });
    return data;
  }

  /**
   * Register a new account. User is immediately logged in.
   */
  async function register(payload: RegisterPayload): Promise<AuthResponse> {
    const data = await registerMutation.mutateAsync(payload);
    authStore.setSession({ user: data.user, accessToken: data.accessToken });
    return data;
  }

  /**
   * Logout — invalidates the server session and clears local state.
   */
  async function logout(): Promise<void> {
    try {
      await logoutMutation.mutateAsync();
    } finally {
      authStore.clearSession();
      await navigateTo('/login');
    }
  }

  /**
   * Hydrate the session on app init (called by the server & client plugins).
   * Uses the HttpOnly refresh-token cookie to obtain a new accessToken,
   * then fetches the full user profile.
   *
   * @param cookieHeader - Pass the forwarded cookie header when calling from
   *   the server plugin so Node can send the browser's cookie to the API.
   */
  async function hydrate(cookieHeader?: string): Promise<void> {
    const baseURL = config.public.apiBase as string;
    try {
      const headers: Record<string, string> = cookieHeader
        ? { cookie: cookieHeader }
        : {};

      const { accessToken } = await $fetch<{ accessToken: string }>(
        '/auth/refresh',
        { method: 'POST', baseURL, credentials: 'include', headers, timeout: 5000 },
      );

      authStore.accessToken = accessToken;

      const user = await $fetch<User>('/users/me', {
        baseURL,
        credentials: 'include',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      authStore.setSession({ user, accessToken });
    } catch {
      authStore.clearSession();
    }
  }

  return { login, register, logout, hydrate };
}
