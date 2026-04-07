import { IsString, Length, Matches } from 'class-validator';

export class VerifyCodeDto {
  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/, { message: 'code must be exactly 6 digits' })
  code: string;
}
