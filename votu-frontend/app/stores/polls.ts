import { defineStore } from 'pinia';
import type { Paginated } from '~/types/api';
import type { PollStatus, PollSummary } from '~/types/poll';

export interface PollFilters {
  status?: PollStatus;
  q?: string;
  page: number;
}

export const usePollsStore = defineStore('polls', () => {
  const items = ref<PollSummary[]>([]);
  const meta = ref<Paginated<PollSummary>['meta'] | null>(null);
  const filters = reactive<PollFilters>({ page: 1 });
  const pending = ref(false);

  return { items, meta, filters, pending };
});
