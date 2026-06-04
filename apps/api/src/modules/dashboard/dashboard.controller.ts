import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { PlayerDashboard } from '@snooker/shared';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ActiveProfileGuard } from '../profiles/guards/active-profile.guard';
import { ActiveProfile } from '../profiles/decorators/active-profile.decorator';
import type { ProfileContext } from '../profiles/profile-context';
import { DashboardService } from './dashboard.service';

@ApiTags('dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ActiveProfileGuard)
@Controller('players/me/dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get()
  get(@ActiveProfile() ctx: ProfileContext | null): Promise<PlayerDashboard> {
    return this.dashboard.getPlayerDashboard(ctx?.profileId ?? null);
  }
}
