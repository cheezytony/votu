import { IsString, Matches } from 'class-validator';

export class AddPhoneDto {
  @IsString()
  @Matches(/^\+[1-9]\d{1,14}$/, {
    message: 'Phone number must be in E.164 format (e.g. +15550001234)',
  })
  phone: string;
}
