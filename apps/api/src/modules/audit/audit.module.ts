import { Module } from '@nestjs/common';
import { SensitiveDataAuditService } from './sensitive-data-audit.service';

/** Provides the sensitive-data access audit trail (TZ §16.3) to feature modules. */
@Module({
  providers: [SensitiveDataAuditService],
  exports: [SensitiveDataAuditService],
})
export class AuditModule {}
