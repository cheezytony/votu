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

@Entity('user_phones')
export class UserPhone {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @ManyToOne(() => User, (user) => user.phones, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ unique: true })
  phone: string;

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
