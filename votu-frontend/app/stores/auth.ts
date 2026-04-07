import { defineStore } from 'pinia';
import type { User } from '~/types/user';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);
  const accessToken = ref<string | null>(null);

  const isAuthenticated = computed(() => user.value !== null);

  function setSession(data: { user: User; accessToken: string }) {
    user.value = data.user;
    accessToken.value = data.accessToken;
  }

  function clearSession() {
    user.value = null;
    accessToken.value = null;
  }

  return { user, accessToken, isAuthenticated, setSession, clearSession };
});
