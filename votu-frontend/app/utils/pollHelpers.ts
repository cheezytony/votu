import type { Poll, PollSummary } from '~/types/poll';

/** A draft poll can be edited by its creator. */
export function isEditable(poll: Poll | PollSummary): boolean {
  return poll.status === 'draft';
}

/** An active poll can be voted on by authenticated users. */
export function isVotable(poll: Poll | PollSummary): boolean {
  return poll.status === 'active';
}

/** The creator of a draft poll can activate it. */
export function canActivate(poll: Poll | PollSummary, userId: string): boolean {
  return poll.status === 'draft' && poll.createdBy.id === userId;
}
