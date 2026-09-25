import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthController } from './auth.controller.js';
import { AuthGuard } from './auth.guard.js';
import { PermissionsGuard } from './permissions.guard.js';
import { StaffContextService } from './staff-context.service.js';

/**
 * Authentication and the staff context.
 *
 * The guard is registered globally here rather than on individual
 * controllers: protection is then the default for the whole API, including
 * endpoints nobody has written yet.
 */
@Module({
  controllers: [AuthController],
  providers: [
    StaffContextService,
    // Order matters: authentication first, then authorization. Nest runs
    // global guards in the order they are registered.
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
  exports: [StaffContextService],
})
export class AuthModule {}
