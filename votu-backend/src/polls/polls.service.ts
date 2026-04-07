import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { nanoid } from 'nanoid';
import { DataSource, Repository } from 'typeorm';
import { Vote } from '../votes/entities/vote.entity';
import { CreatePollDto } from './dto/create-poll.dto';
import { ListPollsQueryDto } from './dto/list-polls-query.dto';
import { UpdatePollDto } from './dto/update-poll.dto';
import { PollOption, PollOptionStatus } from './entities/poll-option.entity';
import { Poll, PollStatus } from './entities/poll.entity';

export interface CreatedByShape {
  id: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface MyVoteShape {
  id: string;
  optionId: string;
  optionLabel: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PollOptionResponse {
  id: string;
  label: string;
  description: string | null;
  reference: string | null;
  status: PollOptionStatus;
  votesCount: number;
  percentage: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface FullPollResponse {
  id: string;
  title: string;
  description: string | null;
  reference: string | null;
  status: PollStatus;
  canChangeOption: boolean;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: CreatedByShape;
  options: PollOptionResponse[];
  votesCount: number;
  myVote?: MyVoteShape | null;
}

export interface PollSummaryResponse {
  id: string;
  title: string;
  description: string | null;
  reference: string | null;
  status: PollStatus;
  canChangeOption: boolean;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: CreatedByShape;
  optionsCount: number;
  votesCount: number;
  myVote?: MyVoteShape | null;
}

// TypeORM `loadRelationCountAndMap` augments entity objects with virtual count
// properties not present in the entity class — these typed intersections make
// that explicit without resorting to `any`.
type PollWithCounts = Poll & { optionsCount: number; votesCount: number };
type PollWithVoteCount = Poll & { votesCount: number };
@Injectable()
export class PollsService {
  constructor(
    @InjectRepository(Poll)
    private readonly pollRepo: Repository<Poll>,
    @InjectRepository(PollOption)
    private readonly optionRepo: Repository<PollOption>,
    @InjectRepository(Vote)
    private readonly voteRepo: Repository<Vote>,
    private readonly dataSource: DataSource,
  ) {}

  async findOneByReference(
    reference: string,
    userId?: string,
  ): Promise<FullPollResponse> {
    const poll = await this.pollRepo.findOne({
      where: { reference },
      relations: ['createdBy', 'options'],
    });

    if (!poll) {
      throw new NotFoundException('Poll not found');
    }

    return this.findOne(poll.id, userId);
  }

  async findOptionByReference(reference: string): Promise<PollOption> {
    const option = await this.optionRepo.findOne({
      where: { reference },
      relations: ['poll', 'poll.createdBy'],
    });

    if (!option) {
      throw new NotFoundException('Poll option not found');
    }

    return option;
  }

  async findAll(
    query: ListPollsQueryDto,
    userId?: string,
  ): Promise<{
    data: PollSummaryResponse[];
    meta: { page: number; limit: number; total: number };
  }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const qb = this.pollRepo
      .createQueryBuilder('poll')
      .leftJoinAndSelect('poll.createdBy', 'createdBy')
      .loadRelationCountAndMap(
        'poll.optionsCount',
        'poll.options',
        'opt',
        (qb) =>
          qb.andWhere('opt.status = :optStatus', {
            optStatus: PollOptionStatus.ACTIVE,
          }),
      )
      .loadRelationCountAndMap('poll.votesCount', 'poll.votes')
      .orderBy('poll.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (query.status) {
      qb.andWhere('poll.status = :status', { status: query.status });
    }

    if (query.q) {
      qb.andWhere('poll.title ILIKE :q', { q: `%${query.q}%` });
    }

    const [polls, total] = (await qb.getManyAndCount()) as [
      PollWithCounts[],
      number,
    ];

    // Load myVote for authenticated users
    let voteMap: Map<string, Vote> = new Map();
    if (userId && polls.length > 0) {
      const pollIds = polls.map((p) => p.id);
      const votes = await this.voteRepo
        .createQueryBuilder('vote')
        .leftJoinAndSelect('vote.option', 'option')
        .where('vote.pollId IN (:...pollIds)', { pollIds })
        .andWhere('vote.userId = :userId', { userId })
        .getMany();
      voteMap = new Map(votes.map((v) => [v.pollId, v]));
    }

    const data = polls.map((poll) => {
      const summary: PollSummaryResponse = {
        id: poll.id,
        title: poll.title,
        description: poll.description,
        reference: poll.reference,
        status: poll.status,
        canChangeOption: poll.canChangeOption,
        expiresAt: poll.expiresAt,
        createdAt: poll.createdAt,
        updatedAt: poll.updatedAt,
        createdBy: this.mapCreatedBy(poll),
        optionsCount: poll.optionsCount,
        votesCount: poll.votesCount,
      };

      if (userId !== undefined) {
        const vote = voteMap.get(poll.id);
        summary.myVote = vote ? this.mapMyVote(vote) : null;
      }

      return summary;
    });

    return { data, meta: { page, limit, total } };
  }

  async findOne(pollId: string, userId?: string): Promise<FullPollResponse> {
    const poll = (await this.pollRepo
      .createQueryBuilder('poll')
      .leftJoinAndSelect('poll.createdBy', 'createdBy')
      .leftJoinAndSelect('poll.options', 'option')
      .loadRelationCountAndMap('poll.votesCount', 'poll.votes')
      .where('poll.id = :pollId', { pollId })
      .getOne()) as PollWithVoteCount | null;

    if (!poll) {
      throw new NotFoundException('Poll not found');
    }

    // Load vote counts per option
    const optionVoteCounts: { optionId: string; count: string }[] =
      await this.voteRepo
        .createQueryBuilder('vote')
        .select('vote.optionId', 'optionId')
        .addSelect('COUNT(*)', 'count')
        .where('vote.pollId = :pollId', { pollId })
        .groupBy('vote.optionId')
        .getRawMany<{ optionId: string; count: string }>();

    const optionVoteMap = new Map(
      optionVoteCounts.map((r) => [r.optionId, parseInt(r.count, 10)]),
    );

    const totalVotes = poll.votesCount;

    // Filter out disabled options for active/closed polls
    const hideDisabled =
      poll.status === PollStatus.ACTIVE || poll.status === PollStatus.CLOSED;

    const options: PollOptionResponse[] = (poll.options ?? [])
      .filter((o) => !hideDisabled || o.status === PollOptionStatus.ACTIVE)
      .map((o) => {
        const vc = optionVoteMap.get(o.id) ?? 0;
        return {
          id: o.id,
          label: o.label,
          description: o.description,
          reference: o.reference,
          status: o.status,
          votesCount: vc,
          percentage:
            totalVotes > 0 ? Math.round((vc / totalVotes) * 10000) / 100 : 0,
          createdAt: o.createdAt,
          updatedAt: o.updatedAt,
        };
      });

    let myVote: MyVoteShape | null | undefined;
    if (userId !== undefined) {
      const vote = await this.voteRepo
        .createQueryBuilder('vote')
        .leftJoinAndSelect('vote.option', 'option')
        .where('vote.pollId = :pollId AND vote.userId = :userId', {
          pollId,
          userId,
        })
        .getOne();
      myVote = vote ? this.mapMyVote(vote) : null;
    }

    const response: FullPollResponse = {
      id: poll.id,
      title: poll.title,
      description: poll.description,
      reference: poll.reference,
      status: poll.status,
      canChangeOption: poll.canChangeOption,
      expiresAt: poll.expiresAt,
      createdAt: poll.createdAt,
      updatedAt: poll.updatedAt,
      createdBy: this.mapCreatedBy(poll),
      options,
      votesCount: totalVotes,
    };

    if (userId !== undefined) {
      response.myVote = myVote;
    }

    return response;
  }

  async create(dto: CreatePollDto, userId: string): Promise<FullPollResponse> {
    let createdPollId!: string;
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const poll = queryRunner.manager.create(Poll, {
        userId,
        title: dto.title,
        description: dto.description ?? null,
        reference: nanoid(12),
        canChangeOption: dto.canChangeOption ?? false,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        status: PollStatus.DRAFT,
      });
      const savedPoll = await queryRunner.manager.save(Poll, poll);
      createdPollId = savedPoll.id;

      const options = dto.options.map((o) =>
        queryRunner.manager.create(PollOption, {
          pollId: savedPoll.id,
          label: o.label,
          description: o.description ?? null,
          reference: nanoid(12),
          status: PollOptionStatus.ACTIVE,
        }),
      );
      await queryRunner.manager.save(PollOption, options);

      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();

      throw err;
    } finally {
      await queryRunner.release();
    }

    return this.findOne(createdPollId, userId);
  }

  async update(
    pollId: string,
    dto: UpdatePollDto,
    userId: string,
  ): Promise<FullPollResponse> {
    const poll = await this.pollRepo.findOne({
      where: { id: pollId },
      relations: ['options'],
    });

    if (!poll) {
      throw new NotFoundException('Poll not found');
    }

    if (poll.userId !== userId) {
      throw new ForbiddenException('Not the poll owner');
    }

    if (poll.status !== PollStatus.DRAFT) {
      throw new UnprocessableEntityException('Only draft polls can be edited');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      if (dto.title !== undefined) poll.title = dto.title;

      if (Object.prototype.hasOwnProperty.call(dto, 'description'))
        poll.description = dto.description ?? null;

      // reference is immutable and should not be updated
      if (dto.canChangeOption !== undefined)
        poll.canChangeOption = dto.canChangeOption;

      if (Object.prototype.hasOwnProperty.call(dto, 'expiresAt'))
        poll.expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;

      await queryRunner.manager.save(Poll, poll);

      if (dto.options !== undefined) {
        const existingOptions = poll.options ?? [];
        const incomingRefs = new Set(
          dto.options.map((o) => o.reference).filter(Boolean),
        );

        // Delete options not present in the incoming list
        const toDelete = existingOptions.filter(
          (o) => !incomingRefs.has(o.reference),
        );

        if (toDelete.length) {
          await queryRunner.manager.delete(
            PollOption,
            toDelete.map((o) => o.id),
          );
        }

        const existingByRef = new Map(
          existingOptions.map((o) => [o.reference, o]),
        );

        for (const o of dto.options) {
          if (o.reference && existingByRef.has(o.reference)) {
            // Update existing option in-place, preserving its reference and id
            const existing = existingByRef.get(o.reference)!;
            existing.label = o.label;
            existing.description = o.description ?? null;

            if (o.status !== undefined) existing.status = o.status;

            await queryRunner.manager.save(PollOption, existing);
          } else {
            // Create new option with a fresh reference
            const created = queryRunner.manager.create(PollOption, {
              pollId,
              label: o.label,
              description: o.description ?? null,
              reference: nanoid(),
              status: o.status ?? PollOptionStatus.ACTIVE,
            });

            await queryRunner.manager.save(PollOption, created);
          }
        }
      }

      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();

      throw err;
    } finally {
      await queryRunner.release();
    }

    return this.findOne(pollId, userId);
  }

  async activate(pollId: string, userId: string): Promise<FullPollResponse> {
    const poll = await this.pollRepo.findOne({ where: { id: pollId } });

    if (!poll) {
      throw new NotFoundException('Poll not found');
    }

    if (poll.userId !== userId) {
      throw new ForbiddenException('Not the poll owner');
    }

    if (poll.status !== PollStatus.DRAFT) {
      throw new UnprocessableEntityException(
        'Only draft polls can be activated',
      );
    }

    poll.status = PollStatus.ACTIVE;
    await this.pollRepo.save(poll);

    return this.findOne(pollId, userId);
  }

  private mapCreatedBy(poll: Poll): CreatedByShape {
    const user = poll.createdBy;
    let displayName = '';
    if (user) {
      displayName = user.middleName
        ? `${user.firstName} ${user.middleName[0].toUpperCase()}. ${user.lastName}`
        : `${user.firstName} ${user.lastName}`;
    }
    return {
      id: user?.id ?? poll.userId,
      displayName,
      avatarUrl: user?.avatarUrl ?? null,
    };
  }

  private mapMyVote(vote: Vote): MyVoteShape {
    return {
      id: vote.id,
      optionId: vote.optionId,
      optionLabel: vote.option.label,
      createdAt: vote.createdAt,
      updatedAt: vote.updatedAt,
    };
  }
}
