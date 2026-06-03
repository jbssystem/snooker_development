import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { EmailModule } from '../email/email.module';
import { AdminAuditService } from './admin-audit.service';
import { AdminBootstrapService } from './admin-bootstrap.service';
import { AdminUsersController } from './users/admin-users.controller';
import { AdminUsersService } from './users/admin-users.service';
import { AdminAnnouncementsController } from './announcements/admin-announcements.controller';
import { AdminAnnouncementsService } from './announcements/admin-announcements.service';
import { AdminDrillsController } from './drills/admin-drills.controller';
import { AdminDrillsService } from './drills/admin-drills.service';
import { AdminStatsController } from './stats/admin-stats.controller';
import { AdminStatsService } from './stats/admin-stats.service';

@Module({
  imports: [AuthModule, EmailModule],
  controllers: [
    AdminUsersController,
    AdminAnnouncementsController,
    AdminDrillsController,
    AdminStatsController,
  ],
  providers: [
    AdminAuditService,
    AdminBootstrapService,
    AdminUsersService,
    AdminAnnouncementsService,
    AdminDrillsService,
    AdminStatsService,
  ],
})
export class AdminModule {}
