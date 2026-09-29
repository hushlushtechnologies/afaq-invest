import { PATH_METADATA, METHOD_METADATA } from '@nestjs/common/constants.js';
import { describe, expect, it } from 'vitest';
import { AuditController } from '../audit/audit.controller.js';
import { AuthController } from './auth.controller.js';
import { CompaniesController } from '../companies/companies.controller.js';
import { HealthController } from '../health/health.controller.js';
import { InvestmentRulesController } from '../investment-rules/investment-rules.controller.js';
import { RolesController } from '../roles/roles.controller.js';
import { StaffController } from '../staff/staff.controller.js';
import { ALLOW_INVITED_KEY } from './allow-invited.decorator.js';
import { PERMISSIONS_KEY } from './permissions.decorator.js';
import { IS_PUBLIC_KEY } from './public.decorator.js';

/**
 * Every route in the API, checked for protection.
 *
 * The guards are global, so authentication is the default and cannot be
 * forgotten. Authorization is not: an endpoint with no @RequirePermissions is
 * open to every signed-in staff member, which is occasionally right and
 * usually an oversight.
 *
 * This walks the controllers and insists each route is one of three things —
 * deliberately public, deliberately available to any staff member, or
 * guarded by a permission. A new endpoint that is none of those fails here,
 * which is the point: the failure arrives before the endpoint ships, not
 * after somebody finds it.
 */

type ControllerConstructor = {
  new (...args: never[]): object;
  prototype: object;
  name: string;
};

const CONTROLLERS: readonly ControllerConstructor[] = [
  AuthController,
  HealthController,
  StaffController,
  RolesController,
  AuditController,
  CompaniesController,
  InvestmentRulesController,
];

/**
 * Routes any signed-in staff member may call, and why.
 *
 * Adding to this list is a decision, which is why it is written down with
 * reasons rather than inferred.
 */
const ANY_AUTHENTICATED_STAFF: Record<string, string> = {
  'GET auth/me': 'Everyone needs to know who they are and what they may do.',
  'POST auth/sign-out': 'Ending your own session needs no permission.',
  'POST auth/accept-invitation': 'Called before the account is active; it is how you become staff.',
};

/**
 * Controller methods that deliberately are not routes.
 *
 * Keep this list short. A method on a controller with no route decorator is
 * usually a route that lost its decorator rather than a helper — which is
 * exactly how GET /auth/me once disappeared while every test still passed.
 *
 * TypeScript's `private` is erased at compile time, so a private helper is an
 * ordinary prototype method at runtime and shows up here like any other. That
 * is why these are listed by hand: the check cannot tell intent, only the
 * absence of a decorator.
 */
const INTENTIONAL_NON_ROUTES: Record<string, string> = {
  'HealthController.checkDatabase':
    'A private indicator passed to health.check(), not an endpoint of its own.',
};

interface Route {
  controller: string;
  method: string;
  path: string;
  handler: (...args: unknown[]) => unknown;
}

/** Every route the API exposes, read from the metadata Nest itself uses. */
function collectRoutes(): Route[] {
  const routes: Route[] = [];

  for (const controller of CONTROLLERS) {
    const base = (Reflect.getMetadata(PATH_METADATA, controller) as string) ?? '';

    const prototype = controller.prototype as Record<string, unknown>;

    for (const name of Object.getOwnPropertyNames(prototype)) {
      if (name === 'constructor') continue;

      const handler = prototype[name];

      if (typeof handler !== 'function') continue;

      const path = Reflect.getMetadata(PATH_METADATA, handler) as string | undefined;

      if (path === undefined) continue;

      const verb = Reflect.getMetadata(METHOD_METADATA, handler) as number;

      routes.push({
        controller: controller.name,
        method: VERBS[verb] ?? String(verb),
        path: [base, path].filter((part) => part && part !== '/').join('/'),
        handler: handler as (...args: unknown[]) => unknown,
      });
    }
  }

  return routes;
}

const VERBS: Record<number, string> = { 0: 'GET', 1: 'POST', 2: 'PUT', 3: 'DELETE', 4: 'PATCH' };

function describeRoute(route: Route): string {
  return `${route.method} ${route.path}`;
}

const routes = collectRoutes();

describe('route protection', () => {
  it('finds the routes at all', () => {
    // If this ever drops to nothing, every other check below passes for the
    // wrong reason.
    expect(routes.length).toBeGreaterThan(10);
  });

  /**
   * The list below is a claim that these routes exist and need no permission.
   * Until this test was added it only ever *permitted* them, so when
   * GET /auth/me lost its decorator the list went on describing a route that
   * was no longer served and nothing failed. The Admin Portal, which cannot
   * draw its sidebar without that route, showed every signed-in person an
   * empty set of permissions instead.
   */
  it.each(Object.keys(ANY_AUTHENTICATED_STAFF))('serves %s', (label) => {
    const served = routes.map(describeRoute);

    expect(
      served,
      `${label} is listed as available to any signed-in staff member, but no such ` +
        'route is registered. Either it lost its method decorator, or two route ' +
        'decorators are stacked on one method — Nest keeps only one of them.',
    ).toContain(label);
  });

  it('leaves no controller method without a route', () => {
    const orphans: string[] = [];

    for (const controller of CONTROLLERS) {
      const prototype = controller.prototype as Record<string, unknown>;

      for (const name of Object.getOwnPropertyNames(prototype)) {
        if (name === 'constructor') continue;

        const member = prototype[name];
        if (typeof member !== 'function') continue;
        if (Reflect.getMetadata(PATH_METADATA, member) !== undefined) continue;

        const label = `${controller.name}.${name}`;
        if (label in INTENTIONAL_NON_ROUTES) continue;

        orphans.push(label);
      }
    }

    expect(
      orphans,
      'These controller methods are not reachable over HTTP. A handler that lost ' +
        'its @Get/@Post decorator is dead code that looks alive, and the route it ' +
        'used to serve now returns 404. Give it its decorator back, or list it in ' +
        'INTENTIONAL_NON_ROUTES with a reason.',
    ).toEqual([]);
  });

  it.each(routes.map((route) => [describeRoute(route), route] as const))(
    '%s is protected',
    (label, route) => {
      const isPublic = Reflect.getMetadata(IS_PUBLIC_KEY, route.handler) === true;
      const permissions = Reflect.getMetadata(PERMISSIONS_KEY, route.handler) as
        string[] | undefined;
      const allowedForAnyStaff = label in ANY_AUTHENTICATED_STAFF;

      const protection = isPublic || allowedForAnyStaff || (permissions?.length ?? 0) > 0;

      expect(
        protection,
        `${label} has no permission, is not @Public, and is not listed as available to ` +
          'any signed-in staff member. Add @RequirePermissions, or add it to ' +
          'ANY_AUTHENTICATED_STAFF with a reason.',
      ).toBe(true);
    },
  );

  it('keeps the public routes to the ones that must be', () => {
    const publicRoutes = routes
      .filter((route) => Reflect.getMetadata(IS_PUBLIC_KEY, route.handler) === true)
      .map(describeRoute)
      .sort();

    // The health check only. Anything else appearing here is a hole.
    expect(publicRoutes).toEqual(['GET health']);
  });

  it('lets an invited person reach exactly one route', () => {
    const invitedRoutes = routes
      .filter((route) => Reflect.getMetadata(ALLOW_INVITED_KEY, route.handler) === true)
      .map(describeRoute);

    expect(invitedRoutes).toEqual(['POST auth/accept-invitation']);
  });

  it('guards every staff and role write with a permission', () => {
    const writes = routes.filter(
      (route) =>
        ['POST', 'PATCH', 'PUT', 'DELETE'].includes(route.method) &&
        (route.path.startsWith('staff') || route.path.startsWith('roles')),
    );

    expect(writes.length).toBeGreaterThan(5);

    for (const route of writes) {
      const permissions = Reflect.getMetadata(PERMISSIONS_KEY, route.handler) as string[];
      expect(permissions?.length, `${describeRoute(route)} has no permission`).toBeGreaterThan(0);
    }
  });

  it('guards everything that reads the audit trail', () => {
    const auditRoutes = routes.filter((route) => route.path.startsWith('audit'));

    expect(auditRoutes.length).toBeGreaterThan(0);

    for (const route of auditRoutes) {
      const permissions = Reflect.getMetadata(PERMISSIONS_KEY, route.handler) as string[];
      expect(permissions, describeRoute(route)).toContain('audit.view');
    }
  });
});
