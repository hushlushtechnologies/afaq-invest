import { Module } from '@nestjs/common';
import { StaffController } from './staff.controller.js';
import { StaffInvitationsService } from './staff-invitations.service.js';
import { StaffManagementService } from './staff-management.service.js';
import { StaffService } from './staff.service.js';

@Module({
  controllers: [StaffController],
  providers: [StaffService, StaffInvitationsService, StaffManagementService],
  exports: [StaffService, StaffInvitationsService, StaffManagementService],
})
export class StaffModule {}
