import {
  Body,
  Controller,
  Delete,
  Get,
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
import { CurrentUserId } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TrainingService } from './training.service';

@ApiTags('training')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class TrainingController {
  constructor(private readonly training: TrainingService) {}

  @Get('training-sessions')
  list(@CurrentUserId() userId: string): Promise<TrainingSession[]> {
    return this.training.listSessions(userId);
  }

  @Get('training-sessions/:id')
  get(@CurrentUserId() userId: string, @Param('id', CuidValidationPipe) id: string): Promise<TrainingSession> {
    return this.training.getSession(userId, id);
  }

  @Post('training-sessions')
  create(
    @CurrentUserId() userId: string,
    @Body(new ZodValidationPipe(CreateTrainingSessionSchema)) body: CreateTrainingSessionInput,
  ): Promise<TrainingSession> {
    return this.training.createSession(userId, body);
  }

  @Patch('training-sessions/:id')
  update(
    @CurrentUserId() userId: string,
    @Param('id', CuidValidationPipe) id: string,
    @Body(new ZodValidationPipe(UpdateTrainingSessionSchema)) body: UpdateTrainingSessionInput,
  ): Promise<TrainingSession> {
    return this.training.updateSession(userId, id, body);
  }

  @Post('training-sessions/:id/finish')
  finishSession(
    @CurrentUserId() userId: string,
    @Param('id', CuidValidationPipe) id: string,
    @Body(new ZodValidationPipe(FinishTrainingSessionSchema)) body: FinishTrainingSessionInput,
  ): Promise<TrainingSession> {
    return this.training.finishSession(userId, id, body);
  }

  @Post('training-sessions/:id/drills')
  addDrill(
    @CurrentUserId() userId: string,
    @Param('id', CuidValidationPipe) id: string,
    @Body(new ZodValidationPipe(AddDrillExecutionSchema)) body: AddDrillExecutionInput,
  ): Promise<DrillExecution> {
    return this.training.addDrill(userId, id, body);
  }

  @Post('drill-executions/:id/attempts')
  addAttempt(
    @CurrentUserId() userId: string,
    @Param('id', CuidValidationPipe) id: string,
    @Body(new ZodValidationPipe(CreateDrillAttemptSchema)) body: CreateDrillAttemptInput,
  ): Promise<DrillAttempt> {
    return this.training.addAttempt(userId, id, body);
  }

  @Delete('drill-executions/:id/attempts/last')
  removeLastAttempt(
    @CurrentUserId() userId: string,
    @Param('id', CuidValidationPipe) id: string,
  ): Promise<DrillExecution> {
    return this.training.removeLastAttempt(userId, id);
  }

  @Patch('drill-executions/:id/finish')
  finishDrill(
    @CurrentUserId() userId: string,
    @Param('id', CuidValidationPipe) id: string,
    @Body(new ZodValidationPipe(FinishDrillExecutionSchema)) body: FinishDrillExecutionInput,
  ): Promise<DrillExecution> {
    return this.training.finishDrill(userId, id, body);
  }
}
