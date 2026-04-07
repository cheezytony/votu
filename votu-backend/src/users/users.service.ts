import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { User } from './entities/user.entity';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  private readonly avatarAllowlist: string[];

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly configService: ConfigService,
  ) {
    const raw = this.configService.get<string>('AVATAR_URL_ALLOWLIST', '');
    this.avatarAllowlist = raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  async findById(id: string): Promise<User> {
    const user = await this.userRepo.findOne({
      where: { id },
      relations: { emails: true, phones: true },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async updateMe(id: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.findById(id);

    if (dto.avatarUrl !== undefined) {
      if (dto.avatarUrl !== null) {
        this.validateAvatarUrl(dto.avatarUrl);
      }
      user.avatarUrl = dto.avatarUrl ?? null;
    }
    if (dto.firstName !== undefined) user.firstName = dto.firstName;
    if (dto.middleName !== undefined) user.middleName = dto.middleName ?? null;
    if (dto.lastName !== undefined) user.lastName = dto.lastName;

    await this.userRepo.save(user);

    return this.findById(id);
  }

  private validateAvatarUrl(url: string): void {
    if (!url.startsWith('https://')) {
      throw new BadRequestException('avatarUrl must use HTTPS');
    }
    if (url.length > 2048) {
      throw new BadRequestException(
        'avatarUrl must not exceed 2048 characters',
      );
    }
    let hostname: string;
    try {
      hostname = new URL(url).hostname;
    } catch {
      throw new BadRequestException('avatarUrl is not a valid URL');
    }
    const allowed = this.avatarAllowlist.some((entry) => {
      try {
        return new URL(entry).hostname === hostname;
      } catch {
        return entry === hostname;
      }
    });
    if (!allowed) {
      throw new BadRequestException(
        'avatarUrl domain is not in the allowed list',
      );
    }
  }
}
