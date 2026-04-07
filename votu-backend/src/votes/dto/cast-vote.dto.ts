import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class CastVoteDto {
  @ApiProperty({
    description: 'The ID of the poll option being voted for',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  optionId: string;

  @ApiProperty({
    description: 'The ID of the poll being voted on',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  pollId: string;
}
