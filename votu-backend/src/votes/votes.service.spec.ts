import {
    ForbiddenException,
    NotFoundException,
    UnprocessableEntityException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
    PollOption,
    PollOptionStatus,
} from '../polls/entities/poll-option.entity';
import { Poll, PollStatus } from '../polls/entities/poll.entity';
import { Vote } from './entities/vote.entity';
import { VotesService } from './votes.service';

const createMockQb = () => ({
  leftJoinAndSelect: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  addSelect: jest.fn().mockReturnThis(),
  groupBy: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  take: jest.fn().mockReturnThis(),
  getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
  getOne: jest.fn().mockResolvedValue(null),
  getRawMany: jest.fn().mockResolvedValue([]),
});

const mockVoteRepo = () => ({
  createQueryBuilder: jest.fn(() => createMockQb()),
  findOne: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
});

const mockPollRepo = () => ({
  findOne: jest.fn(),
});

const mockOptionRepo = () => ({
  findOne: jest.fn(),
  find: jest.fn(),
});

describe('VotesService', () => {
  let service: VotesService;
  let voteRepo: ReturnType<typeof mockVoteRepo>;
  let pollRepo: ReturnType<typeof mockPollRepo>;
  let optionRepo: ReturnType<typeof mockOptionRepo>;

  const activePoll = {
    id: 'poll-1',
    status: PollStatus.ACTIVE,
    canChangeOption: true,
  } as Poll;

  const activeOption = {
    id: 'opt-1',
    pollId: 'poll-1',
    label: 'Option A',
    status: PollOptionStatus.ACTIVE,
  } as PollOption;

  const existingVote = {
    id: 'vote-1',
    pollId: 'poll-1',
    userId: 'user-1',
    optionId: 'opt-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Vote;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VotesService,
        { provide: getRepositoryToken(Vote), useFactory: mockVoteRepo },
        { provide: getRepositoryToken(Poll), useFactory: mockPollRepo },
        { provide: getRepositoryToken(PollOption), useFactory: mockOptionRepo },
        { provide: DataSource, useValue: {} },
      ],
    }).compile();

    service = module.get<VotesService>(VotesService);
    voteRepo = module.get(getRepositoryToken(Vote));
    pollRepo = module.get(getRepositoryToken(Poll));
    optionRepo = module.get(getRepositoryToken(PollOption));
  });

  afterEach(() => jest.clearAllMocks());

  // ── listVotes ────────────────────────────────────────────────────────────────

  describe('listVotes', () => {
    it('throws NotFoundException when poll does not exist', async () => {
      pollRepo.findOne.mockResolvedValue(null);

      await expect(service.listVotes('poll-1', {})).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns paginated votes with voter and option', async () => {
      pollRepo.findOne.mockResolvedValue(activePoll);

      const voter = {
        id: 'user-1',
        firstName: 'John',
        middleName: null,
        lastName: 'Doe',
        avatarUrl: null,
      };
      const mockVote = { ...existingVote, voter, option: activeOption };
      const qb = createMockQb();
      qb.getManyAndCount.mockResolvedValue([[mockVote], 1]);
      voteRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.listVotes('poll-1', { page: 1, limit: 20 });

      expect(result.meta.total).toBe(1);
      expect(result.data[0].voter.displayName).toBe('John Doe');
      expect(result.data[0].option.label).toBe('Option A');
    });
  });

  // ── castVote ─────────────────────────────────────────────────────────────────

  describe('castVote', () => {
    it('throws NotFoundException when poll does not exist', async () => {
      pollRepo.findOne.mockResolvedValue(null);

      await expect(
        service.castVote('poll-1', { optionId: 'opt-1' }, 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws UnprocessableEntityException when poll is not active (draft)', async () => {
      pollRepo.findOne.mockResolvedValue({
        ...activePoll,
        status: PollStatus.DRAFT,
      });

      await expect(
        service.castVote('poll-1', { optionId: 'opt-1' }, 'user-1'),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('throws UnprocessableEntityException when poll is not active (closed)', async () => {
      pollRepo.findOne.mockResolvedValue({
        ...activePoll,
        status: PollStatus.CLOSED,
      });

      await expect(
        service.castVote('poll-1', { optionId: 'opt-1' }, 'user-1'),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('throws NotFoundException when option does not exist in poll', async () => {
      pollRepo.findOne.mockResolvedValue(activePoll);
      optionRepo.findOne.mockResolvedValue(null);

      await expect(
        service.castVote('poll-1', { optionId: 'opt-x' }, 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws UnprocessableEntityException (422) when user already voted', async () => {
      pollRepo.findOne.mockResolvedValue(activePoll);
      optionRepo.findOne.mockResolvedValue(activeOption);
      voteRepo.findOne.mockResolvedValue(existingVote);

      await expect(
        service.castVote('poll-1', { optionId: 'opt-1' }, 'user-1'),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('creates vote and returns envelope with percentage accuracy', async () => {
      pollRepo.findOne.mockResolvedValue(activePoll);
      optionRepo.findOne.mockResolvedValue(activeOption);
      voteRepo.findOne.mockResolvedValue(null); // no existing vote
      voteRepo.create.mockReturnValue(existingVote);
      voteRepo.save.mockResolvedValue(existingVote);

      // buildEnvelope: QB 1 — fetch vote with option
      const qbVote = createMockQb();
      qbVote.getOne.mockResolvedValue({
        ...existingVote,
        option: activeOption,
      });

      // buildEnvelope: QB 2 — raw vote counts (2 opts: 3+1=4 total)
      const qbCounts = createMockQb();
      qbCounts.getRawMany.mockResolvedValue([
        { optionId: 'opt-1', count: '3' },
        { optionId: 'opt-2', count: '1' },
      ]);

      voteRepo.createQueryBuilder
        .mockReturnValueOnce(qbVote)
        .mockReturnValueOnce(qbCounts);

      const opt2 = {
        ...activeOption,
        id: 'opt-2',
        label: 'Option B',
      } as PollOption;
      optionRepo.find.mockResolvedValue([activeOption, opt2]);

      const result = await service.castVote(
        'poll-1',
        { optionId: 'opt-1' },
        'user-1',
      );

      expect(result.vote.option.label).toBe('Option A');
      expect(result.poll.votesCount).toBe(4);

      // opt-1: 3/4 = 75%
      const opt1Result = result.poll.options.find((o) => o.id === 'opt-1');
      expect(opt1Result?.percentage).toBe(75);

      // opt-2: 1/4 = 25%
      const opt2Result = result.poll.options.find((o) => o.id === 'opt-2');
      expect(opt2Result?.percentage).toBe(25);
    });

    it('returns percentage = 0 for all options when no votes cast', async () => {
      pollRepo.findOne.mockResolvedValue(activePoll);
      optionRepo.findOne.mockResolvedValue(activeOption);
      voteRepo.findOne.mockResolvedValue(null);
      voteRepo.create.mockReturnValue(existingVote);
      voteRepo.save.mockResolvedValue(existingVote);

      const qbVote = createMockQb();
      qbVote.getOne.mockResolvedValue({
        ...existingVote,
        option: activeOption,
      });

      const qbCounts = createMockQb();
      qbCounts.getRawMany.mockResolvedValue([]); // zero votes

      voteRepo.createQueryBuilder
        .mockReturnValueOnce(qbVote)
        .mockReturnValueOnce(qbCounts);

      optionRepo.find.mockResolvedValue([activeOption]);

      const result = await service.castVote(
        'poll-1',
        { optionId: 'opt-1' },
        'user-1',
      );

      expect(result.poll.votesCount).toBe(0);
      expect(result.poll.options[0].percentage).toBe(0);
    });
  });

  // ── changeVote ───────────────────────────────────────────────────────────────

  describe('changeVote', () => {
    it('throws NotFoundException when poll does not exist', async () => {
      pollRepo.findOne.mockResolvedValue(null);

      await expect(
        service.changeVote('poll-1', { optionId: 'opt-2' }, 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws UnprocessableEntityException when poll is not active', async () => {
      pollRepo.findOne.mockResolvedValue({
        ...activePoll,
        status: PollStatus.CLOSED,
      });

      await expect(
        service.changeVote('poll-1', { optionId: 'opt-2' }, 'user-1'),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('throws ForbiddenException when canChangeOption is false', async () => {
      pollRepo.findOne.mockResolvedValue({
        ...activePoll,
        canChangeOption: false,
      });

      await expect(
        service.changeVote('poll-1', { optionId: 'opt-2' }, 'user-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException when user has no existing vote', async () => {
      pollRepo.findOne.mockResolvedValue(activePoll);
      voteRepo.findOne.mockResolvedValue(null);

      await expect(
        service.changeVote('poll-1', { optionId: 'opt-2' }, 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when new option does not exist in poll', async () => {
      pollRepo.findOne.mockResolvedValue(activePoll);
      voteRepo.findOne.mockResolvedValue(existingVote);
      optionRepo.findOne.mockResolvedValue(null);

      await expect(
        service.changeVote('poll-1', { optionId: 'opt-x' }, 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('updates optionId and returns envelope', async () => {
      const opt2 = {
        ...activeOption,
        id: 'opt-2',
        label: 'Option B',
      } as PollOption;
      pollRepo.findOne.mockResolvedValue(activePoll);
      voteRepo.findOne.mockResolvedValue({ ...existingVote });
      optionRepo.findOne.mockResolvedValue(opt2);

      const updatedVote = { ...existingVote, optionId: 'opt-2' };
      voteRepo.save.mockResolvedValue(updatedVote);

      const qbVote = createMockQb();
      qbVote.getOne.mockResolvedValue({ ...updatedVote, option: opt2 });

      const qbCounts = createMockQb();
      qbCounts.getRawMany.mockResolvedValue([
        { optionId: 'opt-2', count: '2' },
      ]);

      voteRepo.createQueryBuilder
        .mockReturnValueOnce(qbVote)
        .mockReturnValueOnce(qbCounts);

      optionRepo.find.mockResolvedValue([activeOption, opt2]);

      const result = await service.changeVote(
        'poll-1',
        { optionId: 'opt-2' },
        'user-1',
      );

      expect(result.vote.option.id).toBe('opt-2');
      expect(result.poll.myVote.optionId).toBe('opt-2');
    });
  });
});
