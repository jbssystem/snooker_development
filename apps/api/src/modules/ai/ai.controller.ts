import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  GenerateExternalMatchReportSchema,
  GenerateWeeklyAiReportSchema,
  type AiReport,
  type GenerateExternalMatchReportInput,
  type GenerateWeeklyAiReportInput,
} from '@snooker/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { CuidValidationPipe } from '../../common/pipes/cuid-validation.pipe';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ActiveProfileGuard } from '../profiles/guards/active-profile.guard';
import {
  CurrentProfile,
  CurrentProfileId,
} from '../profiles/decorators/active-profile.decorator';
import { RequiresWellness } from '../profiles/decorators/access.decorators';
import type { ProfileContext } from '../profiles/profile-context';
import { AiService } from './ai.service';

// AI reports bundle wellness/supplement data, so the whole module is gated by
// wellness access (owner always has it; guests need it granted explicitly).
@ApiTags('ai')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ActiveProfileGuard)
@RequiresWellness()
@Controller('ai/reports')
export class AiController {
  constructor(private readonly ai: AiService) {}

  @Get()
  list(@CurrentProfileId() profileId: string): Promise<AiReport[]> {
    return this.ai.listReports(profileId);
  }

  @Get(':id')
  get(@CurrentProfileId() profileId: string, @Param('id', CuidValidationPipe) id: string): Promise<AiReport> {
    return this.ai.getReport(profileId, id);
  }

  @Post('generate')
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  generateWeekly(
    @CurrentProfile() ctx: ProfileContext,
    @Body(new ZodValidationPipe(GenerateWeeklyAiReportSchema)) body: GenerateWeeklyAiReportInput,
  ): Promise<AiReport> {
    return this.ai.generateWeeklyReport(ctx, body);
  }

  @Post('generate-external')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  generateExternal(
    @CurrentProfile() ctx: ProfileContext,
    @Body(new ZodValidationPipe(GenerateExternalMatchReportSchema)) body: GenerateExternalMatchReportInput,
  ): Promise<AiReport> {
    return this.ai.generateExternalMatchReport(ctx, body);
  }
}