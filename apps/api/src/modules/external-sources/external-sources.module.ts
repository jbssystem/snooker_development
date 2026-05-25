import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ExternalSourcesController } from './external-sources.controller';
import { ExternalSourcesService } from './external-sources.service';

@Module({
  imports: [AuthModule],
  controllers: [ExternalSourcesController],
  providers: [ExternalSourcesService],
})
export class ExternalSourcesModule {}
