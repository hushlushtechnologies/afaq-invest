import { Module } from '@nestjs/common';
import { StaffController } from './staff.controller.js';
import { StaffInvitationsService } from './staff-invitations.service.js';
import { StaffService } from './staff.service.js';

@Module({
  controllers: [StaffController],
  providers: [StaffService, StaffInvitationsService],
  exports: [StaffService, StaffInvitationsService],
})
export class StaffModule {}
