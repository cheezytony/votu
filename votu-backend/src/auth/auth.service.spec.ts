import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { sha256 } from '../common/utils/crypto.util';
import { NotificationsService } from '../notifications/notifications.service';
import { REDIS_CLIENT } from '../redis/redis.module';
import { UserEmail } from '../users/entities/user-email.entity';
import { User } from '../users/entities/user.entity';
import { AuthService } from './auth.service';
import { RefreshToken } from './entities/refresh-token.entity';

const mockUserRepo = () => ({
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
});

const mockUserEmailRepo = () => ({
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
});

const mockRefreshTokenRepo = () => ({
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
  delete: jest.fn(),
  query: jest.fn(),
});

const mockRedis = {
  get: jest.fn(),
  incr: jest.fn(),
  expire: jest.fn(),
  ttl: jest.fn(),
  del: jest.fn(),
};

const mockJwtService = {
  sign: jest.fn().mockReturnValue('mock-access-token'),
};

const mockConfigService = {
  get: jest.fn().mockImplementation((key: string) => {
    if (key === 'JWT_SECRET') return 'test-secret';
    if (key === 'JWT_EXPIRES_IN') return '15m';
    return undefined;
  }),
};

const mockNotificationsService = {
  sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
  sendVerificationSms: jest.fn().mockResolvedValue(undefined),
};

describe('AuthService', () => {
  let service: AuthService;
  let userRepo: ReturnType<typeof mockUserRepo>;
  let userEmailRepo: ReturnType<typeof mockUserEmailRepo>;
  let refreshTokenRepo: ReturnType<typeof mockRefreshTokenRepo>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useFactory: mockUserRepo },
        {
          provide: getRepositoryToken(UserEmail),
          useFactory: mockUserEmailRepo,
        },
        {
          provide: getRepositoryToken(RefreshToken),
          useFactory: mockRefreshTokenRepo,
        },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: REDIS_CLIENT, useValue: mockRedis },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepo = module.get(getRepositoryToken(User));
    userEmailRepo = module.get(getRepositoryToken(UserEmail));
    refreshTokenRepo = module.get(getRepositoryToken(RefreshToken));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('creates user, email, queues job, and returns tokens', async () => {
      const mockUser = {
        id: 'user-1',
        firstName: 'John',
        lastName: 'Doe',
        phones: [],
      } as User;
      const mockEmail = {
        id: 'email-1',
        email: 'john@example.com',
        userId: 'user-1',
      } as UserEmail;
      const mockToken = { id: 'token-1' } as RefreshToken;

      userEmailRepo.findOne.mockResolvedValue(null); // no existing email
      userRepo.create.mockReturnValue(mockUser);
      userRepo.save.mockResolvedValue(mockUser);
      userEmailRepo.create.mockReturnValue(mockEmail);

      userEmailRepo.save.mockResolvedValue(mockEmail);
      refreshTokenRepo.create.mockReturnValue(mockToken);
      refreshTokenRepo.save.mockResolvedValue(mockToken);

      const result = await service.register({
        email: 'john@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
      });

      expect(userRepo.create).toHaveBeenCalled();
      expect(userRepo.save).toHaveBeenCalled();
      expect(userEmailRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'john@example.com',
          isActivated: true,
        }),
      );
      expect(mockNotificationsService.sendVerificationEmail).toHaveBeenCalled();
      expect(result.accessToken).toBe('mock-access-token');
      expect(result.refreshToken).toBeDefined();
      expect(result.user).toBe(mockUser);
    });

    it('throws ConflictException if email already registered', async () => {
      userEmailRepo.findOne.mockResolvedValue({ email: 'exists@test.com' });

      await expect(
        service.register({
          email: 'exists@test.com',
          password: 'password123',
          firstName: 'John',
          lastName: 'Doe',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    const mockUser = {
      id: 'user-1',
      passwordHash: '',
      emails: [],
      phones: [],
    } as unknown as User;

    beforeEach(() => {
      mockRedis.get.mockResolvedValue(null); // no rate limit hit
    });

    it('returns tokens on valid credentials', async () => {
      const hash = await bcrypt.hash('correct-password', 12);
      mockUser.passwordHash = hash;

      userEmailRepo.findOne.mockResolvedValue({ user: mockUser });
      userRepo.findOne.mockResolvedValue(mockUser);
      const mockToken = { id: 'token-1' } as RefreshToken;
      refreshTokenRepo.create.mockReturnValue(mockToken);
      refreshTokenRepo.save.mockResolvedValue(mockToken);

      const result = await service.login(
        'test@test.com',
        'correct-password',
        '127.0.0.1',
      );

      expect(result.accessToken).toBe('mock-access-token');
      expect(result.refreshToken).toBeDefined();
    });

    it('throws UnauthorizedException on wrong password', async () => {
      const hash = await bcrypt.hash('correct-password', 12);
      mockUser.passwordHash = hash;

      userEmailRepo.findOne.mockResolvedValue({ user: mockUser });
      mockRedis.incr.mockResolvedValue(1);
      mockRedis.expire.mockResolvedValue(1);

      await expect(
        service.login('test@test.com', 'wrong-password', '127.0.0.1'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException on unknown email', async () => {
      userEmailRepo.findOne.mockResolvedValue(null);
      mockRedis.incr.mockResolvedValue(1);
      mockRedis.expire.mockResolvedValue(1);

      await expect(
        service.login('unknown@test.com', 'any-password', '127.0.0.1'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('deletes the refresh token row', async () => {
      refreshTokenRepo.delete.mockResolvedValue({ affected: 1 });

      await service.logout('raw-refresh-token');

      expect(refreshTokenRepo.delete).toHaveBeenCalledWith({
        tokenHash: sha256('raw-refresh-token'),
      });
    });
  });

  describe('refresh', () => {
    it('rotates refresh token and returns new tokens', async () => {
      const mockUser = {
        id: 'user-1',
        emails: [],
        phones: [],
      } as unknown as User;

      refreshTokenRepo.query.mockResolvedValue([{ userId: 'user-1' }]);
      userRepo.findOne.mockResolvedValue(mockUser);
      const newToken = { id: 'token-2' } as RefreshToken;
      refreshTokenRepo.create.mockReturnValue(newToken);
      refreshTokenRepo.save.mockResolvedValue(newToken);

      const result = await service.refresh('old-token');

      expect(refreshTokenRepo.query).toHaveBeenCalled();
      expect(result.accessToken).toBe('mock-access-token');
      expect(result.refreshToken).toBeDefined();
    });

    it('throws UnauthorizedException on expired token', async () => {
      refreshTokenRepo.query.mockResolvedValue([]); // empty = not found or expired

      await expect(service.refresh('expired-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws UnauthorizedException on missing token', async () => {
      refreshTokenRepo.query.mockResolvedValue([]);

      await expect(service.refresh('nonexistent-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
