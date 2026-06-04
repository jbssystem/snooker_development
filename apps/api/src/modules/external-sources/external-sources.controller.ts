import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CreateExternalLinkInputSchema, type CreateExternalLinkInput, type ExternalImportJob, type ExternalPlayerLink } from '@snooker/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { CuidValidationPipe } from '../../common/pipes/cuid-validation.pipe';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ActiveProfileGuard } from '../profiles/guards/active-profile.guard';
import {
  ActiveProfile,
  CurrentProfileId,
} from '../profiles/decorators/active-profile.decorator';
import { WriteAccess } from '../profiles/decorators/access.decorators';
import type { ProfileContext } from '../profiles/profile-context';
import { ExternalSourcesService } from './external-sources.service';

@ApiTags('external-sources')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ActiveProfileGuard)
@Controller('external-links')
export class ExternalSourcesController {
  constructor(private readonly service: ExternalSourcesService) {}

  @Get()
  list(@ActiveProfile() ctx: ProfileContext | null): Promise<ExternalPlayerLink[]> {
    return ctx ? this.service.listLinks(ctx.profileId) : Promise.resolve([]);
  }

  @Post()
  @WriteAccess()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  create(
    @CurrentProfileId() profileId: string,
    @Body(new ZodValidationPipe(CreateExternalLinkInputSchema)) body: CreateExternalLinkInput,
  ): Promise<ExternalPlayerLink> {
    return this.service.createLink(profileId, body);
  }

  @Delete(':id')
  @WriteAccess()
  delete(
    @CurrentProfileId() profileId: string,
    @Param('id', CuidValidationPipe) id: string,
  ): Promise<void> {
    return this.service.deleteLink(profileId, id);
  }

  @Post(':id/sync')
  @WriteAccess()
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  sync(
    @CurrentProfileId() profileId: string,
    @Param('id', CuidValidationPipe) id: string,
  ): Promise<ExternalImportJob> {
    return this.service.triggerSync(profileId, id);
  }

  @Get(':id/jobs')
  listJobs(
    @CurrentProfileId() profileId: string,
    @Param('id', CuidValidationPipe) id: string,
  ): Promise<ExternalImportJob[]> {
    return this.service.listJobs(profileId, id);
  }

  @Get('imported-matches')
  listImportedMatches(@ActiveProfile() ctx: ProfileContext | null) {
    return ctx ? this.service.listImportedMatches(ctx.profileId) : Promise.resolve([]);
  }
}
