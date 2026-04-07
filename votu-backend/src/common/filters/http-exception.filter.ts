import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let error = 'Internal Server Error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
        error = this.getErrorText(status);
      } else if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null
      ) {
        const res = exceptionResponse as Record<string, unknown>;
        message = (res['message'] as string | string[]) ?? message;
        error = (res['error'] as string) ?? this.getErrorText(status);

        // Add Retry-After header for 429 responses
        if (status === HttpStatus.TOO_MANY_REQUESTS && res['retryAfter']) {
          response.setHeader('Retry-After', String(res['retryAfter']));
        }
      }
    } else {
      // Unknown / unexpected exception — log full stack trace
      error = this.getErrorText(status);
      if (exception instanceof Error) {
        message = exception.message;
      }
    }

    this.log(status, request, exception, message);

    response.status(status).json({ statusCode: status, error, message });
  }

  private log(
    status: number,
    request: Request,
    exception: unknown,
    message: string | string[],
  ): void {
    const context = `${request.method} ${request.url}`;
    const summary = Array.isArray(message) ? message.join('; ') : message;

    if (status >= 500) {
      // Always log stack trace for server errors
      if (exception instanceof Error) {
        this.logger.error(
          `[${status}] ${context} — ${summary}`,
          exception.stack,
        );
      } else {
        this.logger.error(
          `[${status}] ${context} — ${summary}`,
          String(exception),
        );
      }
    } else if (status >= 400) {
      // Client errors: compact one-liner (no stack needed)
      this.logger.warn(`[${status}] ${context} — ${summary}`);
    }
  }

  private getErrorText(status: number): string {
    const texts: Record<number, string> = {
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      409: 'Conflict',
      422: 'Unprocessable Entity',
      429: 'Too Many Requests',
      500: 'Internal Server Error',
    };
    return texts[status] ?? 'Unknown Error';
  }
}
