import { Module } from '@nestjs/common';
import { StaffController } from './staff.controller.js';
import { InvitationLifecycleService } from './invitation-lifecycle.service.js';
import { StaffInvitationsService } from './staff-invitations.service.js';
import { StaffManagementService } from './staff-management.service.js';
import { StaffService } from './staff.service.js';

@Module({
  controllers: [StaffController],
  providers: [
    StaffService,
    StaffInvitationsService,
    StaffManagementService,
    InvitationLifecycleService,
  ],
  exports: [
    StaffService,
    StaffInvitationsService,
    StaffManagementService,
    InvitationLifecycleService,
  ],
})
export class StaffModule {}
