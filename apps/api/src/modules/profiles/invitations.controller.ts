import { Controller, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { IncomingInvitation, InvitationPreview } from '@snooker/shared';
import { CuidValidationPipe } from '../../common/pipes/cuid-validation.pipe';
import { CurrentUserId } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProfileSharingService } from './profile-sharing.service';

@ApiTags('invitations')
@Controller('invitations')
export class InvitationsController {
  constructor(private readonly sharing: ProfileSharingService) {}

  // --- In-app: invitations addressed to the logged-in user -----------------

  @Get('incoming')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  incoming(@CurrentUserId() userId: string): Promise<IncomingInvitation[]> {
    return this.sharing.listIncomingForUser(userId);
  }

  @Post('incoming/:id/accept')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  acceptById(
    @CurrentUserId() userId: string,
    @Param('id', CuidValidationPipe) id: string,
  ): Promise<void> {
    return this.sharing.acceptById(userId, id);
  }

  @Post('incoming/:id/decline')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  declineById(
    @CurrentUserId() userId: string,
    @Param('id', CuidValidationPipe) id: string,
  ): Promise<void> {
    return this.sharing.declineById(userId, id);
  }

  // --- Email-link flow: preview is public, accept/decline need auth --------

  @Get('token/:token')
  preview(@Param('token') token: string): Promise<InvitationPreview> {
    return this.sharing.preview(token);
  }

  @Post('token/:token/accept')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  acceptByToken(@CurrentUserId() userId: string, @Param('token') token: string): Promise<void> {
    return this.sharing.acceptByToken(userId, token);
  }

  @Post('token/:token/decline')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  declineByToken(@CurrentUserId() userId: string, @Param('token') token: string): Promise<void> {
    return this.sharing.declineByToken(userId, token);
  }
}
