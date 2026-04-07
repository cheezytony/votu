import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';

const mockUserRepo = () => ({
  findOne: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
});

const mockConfigService = {
  get: jest.fn().mockImplementation((key: string, def?: string) => {
    if (key === 'AVATAR_URL_ALLOWLIST')
      return 'https://avatars.githubusercontent.com,https://lh3.googleusercontent.com';
    return def;
  }),
};

describe('UsersService', () => {
  let service: UsersService;
  let userRepo: ReturnType<typeof mockUserRepo>;

  const mockUser: Partial<User> = {
    id: 'user-1',
    firstName: 'John',
    middleName: null,
    lastName: 'Doe',
    avatarUrl: null,
    passwordHash: 'hashed',
    emails: [],
    phones: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useFactory: mockUserRepo },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    userRepo = module.get(getRepositoryToken(User));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('returns user with emails and phones', async () => {
      userRepo.findOne.mockResolvedValue(mockUser);

      const result = await service.findById('user-1');

      expect(result).toBe(mockUser);
      expect(userRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        relations: { emails: true, phones: true },
      });
    });

    it('throws NotFoundException when user not found', async () => {
      userRepo.findOne.mockResolvedValue(null);

      await expect(service.findById('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateMe', () => {
    it('updates allowed fields', async () => {
      userRepo.findOne
        .mockResolvedValueOnce({ ...mockUser })
        .mockResolvedValueOnce({ ...mockUser, firstName: 'Jane' });

      const result = await service.updateMe('user-1', { firstName: 'Jane' });

      expect(userRepo.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('rejects avatarUrl from non-allowlisted domain with 400', async () => {
      userRepo.findOne.mockResolvedValue({ ...mockUser });

      await expect(
        service.updateMe('user-1', {
          avatarUrl: 'https://evil.com/avatar.jpg',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects avatarUrl with http:// scheme', async () => {
      userRepo.findOne.mockResolvedValue({ ...mockUser });

      await expect(
        service.updateMe('user-1', {
          avatarUrl: 'http://avatars.githubusercontent.com/avatar.jpg',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('accepts avatarUrl from allowlisted domain', async () => {
      const updatedUser = {
        ...mockUser,
        avatarUrl: 'https://avatars.githubusercontent.com/u/1.jpg',
      };
      userRepo.findOne
        .mockResolvedValueOnce({ ...mockUser })
        .mockResolvedValueOnce(updatedUser);
      userRepo.save.mockResolvedValue(undefined);

      const result = await service.updateMe('user-1', {
        avatarUrl: 'https://avatars.githubusercontent.com/u/1.jpg',
      });

      expect(result.avatarUrl).toBe(
        'https://avatars.githubusercontent.com/u/1.jpg',
      );
    });

    it('accepts null avatarUrl to clear the avatar', async () => {
      userRepo.findOne
        .mockResolvedValueOnce({
          ...mockUser,
          avatarUrl: 'https://avatars.githubusercontent.com/u/1.jpg',
        })
        .mockResolvedValueOnce({ ...mockUser, avatarUrl: null });
      userRepo.save.mockResolvedValue(undefined);

      const result = await service.updateMe('user-1', { avatarUrl: null });

      expect(result.avatarUrl).toBeNull();
    });
  });
});
