import { Global, Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ProfilesController } from './profiles.controller';
import { ProfileAccessService } from './profile-access.service';
import { ActiveProfileGuard } from './guards/active-profile.guard';

/**
 * Cross-cutting access layer for delegated cabinet access. Global so any data
 * module can use ActiveProfileGuard / ProfileAccessService without re-importing.
 */
@Global()
@Module({
  imports: [AuthModule],
  controllers: [ProfilesController],
  providers: [ProfileAccessService, ActiveProfileGuard],
  exports: [ProfileAccessService, ActiveProfileGuard],
})
export class ProfilesModule {}
