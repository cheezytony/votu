import type { MyVote, Poll } from '~/types/poll';
import type { VoteOption } from '~/types/vote';
import { useApiQueryRequest, useApiMutation } from './api';

interface VoteEnvelope {
  vote: {
    id: string;
    option: VoteOption;
    createdAt: string;
    updatedAt: string;
  };
  poll: {
    id: string;
    votesCount: number;
    options: Array<{
      id: string;
      label: string;
      votesCount: number;
      percentage: number;
    }>;
    myVote: MyVote;
  };
}

export function usePoll(reference: string) {
  const store = usePollStore();
  const pollsStore = usePollsStore();
  const nuxtApp = useNuxtApp();
  const { request: apiFetch, normalizeError } = useApi();

  const query = useApiQueryRequest<Poll>({
    queryKey: ['poll', reference],
    request: { url: `/polls/ref/${reference}` },
    queryFn: async () => {
      await (nuxtApp.$authReady as Promise<void>);
      try {
        return await apiFetch<Poll>(`/polls/ref/${reference}`);
      } catch (err) {
        throw normalizeError(err);
      }
    },
  });

  // Sync Pinia store from TanStack cache
  watch(query.data, (poll) => {
    if (poll) store.poll = poll;
  }, { immediate: true });

  watch(query.isPending, (val) => {
    store.pending = val;
  }, { immediate: true });

  watch(query.error, (err) => {
    if (err?.statusCode === 404) {
      store.notFound = true;
      store.poll = null;
    }
  }, { immediate: true });

  /**
   * Applies the partial poll snapshot from a vote response to both stores.
   */
  function applyVoteEnvelope(envelope: VoteEnvelope) {
    if (store.poll) {
      store.poll = {
        ...store.poll,
        votesCount: envelope.poll.votesCount,
        myVote: envelope.poll.myVote,
        options: store.poll.options.map((opt) => {
          const updated = envelope.poll.options.find((o) => o.id === opt.id);
          if (updated) {
            return { ...opt, votesCount: updated.votesCount, percentage: updated.percentage };
          }
          return opt;
        }),
      };
    }

    const idx = pollsStore.items.findIndex((p) => p.reference === reference);
    if (idx !== -1) {
      pollsStore.items[idx] = {
        ...pollsStore.items[idx]!,
        votesCount: envelope.poll.votesCount,
        myVote: envelope.poll.myVote,
      };
    }
  }

  const castVoteMutation = useApiMutation<{ optionId: string; pollId: string }, VoteEnvelope>({
    request: (vars) => ({
      url: '/votes',
      method: 'POST',
      body: vars,
    }),
  });

  const changeVoteMutation = useApiMutation<{ optionId: string; pollId: string }, VoteEnvelope>({
    request: (vars) => ({
      url: '/votes',
      method: 'PATCH',
      body: vars,
    }),
  });

  const activateMutation = useApiMutation<string, Poll>({
    request: (pollId) => ({
      url: `/polls/${pollId}/activate`,
      method: 'PATCH',
      body: undefined,
    }),
  });

  async function castVote(optionId: string) {
    if (!store.poll) throw new Error('Poll not loaded');
    const envelope = await castVoteMutation.mutateAsync({ optionId, pollId: store.poll.id });
    applyVoteEnvelope(envelope);
  }

  async function changeVote(optionId: string) {
    if (!store.poll) throw new Error('Poll not loaded');
    const envelope = await changeVoteMutation.mutateAsync({ optionId, pollId: store.poll.id });
    applyVoteEnvelope(envelope);
  }

  async function activate(pollId: string) {
    const updatedPoll = await activateMutation.mutateAsync(pollId);
    store.poll = updatedPoll;

    const idx = pollsStore.items.findIndex((p) => p.reference === reference);
    if (idx !== -1) {
      pollsStore.items[idx] = {
        ...pollsStore.items[idx]!,
        status: updatedPoll.status,
      };
    }
  }

  return {
    poll: computed(() => store.poll),
    pending: computed(() => store.pending),
    notFound: computed(() => store.notFound),
    refresh: query.refetch,
    castVote,
    changeVote,
    activate,
  };
}
