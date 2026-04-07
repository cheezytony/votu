import { nanoid } from 'nanoid';
/**
 * Seed script: creates 1 admin user and 3 polls in mixed statuses.
 * Run with: pnpm ts-node -r tsconfig-paths/register src/database/seeds/seed.ts
 */
import * as dotenv from 'dotenv';
import 'reflect-metadata';
dotenv.config();

import * as bcrypt from 'bcrypt';
import {
  PollOption,
  PollOptionStatus,
} from '../../polls/entities/poll-option.entity';
import { Poll, PollStatus } from '../../polls/entities/poll.entity';
import { UserEmail } from '../../users/entities/user-email.entity';
import { User } from '../../users/entities/user.entity';
import dataSource from '../data-source';

const BCRYPT_ROUNDS = 12;

async function seed(): Promise<void> {
  await dataSource.initialize();

  const userRepo = dataSource.getRepository(User);
  const emailRepo = dataSource.getRepository(UserEmail);
  const pollRepo = dataSource.getRepository(Poll);
  const optionRepo = dataSource.getRepository(PollOption);

  // ── Admin user ──────────────────────────────────────────────────────────────
  const adminEmail = 'admin@votu.dev';
  const existing = await emailRepo.findOne({ where: { email: adminEmail } });

  let admin: User;
  if (existing) {
    console.log('Admin user already exists, skipping user creation.');
    admin = (await userRepo.findOne({ where: { id: existing.userId } }))!;
  } else {
    const passwordHash = await bcrypt.hash('Admin1234!', BCRYPT_ROUNDS);
    admin = userRepo.create({
      reference: nanoid(),
      firstName: 'Admin',
      lastName: 'User',
      middleName: null,
      avatarUrl: null,
      passwordHash,
    });
    await userRepo.save(admin);

    const email = emailRepo.create({
      userId: admin.id,
      email: adminEmail,
      isActivated: true,
      verifiedAt: new Date(),
      verificationCode: null,
      codeExpiresAt: null,
      codeAttempts: 0,
    });
    await emailRepo.save(email);
    console.log(`Created admin user: ${adminEmail} / Admin1234!`);
  }

  // ── Polls ────────────────────────────────────────────────────────────────────
  const pollsData = [
    {
      title: 'Best programming language 2025',
      description: 'Vote for the language you enjoy most.',
      status: PollStatus.ACTIVE,
      canChangeOption: true,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      options: ['TypeScript', 'Python', 'Go', 'Rust'],
    },
    {
      title: 'Preferred meeting day',
      description: 'Which weekday works best for the team standup?',
      status: PollStatus.DRAFT,
      canChangeOption: false,
      expiresAt: null,
      options: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    },
    {
      title: 'Office lunch spot',
      description: 'Where should we order lunch from on Fridays?',
      status: PollStatus.CLOSED,
      canChangeOption: false,
      expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // yesterday
      options: ['Pizza', 'Sushi', 'Tacos', 'Burgers'],
    },
  ];

  for (const pollData of pollsData) {
    const existingPoll = await pollRepo.findOne({
      where: { title: pollData.title },
    });
    if (existingPoll) {
      console.log(`Poll "${pollData.title}" already exists, skipping.`);
      continue;
    }

    const poll = pollRepo.create({
      title: pollData.title,
      description: pollData.description,
      reference: nanoid(12),
      status: pollData.status,
      canChangeOption: pollData.canChangeOption,
      expiresAt: pollData.expiresAt,
    });
    poll.userId = admin.id;

    await pollRepo.save(poll);

    for (const label of pollData.options) {
      const option = optionRepo.create({
        label,
        description: null,
        reference: nanoid(12),
        status: PollOptionStatus.ACTIVE,
      });
      option.pollId = poll.id;
      await optionRepo.save(option);
    }

    console.log(`Created poll: "${pollData.title}" [${pollData.status}]`);
  }

  await dataSource.destroy();
  console.log('Seed complete.');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
