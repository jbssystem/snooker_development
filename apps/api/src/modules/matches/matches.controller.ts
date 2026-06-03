import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  AddMatchFrameSchema,
  CreateMatchSchema,
  UpdateMatchFrameSchema,
  UpdateMatchSchema,
  type AddMatchFrameInput,
  type CreateMatchInput,
  type Match,
  type MatchFrame,
  type UpdateMatchFrameInput,
  type UpdateMatchInput,
} from '@snooker/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { CuidValidationPipe } from '../../common/pipes/cuid-validation.pipe';
import { CurrentUserId } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MatchesService } from './matches.service';

@ApiTags('matches')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('matches')
export class MatchesController {
  constructor(private readonly matches: MatchesService) {}

  @Get()
  list(@CurrentUserId() userId: string): Promise<Match[]> {
    return this.matches.list(userId);
  }

  @Get(':id')
  get(@CurrentUserId() userId: string, @Param('id', CuidValidationPipe) id: string): Promise<Match> {
    return this.matches.get(userId, id);
  }

  @Post()
  create(
    @CurrentUserId() userId: string,
    @Body(new ZodValidationPipe(CreateMatchSchema)) body: CreateMatchInput,
  ): Promise<Match> {
    return this.matches.create(userId, body);
  }

  @Patch(':id')
  update(
    @CurrentUserId() userId: string,
    @Param('id', CuidValidationPipe) id: string,
    @Body(new ZodValidationPipe(UpdateMatchSchema)) body: UpdateMatchInput,
  ): Promise<Match> {
    return this.matches.update(userId, id, body);
  }

  @Post(':id/frames')
  addFrame(
    @CurrentUserId() userId: string,
    @Param('id', CuidValidationPipe) id: string,
    @Body(new ZodValidationPipe(AddMatchFrameSchema)) body: AddMatchFrameInput,
  ): Promise<MatchFrame> {
    return this.matches.addFrame(userId, id, body);
  }

  @Patch(':id/frames/:frameNumber')
  updateFrame(
    @CurrentUserId() userId: string,
    @Param('id', CuidValidationPipe) id: string,
    @Param('frameNumber', ParseIntPipe) frameNumber: number,
    @Body(new ZodValidationPipe(UpdateMatchFrameSchema)) body: UpdateMatchFrameInput,
  ): Promise<Match> {
    return this.matches.updateFrame(userId, id, frameNumber, body);
  }

  @Delete(':id/frames/last')
  removeLastFrame(
    @CurrentUserId() userId: string,
    @Param('id', CuidValidationPipe) id: string,
  ): Promise<Match> {
    return this.matches.removeLastFrame(userId, id);
  }
}
