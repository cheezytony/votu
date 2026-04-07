import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, Max, Min } from 'class-validator';

export class ListVotesQueryDto {
  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ description: 'Reference of the poll to filter votes' })
  @IsOptional()
  pollReference?: string;

  @ApiPropertyOptional({
    description: 'Reference of the poll option to filter votes',
  })
  @IsOptional()
  pollOptionReference?: string;

  @ApiPropertyOptional({ description: 'Reference of the user to filter votes' })
  @IsOptional()
  userReference?: string;
}
