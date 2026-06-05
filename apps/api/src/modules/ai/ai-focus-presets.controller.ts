import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { ActiveAiFocusPreset } from '@snooker/shared';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AiService } from './ai.service';

/**
 * Active focus presets for the report-generation form. Presets are reference
 * data (not per-profile sensitive data), so this only requires authentication.
 */
@ApiTags('ai')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai/focus-presets')
export class AiFocusPresetsController {
  constructor(private readonly ai: AiService) {}

  @Get()
  list(@Query('locale') locale?: string): Promise<ActiveAiFocusPreset[]> {
    return this.ai.listActiveFocusPresets(locale);
  }
}
