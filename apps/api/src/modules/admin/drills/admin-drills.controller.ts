import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  UpdateDrillVisibilitySchema,
  type DrillTemplate,
  type UpdateDrillVisibilityInput,
} from '@snooker/shared';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { CuidValidationPipe } from '../../../common/pipes/cuid-validation.pipe';
import { CurrentUserId } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { AdminDrillsService } from './admin-drills.service';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SYSTEM_ADMIN')
@Controller('admin/drill-templates')
export class AdminDrillsController {
  constructor(private readonly drills: AdminDrillsService) {}

  @Get()
  list(@Query('search') search?: string): Promise<DrillTemplate[]> {
    return this.drills.list(search?.trim() || undefined);
  }

  @Patch(':id/visibility')
  setVisibility(
    @CurrentUserId() actorId: string,
    @Param('id', CuidValidationPipe) id: string,
    @Body(new ZodValidationPipe(UpdateDrillVisibilitySchema)) body: UpdateDrillVisibilityInput,
  ): Promise<DrillTemplate> {
    return this.drills.setVisibility(actorId, id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @CurrentUserId() actorId: string,
    @Param('id', CuidValidationPipe) id: string,
  ): Promise<void> {
    await this.drills.delete(actorId, id);
  }
}
