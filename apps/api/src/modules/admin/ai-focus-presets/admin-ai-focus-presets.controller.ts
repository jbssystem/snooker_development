import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  CreateAiFocusPresetSchema,
  UpdateAiFocusPresetSchema,
  type AiFocusPreset,
  type CreateAiFocusPresetInput,
  type UpdateAiFocusPresetInput,
} from '@snooker/shared';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { CuidValidationPipe } from '../../../common/pipes/cuid-validation.pipe';
import { CurrentUserId } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { AdminAiFocusPresetsService } from './admin-ai-focus-presets.service';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SYSTEM_ADMIN')
@Controller('admin/ai-focus-presets')
export class AdminAiFocusPresetsController {
  constructor(private readonly presets: AdminAiFocusPresetsService) {}

  @Get()
  list(): Promise<AiFocusPreset[]> {
    return this.presets.list();
  }

  @Get(':id')
  get(@Param('id', CuidValidationPipe) id: string): Promise<AiFocusPreset> {
    return this.presets.get(id);
  }

  @Post()
  create(
    @CurrentUserId() actorId: string,
    @Body(new ZodValidationPipe(CreateAiFocusPresetSchema)) body: CreateAiFocusPresetInput,
  ): Promise<AiFocusPreset> {
    return this.presets.create(actorId, body);
  }

  @Patch(':id')
  update(
    @CurrentUserId() actorId: string,
    @Param('id', CuidValidationPipe) id: string,
    @Body(new ZodValidationPipe(UpdateAiFocusPresetSchema)) body: UpdateAiFocusPresetInput,
  ): Promise<AiFocusPreset> {
    return this.presets.update(actorId, id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @CurrentUserId() actorId: string,
    @Param('id', CuidValidationPipe) id: string,
  ): Promise<void> {
    await this.presets.delete(actorId, id);
  }
}
