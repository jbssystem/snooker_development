import { Global, Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { EmailModule } from '../email/email.module';
import { ProfilesController } from './profiles.controller';
import { InvitationsController } from './invitations.controller';
import { ProfileAccessService } from './profile-access.service';
import { ProfileSharingService } from './profile-sharing.service';
import { ActiveProfileGuard } from './guards/active-profile.guard';

/**
 * Cross-cutting access layer for delegated cabinet access. Global so any data
 * module can use ActiveProfileGuard / ProfileAccessService without re-importing.
 */
@Global()
@Module({
  imports: [AuthModule, EmailModule],
  controllers: [ProfilesController, InvitationsController],
  providers: [ProfileAccessService, ProfileSharingService, ActiveProfileGuard],
  exports: [ProfileAccessService, ProfileSharingService, ActiveProfileGuard],
})
export class ProfilesModule {}
