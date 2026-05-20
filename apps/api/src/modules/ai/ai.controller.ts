import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  GenerateWeeklyAiReportSchema,
  type AiReport,
  type GenerateWeeklyAiReportInput,
} from '@snooker/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
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
  get(@CurrentUserId() userId: string, @Param('id') id: string): Promise<AiReport> {
    return this.ai.getReport(userId, id);
  }

  @Post('generate')
  generateWeekly(
    @CurrentUserId() userId: string,
    @Body(new ZodValidationPipe(GenerateWeeklyAiReportSchema)) body: GenerateWeeklyAiReportInput,
  ): Promise<AiReport> {
    return this.ai.generateWeeklyReport(userId, body);
  }
}