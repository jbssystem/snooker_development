import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  UpdateAiSettingsSchema,
  type AiSettings,
  type UpdateAiSettingsInput,
} from '@snooker/shared';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { CurrentUserId } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { SettingsService } from '../../settings/settings.service';
import { AdminAuditService } from '../admin-audit.service';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SYSTEM_ADMIN')
@Controller('admin/ai-settings')
export class AdminAiSettingsController {
  constructor(
    private readonly settings: SettingsService,
    private readonly audit: AdminAuditService,
  ) {}

  @Get()
  get(): Promise<AiSettings> {
    return this.settings.getView();
  }

  @Put()
  async update(
    @CurrentUserId() actorId: string,
    @Body(new ZodValidationPipe(UpdateAiSettingsSchema)) body: UpdateAiSettingsInput,
  ): Promise<AiSettings> {
    const result = await this.settings.update(actorId, body);
    // Never log the key itself — only that it changed.
    await this.audit.record(actorId, 'ai_settings.update', { type: 'AppSetting', id: 'ai' }, {
      provider: body.provider,
      model: body.model,
      visionModel: body.visionModel,
      apiKeyChanged: body.apiKey !== undefined,
    });
    return result;
  }
}
