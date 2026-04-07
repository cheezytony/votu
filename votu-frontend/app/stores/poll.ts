import { defineStore } from 'pinia';
import type { Poll } from '~/types/poll';

export const usePollStore = defineStore('poll', () => {
  const poll = ref<Poll | null>(null);
  const pending = ref(false);
  const notFound = ref(false);

  return { poll, pending, notFound };
});
