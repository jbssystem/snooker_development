import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { AiController } from './ai.controller';
import { AiFocusPresetsController } from './ai-focus-presets.controller';
import { AiService } from './ai.service';

@Module({
  imports: [AuthModule, AuditModule],
  controllers: [AiController, AiFocusPresetsController],
  providers: [AiService],
})
export class AiModule {}