import type { UserSummary } from './user';

export interface VoteOption {
  id: string;
  label: string;
  reference: string;
}

export interface Vote {
  id: string;
  voter: UserSummary;
  option: VoteOption;
  createdAt: string;
  updatedAt: string;
}
