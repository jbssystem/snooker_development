import { Global, Module } from '@nestjs/common';
import { SettingsService } from './settings.service';

/**
 * Global so AiService, DrillsService and the admin controller can resolve the
 * effective AI runtime config without importing this module everywhere.
 */
@Global()
@Module({
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
