import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { hasAllPermissions, hasAnyPermission, type PermissionKey } from '@afaq/types';
import type { RequestWithStaff } from './current-staff.decorator.js';
import { PERMISSIONS_KEY, PERMISSIONS_MODE_KEY } from './permissions.decorator.js';

/**
 * Checks what an endpoint requires against what the caller holds.
 *
 * Runs after the authentication guard, so the staff context is already on the
 * request. The decision itself is made by hasPermission() in @afaq/types —
 * the same function the Admin Portal uses to decide what to show, and the one
 * place Super Admin is special.
 *
 * An endpoint with no @RequirePermissions still needs a signed-in staff
 * member; it simply asks for nothing beyond that.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<PermissionKey[] | undefined>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!required || required.length === 0) return true;

    const request = context.switchToHttp().getRequest<RequestWithStaff>();
    const staff = request.staff;

    // No staff context means the route is public but asks for permissions —
    // a contradiction worth failing loudly rather than quietly allowing.
    if (!staff) {
      throw new ForbiddenException({
        reason: 'missing_permission',
        message: 'This action requires a signed-in staff account.',
      });
    }

    const mode = this.reflector.getAllAndOverride<'any' | undefined>(PERMISSIONS_MODE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const allowed =
      mode === 'any' ? hasAnyPermission(staff, required) : hasAllPermissions(staff, required);

    if (!allowed) {
      const missing = required.filter((permission) => !hasAnyPermission(staff, [permission]));

      throw new ForbiddenException({
        reason: 'missing_permission',
        // Naming the permission helps support and the audit trail. It reveals
        // nothing: the catalogue is the same for everyone.
        permission: missing[0],
        message: 'You do not have permission to do this.',
      });
    }

    return true;
  }
}
