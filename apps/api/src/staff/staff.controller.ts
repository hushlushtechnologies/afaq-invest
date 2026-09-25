import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Paginated, StaffListItem } from '@afaq/types';
import { CurrentStaff } from '../auth/current-staff.decorator.js';
import { RequirePermissions } from '../auth/permissions.decorator.js';
import type { StaffContext } from '../auth/staff-context.types.js';
import { InviteStaffDto } from './dto/invite-staff.dto.js';
import { ListStaffDto } from './dto/list-staff.dto.js';
import {
  UpdateStaffDto,
  UpdateStaffRolesDto,
  UpdateStaffStatusDto,
} from './dto/update-staff.dto.js';
import { InvitationLifecycleService } from './invitation-lifecycle.service.js';
import { StaffManagementService } from './staff-management.service.js';
import { StaffInvitationsService } from './staff-invitations.service.js';
import { StaffService } from './staff.service.js';

@ApiTags('Staff')
@Controller('staff')
export class StaffController {
  constructor(
    private readonly staff: StaffService,
    private readonly invitations: StaffInvitationsService,
    private readonly management: StaffManagementService,
    private readonly lifecycle: InvitationLifecycleService,
  ) {}

  @Get()
  @RequirePermissions('staff.view')
  @ApiOperation({ summary: 'List staff members' })
  @ApiOkResponse({ description: 'A page of staff members' })
  @ApiForbiddenResponse({ description: 'Missing staff.view' })
  list(@Query() query: ListStaffDto): Promise<Paginated<StaffListItem>> {
    return this.staff.list(query);
  }

  @Post()
  @RequirePermissions('staff.create')
  @ApiOperation({ summary: 'Invite a staff member' })
  @ApiCreatedResponse({ description: 'The invitation was sent' })
  @ApiForbiddenResponse({ description: 'Missing staff.create, or granting more than you hold' })
  @ApiConflictResponse({ description: 'That email already belongs to a staff member' })
  invite(
    @CurrentStaff() actor: StaffContext,
    @Body() body: InviteStaffDto,
  ): Promise<{ id: string }> {
    return this.invitations.invite(actor, body);
  }

  @Get(':id')
  @RequirePermissions('staff.view')
  @ApiOperation({ summary: 'One staff member' })
  @ApiOkResponse({ description: 'The staff member' })
  @ApiNotFoundResponse({ description: 'No such staff member' })
  // ParseUUIDPipe rejects anything that is not an id before it reaches the
  // database, so a malformed value is a clean 400 rather than a query error.
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<StaffListItem> {
    return this.staff.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('staff.edit')
  @ApiOperation({ summary: "Change a staff member's details" })
  @ApiOkResponse({ description: 'Updated' })
  updateDetails(
    @CurrentStaff() actor: StaffContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateStaffDto,
  ): Promise<{ id: string }> {
    return this.management.updateDetails(actor, id, body);
  }

  /** Assigning roles is separate from editing details: it is a different power. */
  @Patch(':id/roles')
  @RequirePermissions('staff.manage')
  @ApiOperation({ summary: "Replace a staff member's roles" })
  @ApiOkResponse({ description: 'Updated' })
  @ApiForbiddenResponse({ description: 'Granting more than you hold' })
  updateRoles(
    @CurrentStaff() actor: StaffContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateStaffRolesDto,
  ): Promise<{ id: string }> {
    return this.management.updateRoles(actor, id, body);
  }

  @Patch(':id/status')
  @RequirePermissions('staff.manage')
  @ApiOperation({ summary: 'Suspend, disable or reactivate a staff member' })
  @ApiOkResponse({ description: 'Updated' })
  @ApiBadRequestResponse({ description: 'Not allowed: yourself, or the last Super Admin' })
  updateStatus(
    @CurrentStaff() actor: StaffContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateStaffStatusDto,
  ): Promise<{ id: string }> {
    return this.management.updateStatus(actor, id, body);
  }

  @Post(':id/resend-invitation')
  @RequirePermissions('staff.create')
  @ApiOperation({ summary: 'Send an invitation again and restart its clock' })
  @ApiOkResponse({ description: 'Sent' })
  @ApiBadRequestResponse({ description: 'They have already accepted, or sending failed' })
  resendInvitation(
    @CurrentStaff() actor: StaffContext,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ id: string }> {
    return this.lifecycle.resend(actor, id);
  }
}
