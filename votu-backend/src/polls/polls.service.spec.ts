import {
    ForbiddenException,
    NotFoundException,
    UnprocessableEntityException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Vote } from '../votes/entities/vote.entity';
import { CreatePollDto } from './dto/create-poll.dto';
import { PollOption, PollOptionStatus } from './entities/poll-option.entity';
import { Poll, PollStatus } from './entities/poll.entity';
import { FullPollResponse, PollsService } from './polls.service';

// Chainable QueryBuilder mock
const createMockQb = () => ({
  leftJoinAndSelect: jest.fn().mockReturnThis(),
  loadRelationCountAndMap: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  take: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  addSelect: jest.fn().mockReturnThis(),
  groupBy: jest.fn().mockReturnThis(),
  getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
  getMany: jest.fn().mockResolvedValue([]),
  getOne: jest.fn().mockResolvedValue(null),
  getRawMany: jest.fn().mockResolvedValue([]),
});

const mockPollRepo = () => ({
  createQueryBuilder: jest.fn(() => createMockQb()),
  findOne: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
});

const mockOptionRepo = () => ({
  createQueryBuilder: jest.fn(() => createMockQb()),
  findOne: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
  find: jest.fn(),
});

const mockVoteRepo = () => ({
  createQueryBuilder: jest.fn(() => createMockQb()),
  findOne: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
});

const mockQueryRunner = () => ({
  connect: jest.fn(),
  startTransaction: jest.fn(),
  commitTransaction: jest.fn(),
  rollbackTransaction: jest.fn(),
  release: jest.fn(),
  manager: {
    create: jest
      .fn()
      .mockImplementation((_entity: unknown, data: unknown) => data),
    save: jest
      .fn()
      .mockImplementation((_entity: unknown, data: unknown) => data),
    delete: jest.fn(),
  },
});

const mockDataSource = () => ({
  createQueryRunner: jest.fn(),
});

describe('PollsService', () => {
  let service: PollsService;
  let pollRepo: ReturnType<typeof mockPollRepo>;
  let voteRepo: ReturnType<typeof mockVoteRepo>;
  let dataSource: ReturnType<typeof mockDataSource>;

  const draftPoll = {
    id: 'poll-1',
    userId: 'user-1',
    title: 'Test Poll',
    description: null,
    reference: null,
    status: PollStatus.DRAFT,
    canChangeOption: false,
    expiresAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    options: [],
  } as unknown as Poll;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PollsService,
        { provide: getRepositoryToken(Poll), useFactory: mockPollRepo },
        { provide: getRepositoryToken(PollOption), useFactory: mockOptionRepo },
        { provide: getRepositoryToken(Vote), useFactory: mockVoteRepo },
        { provide: DataSource, useFactory: mockDataSource },
      ],
    }).compile();

    service = module.get<PollsService>(PollsService);
    pollRepo = module.get(getRepositoryToken(Poll));
    voteRepo = module.get(getRepositoryToken(Vote));
    dataSource = module.get(DataSource);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── findAll ───────────────────────────────────────────────────────────────────

  describe('findAll', () => {
    const mockPoll = (overrides = {}) =>
      ({
        ...draftPoll,
        optionsCount: 3,
        votesCount: 0,
        createdBy: null,
        ...overrides,
      }) as unknown as Poll;

    it('returns paginated polls with default page/limit', async () => {
      const qb = createMockQb();
      qb.getManyAndCount.mockResolvedValue([[mockPoll()], 1]);
      pollRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAll({});

      expect(result.meta).toEqual({ page: 1, limit: 20, total: 1 });
      expect(result.data).toHaveLength(1);
      expect(result.data[0].optionsCount).toBe(3);
    });

    it('omits myVote field when no userId provided', async () => {
      const qb = createMockQb();
      qb.getManyAndCount.mockResolvedValue([[mockPoll()], 1]);
      pollRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAll({});

      expect(result.data[0].myVote).toBeUndefined();
    });

    it('sets myVote to null when authenticated user has not voted', async () => {
      const pollQb = createMockQb();
      pollQb.getManyAndCount.mockResolvedValue([[mockPoll()], 1]);
      pollRepo.createQueryBuilder.mockReturnValue(pollQb);

      const voteQb = createMockQb();
      voteQb.getMany.mockResolvedValue([]);
      voteRepo.createQueryBuilder.mockReturnValue(voteQb);

      const result = await service.findAll({}, 'user-1');

      expect(result.data[0].myVote).toBeNull();
    });

    it('sets myVote when authenticated user has voted', async () => {
      const pollQb = createMockQb();
      pollQb.getManyAndCount.mockResolvedValue([
        [mockPoll({ votesCount: 1 })],
        1,
      ]);
      pollRepo.createQueryBuilder.mockReturnValue(pollQb);

      const option = { id: 'opt-1', label: 'Option A' } as PollOption;
      const vote = {
        id: 'vote-1',
        pollId: 'poll-1',
        userId: 'user-1',
        optionId: 'opt-1',
        option,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as unknown as Vote;

      const voteQb = createMockQb();
      voteQb.getMany.mockResolvedValue([vote]);
      voteRepo.createQueryBuilder.mockReturnValue(voteQb);

      const result = await service.findAll({}, 'user-1');

      expect(result.data[0].myVote?.optionId).toBe('opt-1');
      expect(result.data[0].myVote?.optionLabel).toBe('Option A');
    });
  });

  // ── create ───────────────────────────────────────────────────────────────────

  describe('create', () => {
    const makeDto = (count: number): CreatePollDto => ({
      title: 'Test',
      options: Array.from({ length: count }, (_, i) => ({
        label: `Option ${i + 1}`,
      })),
    });

    it('creates poll in a transaction with DRAFT status', async () => {
      const qr = mockQueryRunner();
      const savedPoll = { id: 'poll-new', userId: 'user-1' } as Poll;
      qr.manager.save.mockResolvedValue(savedPoll);
      dataSource.createQueryRunner.mockReturnValue(qr);
      // Spy on internal findOne so we don't need to mock the QB chain
      const findOneSpy = jest
        .spyOn(service, 'findOne')
        .mockResolvedValue({ id: 'poll-new' } as FullPollResponse);

      await service.create(makeDto(3), 'user-1');

      expect(qr.startTransaction).toHaveBeenCalled();
      expect(qr.commitTransaction).toHaveBeenCalled();
      expect(qr.release).toHaveBeenCalled();

      // First manager.create call should set status to DRAFT
      expect(qr.manager.create).toHaveBeenCalledWith(
        Poll,
        expect.objectContaining({ status: PollStatus.DRAFT }),
      );

      findOneSpy.mockRestore();
    });
  });

  // ── update ───────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('throws NotFoundException when poll does not exist', async () => {
      pollRepo.findOne.mockResolvedValue(null);

      await expect(
        service.update('poll-1', { title: 'New' }, 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when user is not the owner', async () => {
      pollRepo.findOne.mockResolvedValue({
        ...draftPoll,
        userId: 'other-user',
      });

      await expect(
        service.update('poll-1', { title: 'New' }, 'user-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws UnprocessableEntityException when poll is not draft', async () => {
      pollRepo.findOne.mockResolvedValue({
        ...draftPoll,
        status: PollStatus.ACTIVE,
      });

      await expect(
        service.update('poll-1', { title: 'New' }, 'user-1'),
      ).rejects.toThrow(UnprocessableEntityException);
    });
  });

  // ── activate ─────────────────────────────────────────────────────────────────

  describe('activate', () => {
    it('throws NotFoundException when poll does not exist', async () => {
      pollRepo.findOne.mockResolvedValue(null);

      await expect(service.activate('poll-1', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ForbiddenException when user is not the owner', async () => {
      pollRepo.findOne.mockResolvedValue({ ...draftPoll, userId: 'other' });

      await expect(service.activate('poll-1', 'user-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws UnprocessableEntityException when poll is already active', async () => {
      pollRepo.findOne.mockResolvedValue({
        ...draftPoll,
        status: PollStatus.ACTIVE,
      });

      await expect(service.activate('poll-1', 'user-1')).rejects.toThrow(
        UnprocessableEntityException,
      );
    });

    it('throws UnprocessableEntityException when poll is already closed', async () => {
      pollRepo.findOne.mockResolvedValue({
        ...draftPoll,
        status: PollStatus.CLOSED,
      });

      await expect(service.activate('poll-1', 'user-1')).rejects.toThrow(
        UnprocessableEntityException,
      );
    });

    it('sets status to ACTIVE and returns full poll response', async () => {
      pollRepo.findOne.mockResolvedValue({ ...draftPoll });
      pollRepo.save.mockResolvedValue({
        ...draftPoll,
        status: PollStatus.ACTIVE,
      });

      const mockFull = {
        id: 'poll-1',
        status: PollStatus.ACTIVE,
      } as FullPollResponse;
      const findOneSpy = jest
        .spyOn(service, 'findOne')
        .mockResolvedValue(mockFull);

      const result = await service.activate('poll-1', 'user-1');

      expect(pollRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: PollStatus.ACTIVE }),
      );
      expect(findOneSpy).toHaveBeenCalledWith('poll-1', 'user-1');
      expect(result).toBe(mockFull);

      findOneSpy.mockRestore();
    });
  });

  // ── findOne ──────────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('throws NotFoundException when poll does not exist', async () => {
      const qb = createMockQb();
      qb.getOne.mockResolvedValue(null);
      pollRepo.createQueryBuilder.mockReturnValue(qb);

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('computes percentage = 0 when no votes have been cast', async () => {
      const option = {
        id: 'opt-1',
        label: 'Option A',
        description: null,
        reference: null,
        status: PollOptionStatus.ACTIVE,
        createdAt: new Date(),
      } as PollOption;

      const pollWithCount = {
        ...draftPoll,
        status: PollStatus.ACTIVE,
        votesCount: 0,
        createdBy: {
          id: 'user-1',
          firstName: 'Admin',
          middleName: null,
          lastName: 'User',
          avatarUrl: null,
        },
        options: [option],
      };

      const pollQb = createMockQb();
      pollQb.getOne.mockResolvedValue(pollWithCount);
      pollRepo.createQueryBuilder.mockReturnValue(pollQb);

      const voteRepo = service['voteRepo'] as ReturnType<typeof mockVoteRepo>;
      const voteQb = createMockQb();
      voteQb.getRawMany.mockResolvedValue([]); // no votes
      voteRepo.createQueryBuilder.mockReturnValue(voteQb);
      voteRepo.findOne.mockResolvedValue(null);

      const result = await service.findOne('poll-1', 'user-1');

      expect(result.options[0].percentage).toBe(0);
      expect(result.options[0].votesCount).toBe(0);
    });

    it('computes percentage rounded to 2 decimal places', async () => {
      const option = {
        id: 'opt-1',
        label: 'Option A',
        description: null,
        reference: null,
        status: PollOptionStatus.ACTIVE,
        createdAt: new Date(),
      } as PollOption;

      // 1 out of 3 votes = 33.33%
      const pollWithCount = {
        ...draftPoll,
        status: PollStatus.ACTIVE,
        votesCount: 3,
        createdBy: {
          id: 'user-1',
          firstName: 'Admin',
          middleName: null,
          lastName: 'User',
          avatarUrl: null,
        },
        options: [option],
      };

      const pollQb = createMockQb();
      pollQb.getOne.mockResolvedValue(pollWithCount);
      pollRepo.createQueryBuilder.mockReturnValue(pollQb);

      const voteRepo = service['voteRepo'] as ReturnType<typeof mockVoteRepo>;
      const countQb = createMockQb();
      countQb.getRawMany.mockResolvedValue([{ optionId: 'opt-1', count: '1' }]);
      voteRepo.createQueryBuilder.mockReturnValue(countQb);
      voteRepo.findOne.mockResolvedValue(null);

      const result = await service.findOne('poll-1', 'user-1');

      expect(result.options[0].percentage).toBe(33.33);
    });
  });
});
