import { Exclude, Expose } from 'class-transformer';
import {
    Column,
    CreateDateColumn,
    Entity,
    OneToMany,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  reference: string;

  @Column()
  firstName: string;

  @Column({ type: 'varchar', nullable: true })
  middleName: string | null;

  @Column()
  lastName: string;

  @Column({ type: 'varchar', nullable: true })
  avatarUrl: string | null;

  @Exclude()
  @Column()
  passwordHash: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany('UserEmail', 'user')
  emails: import('./user-email.entity').UserEmail[];

  @OneToMany('UserPhone', 'user')
  phones: import('./user-phone.entity').UserPhone[];

  @Expose()
  get displayName(): string {
    if (this.middleName) {
      return `${this.firstName} ${this.middleName[0].toUpperCase()}. ${this.lastName}`;
    }
    return `${this.firstName} ${this.lastName}`;
  }
}
