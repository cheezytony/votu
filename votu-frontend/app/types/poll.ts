import type { UserSummary } from './user';

export type PollStatus = 'draft' | 'active' | 'closed';

export type PollOptionStatus = 'active' | 'disabled';

export interface PollOption {
  id: string;
  label: string;
  description: string | null;
  reference: string;
  status: PollOptionStatus;
  votesCount: number;
  percentage: number;
  createdAt: string;
  updatedAt: string;
  pollId: string;
  poll?: Poll;
}

export interface MyVote {
  id: string;
  optionId: string;
  optionLabel: string;
  createdAt: string;
  updatedAt: string;
}

export interface Poll {
  id: string;
  title: string;
  description: string | null;
  reference: string;
  status: PollStatus;
  canChangeOption: boolean;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: UserSummary;
  options: PollOption[];
  votesCount: number;
  myVote?: MyVote | null;
}

export interface PollSummary {
  id: string;
  title: string;
  description: string | null;
  reference: string;
  status: PollStatus;
  canChangeOption: boolean;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: UserSummary;
  optionsCount: number;
  votesCount: number;
  myVote?: MyVote | null;
}
