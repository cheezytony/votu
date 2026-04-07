import { createHash, randomInt } from 'crypto';

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function generateVerificationCode(): {
  code: string;
  hashedCode: string;
} {
  const code = randomInt(100000, 1000000).toString();
  const hashedCode = sha256(code);
  return { code, hashedCode };
}
