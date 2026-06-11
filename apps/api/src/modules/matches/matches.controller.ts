import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  AddMatchFrameSchema,
  CreateMatchSchema,
  ListCursorQuerySchema,
  UpdateMatchFrameSchema,
  UpdateMatchSchema,
  type AddMatchFrameInput,
  type CreateMatchInput,
  type ListCursorQuery,
  type Match,
  type MatchFrame,
  type UpdateMatchFrameInput,
  type UpdateMatchInput,
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
import { MatchesService } from './matches.service';

@ApiTags('matches')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ActiveProfileGuard)
@Controller('matches')
export class MatchesController {
  constructor(private readonly matches: MatchesService) {}

  @Get()
  list(
    @ActiveProfile() ctx: ProfileContext | null,
    @Query(new ZodValidationPipe(ListCursorQuerySchema)) query: ListCursorQuery,
  ): Promise<Match[]> {
    return ctx ? this.matches.list(ctx.profileId, query) : Promise.resolve([]);
  }

  @Get(':id')
  get(
    @CurrentProfileId() profileId: string,
    @Param('id', CuidValidationPipe) id: string,
  ): Promise<Match> {
    return this.matches.get(profileId, id);
  }

  @Post()
  @WriteAccess()
  create(
    @CurrentProfile() ctx: ProfileContext,
    @Body(new ZodValidationPipe(CreateMatchSchema)) body: CreateMatchInput,
  ): Promise<Match> {
    return this.matches.create(ctx, body);
  }

  @Patch(':id')
  @WriteAccess()
  update(
    @CurrentProfileId() profileId: string,
    @Param('id', CuidValidationPipe) id: string,
    @Body(new ZodValidationPipe(UpdateMatchSchema)) body: UpdateMatchInput,
  ): Promise<Match> {
    return this.matches.update(profileId, id, body);
  }

  @Post(':id/frames')
  @WriteAccess()
  addFrame(
    @CurrentProfileId() profileId: string,
    @Param('id', CuidValidationPipe) id: string,
    @Body(new ZodValidationPipe(AddMatchFrameSchema)) body: AddMatchFrameInput,
  ): Promise<MatchFrame> {
    return this.matches.addFrame(profileId, id, body);
  }

  @Patch(':id/frames/:frameNumber')
  @WriteAccess()
  updateFrame(
    @CurrentProfileId() profileId: string,
    @Param('id', CuidValidationPipe) id: string,
    @Param('frameNumber', ParseIntPipe) frameNumber: number,
    @Body(new ZodValidationPipe(UpdateMatchFrameSchema)) body: UpdateMatchFrameInput,
  ): Promise<Match> {
    return this.matches.updateFrame(profileId, id, frameNumber, body);
  }

  @Delete(':id/frames/last')
  @WriteAccess()
  removeLastFrame(
    @CurrentProfileId() profileId: string,
    @Param('id', CuidValidationPipe) id: string,
  ): Promise<Match> {
    return this.matches.removeLastFrame(profileId, id);
  }
}
