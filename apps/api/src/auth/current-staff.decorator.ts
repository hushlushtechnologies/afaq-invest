import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { StaffContext } from './staff-context.types.js';

export interface RequestWithStaff extends Request {
  staff?: StaffContext;
}

/**
 * The signed-in staff member, for controllers and services.
 *
 * Only ever present on requests the guard has already approved, so it is safe
 * to treat as definitely there inside a protected handler.
 */
export const CurrentStaff = createParamDecorator(
  (data: keyof StaffContext | undefined, context: ExecutionContext): unknown => {
    const request = context.switchToHttp().getRequest<RequestWithStaff>();
    const staff = request.staff;

    if (!staff) {
      throw new Error('CurrentStaff used on a route the auth guard did not protect.');
    }

    return data ? staff[data] : staff;
  },
);
