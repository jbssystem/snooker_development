import { SetMetadata } from '@nestjs/common';

/** Route requires EDIT access (or ownership) on the active cabinet. */
export const WRITE_ACCESS_KEY = 'sharing:requiresEdit';
export const WriteAccess = (): MethodDecorator & ClassDecorator =>
  SetMetadata(WRITE_ACCESS_KEY, true);

/** Route is only allowed for the owner of the active cabinet. */
export const OWNER_ONLY_KEY = 'sharing:requiresOwner';
export const OwnerOnly = (): MethodDecorator & ClassDecorator =>
  SetMetadata(OWNER_ONLY_KEY, true);

/** Route touches sensitive wellness data; requires canAccessWellness. */
export const WELLNESS_KEY = 'sharing:requiresWellness';
export const RequiresWellness = (): MethodDecorator & ClassDecorator =>
  SetMetadata(WELLNESS_KEY, true);
