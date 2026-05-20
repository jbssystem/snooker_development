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
  CreateDrillTemplateSchema,
  UpdateDrillTemplateSchema,
  type CreateDrillTemplateInput,
  type DrillTemplate,
  type UpdateDrillTemplateInput,
} from '@snooker/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { CurrentUserId } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DrillsService } from './drills.service';

@ApiTags('drill-templates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('drill-templates')
export class DrillsController {
  constructor(private readonly drills: DrillsService) {}

  @Get()
  list(@CurrentUserId() userId: string): Promise<DrillTemplate[]> {
    return this.drills.list(userId);
  }

  @Get(':id')
  get(@CurrentUserId() userId: string, @Param('id') id: string): Promise<DrillTemplate> {
    return this.drills.get(userId, id);
  }

  @Post()
  create(
    @CurrentUserId() userId: string,
    @Body(new ZodValidationPipe(CreateDrillTemplateSchema)) body: CreateDrillTemplateInput,
  ): Promise<DrillTemplate> {
    return this.drills.create(userId, body);
  }

  @Patch(':id')
  update(
    @CurrentUserId() userId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateDrillTemplateSchema)) body: UpdateDrillTemplateInput,
  ): Promise<DrillTemplate> {
    return this.drills.update(userId, id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@CurrentUserId() userId: string, @Param('id') id: string): Promise<void> {
    await this.drills.delete(userId, id);
  }
}
