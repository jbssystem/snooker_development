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
  CreateAnnouncementSchema,
  UpdateAnnouncementSchema,
  type Announcement,
  type CreateAnnouncementInput,
  type UpdateAnnouncementInput,
} from '@snooker/shared';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { CuidValidationPipe } from '../../../common/pipes/cuid-validation.pipe';
import { CurrentUserId } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { AdminAnnouncementsService } from './admin-announcements.service';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SYSTEM_ADMIN')
@Controller('admin/announcements')
export class AdminAnnouncementsController {
  constructor(private readonly announcements: AdminAnnouncementsService) {}

  @Get()
  list(): Promise<Announcement[]> {
    return this.announcements.list();
  }

  @Get(':id')
  get(@Param('id', CuidValidationPipe) id: string): Promise<Announcement> {
    return this.announcements.get(id);
  }

  @Post()
  create(
    @CurrentUserId() actorId: string,
    @Body(new ZodValidationPipe(CreateAnnouncementSchema)) body: CreateAnnouncementInput,
  ): Promise<Announcement> {
    return this.announcements.create(actorId, body);
  }

  @Patch(':id')
  update(
    @CurrentUserId() actorId: string,
    @Param('id', CuidValidationPipe) id: string,
    @Body(new ZodValidationPipe(UpdateAnnouncementSchema)) body: UpdateAnnouncementInput,
  ): Promise<Announcement> {
    return this.announcements.update(actorId, id, body);
  }

  @Post(':id/publish')
  publish(
    @CurrentUserId() actorId: string,
    @Param('id', CuidValidationPipe) id: string,
  ): Promise<Announcement> {
    return this.announcements.setPublished(actorId, id, true);
  }

  @Post(':id/unpublish')
  unpublish(
    @CurrentUserId() actorId: string,
    @Param('id', CuidValidationPipe) id: string,
  ): Promise<Announcement> {
    return this.announcements.setPublished(actorId, id, false);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @CurrentUserId() actorId: string,
    @Param('id', CuidValidationPipe) id: string,
  ): Promise<void> {
    await this.announcements.delete(actorId, id);
  }
}
