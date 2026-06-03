import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import type { RoleType } from '@prisma/client';
import { ErrorCodes } from '@snooker/shared';
import { TokensService } from '../tokens.service';

export interface AuthedRequest extends Request {
  userId: string;
  roles?: RoleType[];
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly tokens: TokensService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthedRequest>();
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException({ error: { code: ErrorCodes.Auth.Unauthorized } });
    }
    const token = header.slice(7);
    const payload = await this.tokens.verifyAccess(token);
    req.userId = payload.sub;
    return true;
  }
}
