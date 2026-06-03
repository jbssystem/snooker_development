import { SetMetadata } from '@nestjs/common';
import type { RoleType } from '@prisma/client';

export const ROLES_KEY = 'roles';

/** Restrict a route to users holding at least one of the given roles. */
export const Roles = (...roles: RoleType[]) => SetMetadata(ROLES_KEY, roles);
