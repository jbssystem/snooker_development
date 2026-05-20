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
  UpsertPlayerProfileSchema,
  UpdateEquipmentProfileSchema,
  type CreateEquipmentProfileInput,
  type EquipmentProfile,
  type PlayerProfile,
  type UpsertPlayerProfileInput,
  type UpdateEquipmentProfileInput,
} from '@snooker/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { CuidValidationPipe } from '../../common/pipes/cuid-validation.pipe';
import { CurrentUserId } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PlayersService } from './players.service';

@ApiTags('players')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('players/me')
export class PlayersController {
  constructor(private readonly players: PlayersService) {}

  @Get('profile')
  getProfile(@CurrentUserId() userId: string): Promise<PlayerProfile | null> {
    return this.players.getProfile(userId);
  }

  @Put('profile')
  upsertProfile(
    @CurrentUserId() userId: string,
    @Body(new ZodValidationPipe(UpsertPlayerProfileSchema)) body: UpsertPlayerProfileInput,
  ): Promise<PlayerProfile> {
    return this.players.upsertProfile(userId, body);
  }

  @Get('equipment-profiles')
  listEquipment(@CurrentUserId() userId: string): Promise<EquipmentProfile[]> {
    return this.players.listEquipment(userId);
  }

  @Post('equipment-profiles')
  createEquipment(
    @CurrentUserId() userId: string,
    @Body(new ZodValidationPipe(CreateEquipmentProfileSchema)) body: CreateEquipmentProfileInput,
  ): Promise<EquipmentProfile> {
    return this.players.createEquipment(userId, body);
  }

  @Patch('equipment-profiles/:id')
  updateEquipment(
    @CurrentUserId() userId: string,
    @Param('id', CuidValidationPipe) id: string,
    @Body(new ZodValidationPipe(UpdateEquipmentProfileSchema)) body: UpdateEquipmentProfileInput,
  ): Promise<EquipmentProfile> {
    return this.players.updateEquipment(userId, id, body);
  }

  @Delete('equipment-profiles/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteEquipment(
    @CurrentUserId() userId: string,
    @Param('id', CuidValidationPipe) id: string,
  ): Promise<void> {
    await this.players.deleteEquipment(userId, id);
  }
}
