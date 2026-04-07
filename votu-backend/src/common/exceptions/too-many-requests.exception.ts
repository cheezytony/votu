import { HttpException, HttpStatus } from '@nestjs/common';

export class TooManyRequestsException extends HttpException {
  constructor(retryAfterSeconds?: number, message = 'Too many requests') {
    const body: Record<string, unknown> = {
      statusCode: HttpStatus.TOO_MANY_REQUESTS,
      error: 'Too Many Requests',
      message,
    };
    if (retryAfterSeconds !== undefined && retryAfterSeconds > 0) {
      body['retryAfter'] = retryAfterSeconds;
    }
    super(body, HttpStatus.TOO_MANY_REQUESTS);
  }
}
