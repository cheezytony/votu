import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Poll } from './poll.entity';

export enum PollOptionStatus {
  ACTIVE = 'active',
  DISABLED = 'disabled',
}

@Entity('poll_options')
export class PollOption {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  pollId: string;

  @ManyToOne(() => Poll, (poll) => poll.options, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pollId' })
  poll: Poll;

  @Column()
  label: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', unique: true })
  reference: string;

  @Column({
    type: 'enum',
    enum: PollOptionStatus,
    default: PollOptionStatus.ACTIVE,
  })
  status: PollOptionStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany('Vote', 'option')
  votes: import('../../votes/entities/vote.entity').Vote[];
}
