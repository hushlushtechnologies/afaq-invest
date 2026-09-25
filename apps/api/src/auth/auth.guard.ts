import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { IS_PUBLIC_KEY } from './public.decorator.js';
import { StaffContextService } from './staff-context.service.js';
import type { RequestWithStaff } from './current-staff.decorator.js';

/**
 * The gate every request passes through.
 *
 * Registered globally, so endpoints are protected unless they say otherwise
 * with @Public(). Forgetting to protect something is therefore impossible;
 * the mistake you can make is opening something deliberately.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly staffContext: StaffContextService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<RequestWithStaff>();
    const token = extractBearerToken(request);

    if (!token) {
      throw new UnauthorizedException({ reason: 'missing_token', message: 'Sign in to continue.' });
    }

    // Anything wrong throws from here with the right status and reason.
    request.staff = await this.staffContext.resolve(token);

    return true;
  }
}

function extractBearerToken(request: Request): string | undefined {
  const header = request.headers.authorization;
  if (!header) return undefined;

  const [scheme, value] = header.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !value) return undefined;

  return value.trim();
}
