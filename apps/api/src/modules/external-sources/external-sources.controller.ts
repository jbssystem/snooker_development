import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CreateExternalLinkInputSchema, type CreateExternalLinkInput, type ExternalImportJob, type ExternalPlayerLink } from '@snooker/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { CuidValidationPipe } from '../../common/pipes/cuid-validation.pipe';
import { CurrentUserId } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ExternalSourcesService } from './external-sources.service';

@ApiTags('external-sources')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('external-links')
export class ExternalSourcesController {
  constructor(private readonly service: ExternalSourcesService) {}

  @Get()
  list(@CurrentUserId() userId: string): Promise<ExternalPlayerLink[]> {
    return this.service.listLinks(userId);
  }

  @Post()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  create(
    @CurrentUserId() userId: string,
    @Body(new ZodValidationPipe(CreateExternalLinkInputSchema)) body: CreateExternalLinkInput,
  ): Promise<ExternalPlayerLink> {
    return this.service.createLink(userId, body);
  }

  @Delete(':id')
  delete(
    @CurrentUserId() userId: string,
    @Param('id', CuidValidationPipe) id: string,
  ): Promise<void> {
    return this.service.deleteLink(userId, id);
  }

  @Post(':id/sync')
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  sync(
    @CurrentUserId() userId: string,
    @Param('id', CuidValidationPipe) id: string,
  ): Promise<ExternalImportJob> {
    return this.service.triggerSync(userId, id);
  }

  @Get(':id/jobs')
  listJobs(
    @CurrentUserId() userId: string,
    @Param('id', CuidValidationPipe) id: string,
  ): Promise<ExternalImportJob[]> {
    return this.service.listJobs(userId, id);
  }

  @Get('imported-matches')
  listImportedMatches(@CurrentUserId() userId: string) {
    return this.service.listImportedMatches(userId);
  }
}
