import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { AccessibleProfile } from '@snooker/shared';
import { CurrentUserId } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProfileAccessService } from './profile-access.service';

@ApiTags('profiles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('profiles')
export class ProfilesController {
  constructor(private readonly access: ProfileAccessService) {}

  /** Cabinets the current user can switch between (own + shared). */
  @Get('accessible')
  accessible(@CurrentUserId() userId: string): Promise<AccessibleProfile[]> {
    return this.access.listAccessible(userId);
  }
}
