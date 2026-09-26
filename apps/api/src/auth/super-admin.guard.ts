import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SetMetadata, type CustomDecorator } from '@nestjs/common';
import type { RequestWithStaff } from './current-staff.decorator.js';

export const SUPER_ADMIN_ONLY_KEY = 'afaq:superAdminOnly';

/**
 * Restricts an endpoint to Super Admins, whatever permissions anyone else
 * holds.
 *
 * For the handful of actions that are stronger than any permission: setting
 * somebody else's password, changing the address they sign in with, moving
 * their roles wholesale. A custom role could otherwise be written that grants
 * these, and they are not the sort of thing that should be grantable.
 */
export const SuperAdminOnly = (): CustomDecorator<string> =>
  SetMetadata(SUPER_ADMIN_ONLY_KEY, true);

@Injectable()
export class SuperAdminGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<boolean>(SUPER_ADMIN_ONLY_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!required) return true;

    const request = context.switchToHttp().getRequest<RequestWithStaff>();

    // AuthGuard has already run, so a missing context here means the guards
    // were registered in the wrong order — refuse rather than assume.
    if (!request.staff?.isSuperAdmin) {
      throw new ForbiddenException({
        reason: 'super_admin_only',
        message: 'Only a Super Admin can do that.',
      });
    }

    return true;
  }
}
