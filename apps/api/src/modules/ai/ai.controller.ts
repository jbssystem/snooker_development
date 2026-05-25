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
import { CurrentUserId } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AiService } from './ai.service';

@ApiTags('ai')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai/reports')
export class AiController {
  constructor(private readonly ai: AiService) {}

  @Get()
  list(@CurrentUserId() userId: string): Promise<AiReport[]> {
    return this.ai.listReports(userId);
  }

  @Get(':id')
  get(@CurrentUserId() userId: string, @Param('id', CuidValidationPipe) id: string): Promise<AiReport> {
    return this.ai.getReport(userId, id);
  }

  @Post('generate')
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  generateWeekly(
    @CurrentUserId() userId: string,
    @Body(new ZodValidationPipe(GenerateWeeklyAiReportSchema)) body: GenerateWeeklyAiReportInput,
  ): Promise<AiReport> {
    return this.ai.generateWeeklyReport(userId, body);
  }

  @Post('generate-external')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  generateExternal(
    @CurrentUserId() userId: string,
    @Body(new ZodValidationPipe(GenerateExternalMatchReportSchema)) body: GenerateExternalMatchReportInput,
  ): Promise<AiReport> {
    return this.ai.generateExternalMatchReport(userId, body);
  }
}