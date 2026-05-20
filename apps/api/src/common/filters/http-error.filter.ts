import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ErrorCodes } from '@snooker/shared';

interface ErrorPayload {
  error: { code: string; message?: string; details?: unknown };
}

@Catch()
export class HttpErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpErrorFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      const payload = this.normalize(body);
      res.status(status).json(payload);
      return;
    }

    this.logger.error(
      `Unhandled error on ${req.method} ${req.url}`,
      exception instanceof Error ? exception.stack : String(exception),
    );
    const payload: ErrorPayload = {
      error: { code: ErrorCodes.Generic.Internal },
    };
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(payload);
  }

  private normalize(body: unknown): ErrorPayload {
    if (typeof body === 'object' && body !== null && 'error' in body) {
      return body as ErrorPayload;
    }
    if (typeof body === 'string') {
      return { error: { code: ErrorCodes.Generic.Internal, message: body } };
    }
    if (typeof body === 'object' && body !== null && 'message' in body) {
      const m = (body as { message: unknown }).message;
      const message = Array.isArray(m) ? m.join(', ') : String(m);
      return { error: { code: ErrorCodes.Generic.Internal, message } };
    }
    return { error: { code: ErrorCodes.Generic.Internal } };
  }
}
