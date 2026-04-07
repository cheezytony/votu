import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  PollOption,
  PollOptionStatus,
} from '../polls/entities/poll-option.entity';
import { Poll, PollStatus } from '../polls/entities/poll.entity';
import { CastVoteDto } from './dto/cast-vote.dto';
import { ListVotesQueryDto } from './dto/list-votes-query.dto';
import { Vote } from './entities/vote.entity';

export interface VoteEnvelopePollOption {
  id: string;
  label: string;
  votesCount: number;
  percentage: number;
}

export interface VoteEnvelopePoll {
  id: string;
  votesCount: number;
  options: VoteEnvelopePollOption[];
  myVote: {
    id: string;
    optionId: string;
    optionLabel: string;
    createdAt: Date;
    updatedAt: Date;
  };
}

export interface VoteEnvelope {
  vote: {
    id: string;
    option: { id: string; label: string };
    createdAt: Date;
    updatedAt: Date;
  };
  poll: VoteEnvelopePoll;
}

@Injectable()
export class VotesService {
  constructor(
    @InjectRepository(Vote)
    private readonly voteRepo: Repository<Vote>,
    @InjectRepository(Poll)
    private readonly pollRepo: Repository<Poll>,
    @InjectRepository(PollOption)
    private readonly optionRepo: Repository<PollOption>,
    private readonly dataSource: DataSource,
  ) {}

  async listVotes(query: ListVotesQueryDto): Promise<{
    data: {
      id: string;
      voter: { id: string; displayName: string; avatarUrl: string | null };
      option: { id: string; label: string };
      createdAt: Date;
      updatedAt: Date;
    }[];
    meta: { page: number; limit: number; total: number };
  }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const qb = this.voteRepo
      .createQueryBuilder('vote')
      .leftJoinAndSelect('vote.voter', 'voter')
      .leftJoinAndSelect('vote.option', 'option')
      .leftJoinAndSelect('vote.poll', 'poll');

    if (query.pollReference) {
      qb.andWhere('poll.reference = :pollReference', {
        pollReference: query.pollReference,
      });
    }
    if (query.pollOptionReference) {
      qb.andWhere('option.reference = :pollOptionReference', {
        pollOptionReference: query.pollOptionReference,
      });
    }
    if (query.userReference) {
      qb.andWhere('voter.reference = :userReference', {
        userReference: query.userReference,
      });
    }

    qb.orderBy('vote.createdAt', 'ASC').skip(skip).take(limit);

    const [votes, total] = await qb.getManyAndCount();

    const data = votes.map((v) => ({
      id: v.id,
      voter: {
        id: v.voter.id,
        displayName: this.formatDisplayName(v.voter),
        avatarUrl: v.voter.avatarUrl,
      },
      option: { id: v.option.id, label: v.option.label },
      createdAt: v.createdAt,
      updatedAt: v.updatedAt,
    }));

    return { data, meta: { page, limit, total } };
  }

  async castVote(
    pollId: string,
    dto: CastVoteDto,
    userId: string,
  ): Promise<VoteEnvelope> {
    const poll = await this.pollRepo.findOne({ where: { id: pollId } });
    if (!poll) throw new NotFoundException('Poll not found');
    if (poll.status !== PollStatus.ACTIVE) {
      throw new UnprocessableEntityException(
        'Voting is only allowed on active polls',
      );
    }

    const option = await this.optionRepo.findOne({
      where: { id: dto.optionId, pollId },
    });
    if (!option) throw new NotFoundException('Option not found in this poll');
    if (option.status !== PollOptionStatus.ACTIVE) {
      throw new UnprocessableEntityException(
        'The selected option is not available',
      );
    }

    const existing = await this.voteRepo.findOne({
      where: { pollId, userId },
    });
    if (existing)
      throw new UnprocessableEntityException(
        'You have already voted on this poll',
      );

    const vote = this.voteRepo.create({
      pollId,
      userId,
      optionId: dto.optionId,
    });
    const saved = await this.voteRepo.save(vote);

    return this.buildEnvelope(saved.id, pollId);
  }

  async changeVote(
    pollId: string,
    dto: CastVoteDto,
    userId: string,
  ): Promise<VoteEnvelope> {
    const poll = await this.pollRepo.findOne({ where: { id: pollId } });
    if (!poll) throw new NotFoundException('Poll not found');
    if (poll.status !== PollStatus.ACTIVE) {
      throw new UnprocessableEntityException(
        'Voting is only allowed on active polls',
      );
    }
    if (!poll.canChangeOption) {
      throw new ForbiddenException('This poll does not allow changing votes');
    }

    const existing = await this.voteRepo.findOne({
      where: { pollId, userId },
    });
    if (!existing)
      throw new NotFoundException('No existing vote found to change');

    const option = await this.optionRepo.findOne({
      where: { id: dto.optionId, pollId },
    });
    if (!option) throw new NotFoundException('Option not found in this poll');
    if (option.status !== PollOptionStatus.ACTIVE) {
      throw new UnprocessableEntityException(
        'The selected option is not available',
      );
    }

    existing.optionId = dto.optionId;
    const saved = await this.voteRepo.save(existing);

    return this.buildEnvelope(saved.id, pollId);
  }

  private async buildEnvelope(
    voteId: string,
    pollId: string,
  ): Promise<VoteEnvelope> {
    const vote = await this.voteRepo
      .createQueryBuilder('vote')
      .leftJoinAndSelect('vote.option', 'option')
      .where('vote.id = :voteId', { voteId })
      .getOne();

    if (!vote) throw new NotFoundException('Vote not found');

    // Aggregate option vote counts
    const optionVoteCounts = await this.voteRepo
      .createQueryBuilder('vote')
      .select('vote.optionId', 'optionId')
      .addSelect('COUNT(*)', 'count')
      .where('vote.pollId = :pollId', { pollId })
      .groupBy('vote.optionId')
      .getRawMany<{ optionId: string; count: string }>();

    const optionVoteMap = new Map(
      optionVoteCounts.map((r) => [r.optionId, parseInt(r.count, 10)]),
    );
    const totalVotes = optionVoteCounts.reduce(
      (sum, r) => sum + parseInt(r.count, 10),
      0,
    );

    // Load all active options for the poll
    const options = await this.optionRepo.find({
      where: { pollId, status: PollOptionStatus.ACTIVE },
      order: { createdAt: 'ASC' },
    });

    const envelopeOptions: VoteEnvelopePollOption[] = options.map((o) => {
      const vc = optionVoteMap.get(o.id) ?? 0;
      return {
        id: o.id,
        label: o.label,
        votesCount: vc,
        percentage:
          totalVotes > 0 ? Math.round((vc / totalVotes) * 10000) / 100 : 0,
      };
    });

    return {
      vote: {
        id: vote.id,
        option: { id: vote.option.id, label: vote.option.label },
        createdAt: vote.createdAt,
        updatedAt: vote.updatedAt,
      },
      poll: {
        id: pollId,
        votesCount: totalVotes,
        options: envelopeOptions,
        myVote: {
          id: vote.id,
          optionId: vote.optionId,
          optionLabel: vote.option.label,
          createdAt: vote.createdAt,
          updatedAt: vote.updatedAt,
        },
      },
    };
  }

  private formatDisplayName(user: {
    firstName: string;
    middleName: string | null;
    lastName: string;
  }): string {
    if (user.middleName) {
      return `${user.firstName} ${user.middleName[0].toUpperCase()}. ${user.lastName}`;
    }
    return `${user.firstName} ${user.lastName}`;
  }
}
