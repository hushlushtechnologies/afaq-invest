import { SetMetadata, type CustomDecorator } from '@nestjs/common';
import type { PermissionKey } from '@afaq/types';

export const PERMISSIONS_KEY = 'afaq:permissions';
export const PERMISSIONS_MODE_KEY = 'afaq:permissionsMode';

/**
 * What an endpoint requires.
 *
 * @RequirePermissions('staff.create')                  one permission
 * @RequirePermissions('staff.edit', 'staff.manage')    both
 *
 * The keys are checked when the code is compiled, so a typo cannot silently
 * create an endpoint nobody can ever reach.
 */
export const RequirePermissions = (...permissions: PermissionKey[]): CustomDecorator<string> =>
  SetMetadata(PERMISSIONS_KEY, permissions);

/**
 * The same, but any one of them is enough — for a screen several roles reach
 * by different routes.
 */
export function RequireAnyPermission(...permissions: PermissionKey[]) {
  return (target: object, key?: string | symbol, descriptor?: PropertyDescriptor): void => {
    const applyTo = descriptor?.value ?? target;
    SetMetadata(PERMISSIONS_KEY, permissions)(applyTo as never);
    SetMetadata(PERMISSIONS_MODE_KEY, 'any')(applyTo as never);
  };
}
