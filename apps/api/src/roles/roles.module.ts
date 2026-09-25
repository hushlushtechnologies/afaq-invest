import { Module } from '@nestjs/common';
import { RolesController } from './roles.controller.js';
import { RolesManagementService } from './roles-management.service.js';
import { RolesService } from './roles.service.js';

@Module({
  controllers: [RolesController],
  providers: [RolesService, RolesManagementService],
  exports: [RolesService, RolesManagementService],
})
export class RolesModule {}
