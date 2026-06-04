import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  AddDrillExecutionSchema,
  CreateDrillAttemptSchema,
  CreateTrainingSessionSchema,
  FinishDrillExecutionSchema,
  FinishTrainingSessionSchema,
  UpdateTrainingSessionSchema,
  type AddDrillExecutionInput,
  type CreateDrillAttemptInput,
  type CreateTrainingSessionInput,
  type DrillAttempt,
  type DrillExecution,
  type FinishDrillExecutionInput,
  type FinishTrainingSessionInput,
  type TrainingSession,
  type UpdateTrainingSessionInput,
} from '@snooker/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { CuidValidationPipe } from '../../common/pipes/cuid-validation.pipe';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ActiveProfileGuard } from '../profiles/guards/active-profile.guard';
import {
  ActiveProfile,
  CurrentProfile,
  CurrentProfileId,
} from '../profiles/decorators/active-profile.decorator';
import { WriteAccess } from '../profiles/decorators/access.decorators';
import type { ProfileContext } from '../profiles/profile-context';
import { TrainingService } from './training.service';

@ApiTags('training')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ActiveProfileGuard)
@Controller()
export class TrainingController {
  constructor(private readonly training: TrainingService) {}

  @Get('training-sessions')
  list(@ActiveProfile() ctx: ProfileContext | null): Promise<TrainingSession[]> {
    return ctx ? this.training.listSessions(ctx.profileId) : Promise.resolve([]);
  }

  @Get('training-sessions/:id')
  get(@CurrentProfileId() profileId: string, @Param('id', CuidValidationPipe) id: string): Promise<TrainingSession> {
    return this.training.getSession(profileId, id);
  }

  @Post('training-sessions')
  @WriteAccess()
  create(
    @CurrentProfile() ctx: ProfileContext,
    @Body(new ZodValidationPipe(CreateTrainingSessionSchema)) body: CreateTrainingSessionInput,
  ): Promise<TrainingSession> {
    return this.training.createSession(ctx, body);
  }

  @Patch('training-sessions/:id')
  @WriteAccess()
  update(
    @CurrentProfileId() profileId: string,
    @Param('id', CuidValidationPipe) id: string,
    @Body(new ZodValidationPipe(UpdateTrainingSessionSchema)) body: UpdateTrainingSessionInput,
  ): Promise<TrainingSession> {
    return this.training.updateSession(profileId, id, body);
  }

  @Post('training-sessions/:id/finish')
  @WriteAccess()
  finishSession(
    @CurrentProfileId() profileId: string,
    @Param('id', CuidValidationPipe) id: string,
    @Body(new ZodValidationPipe(FinishTrainingSessionSchema)) body: FinishTrainingSessionInput,
  ): Promise<TrainingSession> {
    return this.training.finishSession(profileId, id, body);
  }

  @Post('training-sessions/:id/reopen')
  @WriteAccess()
  reopenSession(
    @CurrentProfileId() profileId: string,
    @Param('id', CuidValidationPipe) id: string,
  ): Promise<TrainingSession> {
    return this.training.reopenSession(profileId, id);
  }

  @Post('training-sessions/:id/drills')
  @WriteAccess()
  addDrill(
    @CurrentProfile() ctx: ProfileContext,
    @Param('id', CuidValidationPipe) id: string,
    @Body(new ZodValidationPipe(AddDrillExecutionSchema)) body: AddDrillExecutionInput,
  ): Promise<DrillExecution> {
    return this.training.addDrill(ctx, id, body);
  }

  @Post('drill-executions/:id/attempts')
  @WriteAccess()
  addAttempt(
    @CurrentProfileId() profileId: string,
    @Param('id', CuidValidationPipe) id: string,
    @Body(new ZodValidationPipe(CreateDrillAttemptSchema)) body: CreateDrillAttemptInput,
  ): Promise<DrillAttempt> {
    return this.training.addAttempt(profileId, id, body);
  }

  @Delete('drill-executions/:id/attempts/last')
  @WriteAccess()
  removeLastAttempt(
    @CurrentProfileId() profileId: string,
    @Param('id', CuidValidationPipe) id: string,
  ): Promise<DrillExecution> {
    return this.training.removeLastAttempt(profileId, id);
  }

  @Delete('drill-executions/:id')
  @HttpCode(204)
  @WriteAccess()
  async removeDrill(
    @CurrentProfileId() profileId: string,
    @Param('id', CuidValidationPipe) id: string,
  ): Promise<void> {
    await this.training.removeDrill(profileId, id);
  }

  @Patch('drill-executions/:id/finish')
  @WriteAccess()
  finishDrill(
    @CurrentProfileId() profileId: string,
    @Param('id', CuidValidationPipe) id: string,
    @Body(new ZodValidationPipe(FinishDrillExecutionSchema)) body: FinishDrillExecutionInput,
  ): Promise<DrillExecution> {
    return this.training.finishDrill(profileId, id, body);
  }
}
