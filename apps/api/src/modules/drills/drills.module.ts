import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DrillsController } from './drills.controller';
import { DrillsService } from './drills.service';

@Module({
  imports: [AuthModule],
  controllers: [DrillsController],
  providers: [DrillsService],
})
export class DrillsModule {}
