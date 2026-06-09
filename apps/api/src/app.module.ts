import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { HealthController } from './modules/health/health.controller';
import { PrismaModule } from './modules/prisma/prisma.module';
import { SettingsModule } from './modules/settings/settings.module';
import { AuthModule } from './modules/auth/auth.module';
import { ProfilesModule } from './modules/profiles/profiles.module';
import { PlayersModule } from './modules/players/players.module';
import { DrillsModule } from './modules/drills/drills.module';
import { TrainingModule } from './modules/training/training.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { MatchesModule } from './modules/matches/matches.module';
import { CalendarModule } from './modules/calendar/calendar.module';
import { AiModule } from './modules/ai/ai.module';
import { ExternalSourcesModule } from './modules/external-sources/external-sources.module';
import { AdminModule } from './modules/admin/admin.module';
import { AnnouncementsModule } from './modules/announcements/announcements.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    PrismaModule,
    SettingsModule,
    AuthModule,
    ProfilesModule,
    PlayersModule,
    TrainingModule,
    DrillsModule,
    DashboardModule,
    MatchesModule,
    CalendarModule,
    AiModule,
    ExternalSourcesModule,
    AdminModule,
    AnnouncementsModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
