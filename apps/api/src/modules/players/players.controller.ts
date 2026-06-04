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
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  CreateEquipmentProfileSchema,
  UpdateAvatarSchema,
  UpsertPlayerProfileSchema,
  UpdateEquipmentProfileSchema,
  type CreateEquipmentProfileInput,
  type EquipmentProfile,
  type PlayerProfile,
  type UpdateAvatarInput,
  type UpsertPlayerProfileInput,
  type UpdateEquipmentProfileInput,
} from '@snooker/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { CuidValidationPipe } from '../../common/pipes/cuid-validation.pipe';
import { CurrentUserId } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ActiveProfileGuard } from '../profiles/guards/active-profile.guard';
import {
  ActiveProfile,
  CurrentProfileId,
} from '../profiles/decorators/active-profile.decorator';
import { WriteAccess } from '../profiles/decorators/access.decorators';
import type { ProfileContext } from '../profiles/profile-context';
import { PlayersService } from './players.service';

@ApiTags('players')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ActiveProfileGuard)
@Controller('players/me')
export class PlayersController {
  constructor(private readonly players: PlayersService) {}

  @Get('profile')
  getProfile(@ActiveProfile() ctx: ProfileContext | null): Promise<PlayerProfile | null> {
    return this.players.getProfile(ctx);
  }

  @Put('profile')
  upsertProfile(
    @CurrentUserId() userId: string,
    @ActiveProfile() ctx: ProfileContext | null,
    @Body(new ZodValidationPipe(UpsertPlayerProfileSchema)) body: UpsertPlayerProfileInput,
  ): Promise<PlayerProfile> {
    return this.players.upsertProfile(userId, ctx, body);
  }

  @Patch('profile/avatar')
  @WriteAccess()
  updateAvatar(
    @CurrentProfileId() profileId: string,
    @Body(new ZodValidationPipe(UpdateAvatarSchema)) body: UpdateAvatarInput,
  ): Promise<PlayerProfile> {
    return this.players.updateAvatar(profileId, body.avatar);
  }

  @Get('equipment-profiles')
  listEquipment(@ActiveProfile() ctx: ProfileContext | null): Promise<EquipmentProfile[]> {
    return ctx ? this.players.listEquipment(ctx.profileId) : Promise.resolve([]);
  }

  @Post('equipment-profiles')
  @WriteAccess()
  createEquipment(
    @CurrentProfileId() profileId: string,
    @Body(new ZodValidationPipe(CreateEquipmentProfileSchema)) body: CreateEquipmentProfileInput,
  ): Promise<EquipmentProfile> {
    return this.players.createEquipment(profileId, body);
  }

  @Patch('equipment-profiles/:id')
  @WriteAccess()
  updateEquipment(
    @CurrentProfileId() profileId: string,
    @Param('id', CuidValidationPipe) id: string,
    @Body(new ZodValidationPipe(UpdateEquipmentProfileSchema)) body: UpdateEquipmentProfileInput,
  ): Promise<EquipmentProfile> {
    return this.players.updateEquipment(profileId, id, body);
  }

  @Delete('equipment-profiles/:id')
  @WriteAccess()
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteEquipment(
    @CurrentProfileId() profileId: string,
    @Param('id', CuidValidationPipe) id: string,
  ): Promise<void> {
    await this.players.deleteEquipment(profileId, id);
  }
}
