import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  AdminUsersQuerySchema,
  BlockUserSchema,
  type AdminUserDetail,
  type AdminUserList,
  type AdminUsersQuery,
  type BlockUserInput,
} from '@snooker/shared';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { CuidValidationPipe } from '../../../common/pipes/cuid-validation.pipe';
import { CurrentUserId } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { AuthService } from '../../auth/auth.service';
import { AdminUsersService } from './admin-users.service';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SYSTEM_ADMIN')
@Controller('admin/users')
export class AdminUsersController {
  constructor(
    private readonly users: AdminUsersService,
    private readonly auth: AuthService,
  ) {}

  @Get()
  list(
    @Query(new ZodValidationPipe(AdminUsersQuerySchema)) query: AdminUsersQuery,
  ): Promise<AdminUserList> {
    return this.users.list(query);
  }

  @Get(':id')
  get(@Param('id', CuidValidationPipe) id: string): Promise<AdminUserDetail> {
    return this.users.get(id);
  }

  @Post(':id/block')
  block(
    @CurrentUserId() actorId: string,
    @Param('id', CuidValidationPipe) id: string,
    @Body(new ZodValidationPipe(BlockUserSchema)) body: BlockUserInput,
  ): Promise<AdminUserDetail> {
    return this.users.block(actorId, id, body.reason);
  }

  @Post(':id/unblock')
  unblock(
    @CurrentUserId() actorId: string,
    @Param('id', CuidValidationPipe) id: string,
  ): Promise<AdminUserDetail> {
    return this.users.unblock(actorId, id);
  }

  @Post(':id/roles/system-admin')
  grantAdmin(
    @CurrentUserId() actorId: string,
    @Param('id', CuidValidationPipe) id: string,
  ): Promise<AdminUserDetail> {
    return this.users.grantAdmin(actorId, id);
  }

  @Delete(':id/roles/system-admin')
  revokeAdmin(
    @CurrentUserId() actorId: string,
    @Param('id', CuidValidationPipe) id: string,
  ): Promise<AdminUserDetail> {
    return this.users.revokeAdmin(actorId, id);
  }

  @Post(':id/verify')
  verify(
    @CurrentUserId() actorId: string,
    @Param('id', CuidValidationPipe) id: string,
  ): Promise<AdminUserDetail> {
    return this.users.verify(actorId, id);
  }

  @Post(':id/resend-verification')
  @HttpCode(HttpStatus.NO_CONTENT)
  async resendVerification(@Param('id', CuidValidationPipe) id: string): Promise<void> {
    const user = await this.users.get(id);
    await this.auth.resendVerification(user.email);
  }
}
