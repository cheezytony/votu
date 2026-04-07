import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { User } from './user.entity';

@Entity('user_emails')
export class UserEmail {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @ManyToOne(() => User, (user) => user.emails, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ unique: true })
  email: string;

  @Column({ default: false })
  isActivated: boolean;

  @Exclude()
  @Column({ type: 'varchar', nullable: true })
  verificationCode: string | null;

  @Exclude()
  @Column({ type: 'timestamptz', nullable: true })
  codeExpiresAt: Date | null;

  @Exclude()
  @Column({ default: 0 })
  codeAttempts: number;

  @Column({ type: 'timestamptz', nullable: true })
  verifiedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
