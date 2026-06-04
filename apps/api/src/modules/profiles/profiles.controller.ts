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
  CreateInvitationSchema,
  UpdateMemberAccessSchema,
  type AccessibleProfile,
  type CreateInvitationInput,
  type ProfileInvitationSummary,
  type ProfileMember,
  type UpdateMemberAccessInput,
} from '@snooker/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { CuidValidationPipe } from '../../common/pipes/cuid-validation.pipe';
import { CurrentUserId } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ActiveProfileGuard } from './guards/active-profile.guard';
import { CurrentProfileId } from './decorators/active-profile.decorator';
import { OwnerOnly } from './decorators/access.decorators';
import { ProfileAccessService } from './profile-access.service';
import { ProfileSharingService } from './profile-sharing.service';

@ApiTags('profiles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ActiveProfileGuard)
@Controller('profiles')
export class ProfilesController {
  constructor(
    private readonly access: ProfileAccessService,
    private readonly sharing: ProfileSharingService,
  ) {}

  /** Cabinets the current user can switch between (own + shared). */
  @Get('accessible')
  accessible(@CurrentUserId() userId: string): Promise<AccessibleProfile[]> {
    return this.access.listAccessible(userId);
  }

  // --- Owner-only: manage access to the active cabinet ---------------------

  @Get('me/members')
  @OwnerOnly()
  members(@CurrentProfileId() profileId: string): Promise<ProfileMember[]> {
    return this.sharing.listMembers(profileId);
  }

  @Patch('me/members/:userId')
  @OwnerOnly()
  updateMember(
    @CurrentProfileId() profileId: string,
    @Param('userId', CuidValidationPipe) userId: string,
    @Body(new ZodValidationPipe(UpdateMemberAccessSchema)) body: UpdateMemberAccessInput,
  ): Promise<ProfileMember> {
    return this.sharing.updateMember(profileId, userId, body);
  }

  @Delete('me/members/:userId')
  @OwnerOnly()
  @HttpCode(HttpStatus.NO_CONTENT)
  removeMember(
    @CurrentProfileId() profileId: string,
    @Param('userId', CuidValidationPipe) userId: string,
  ): Promise<void> {
    return this.sharing.removeMember(profileId, userId);
  }

  @Get('me/invitations')
  @OwnerOnly()
  invitations(@CurrentProfileId() profileId: string): Promise<ProfileInvitationSummary[]> {
    return this.sharing.listInvitations(profileId);
  }

  @Post('me/invitations')
  @OwnerOnly()
  invite(
    @CurrentProfileId() profileId: string,
    @CurrentUserId() userId: string,
    @Body(new ZodValidationPipe(CreateInvitationSchema)) body: CreateInvitationInput,
  ): Promise<ProfileInvitationSummary> {
    return this.sharing.invite(profileId, userId, body);
  }

  @Delete('me/invitations/:id')
  @OwnerOnly()
  @HttpCode(HttpStatus.NO_CONTENT)
  revokeInvitation(
    @CurrentProfileId() profileId: string,
    @Param('id', CuidValidationPipe) id: string,
  ): Promise<void> {
    return this.sharing.revokeInvitation(profileId, id);
  }
}
