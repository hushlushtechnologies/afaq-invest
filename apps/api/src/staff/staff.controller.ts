import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import {
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
import { StaffInvitationsService } from './staff-invitations.service.js';
import { StaffService } from './staff.service.js';

@ApiTags('Staff')
@Controller('staff')
export class StaffController {
  constructor(
    private readonly staff: StaffService,
    private readonly invitations: StaffInvitationsService,
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
}
