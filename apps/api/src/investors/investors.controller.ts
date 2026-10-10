import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
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
import type { InvestorDetail, InvestorListItem, InvestorSummary, Paginated } from '@afaq/types';
import { CurrentStaff } from '../auth/current-staff.decorator.js';
import { RequirePermissions } from '../auth/permissions.decorator.js';
import type { StaffContext } from '../auth/staff-context.types.js';
import { ListInvestorsDto } from './dto/list-investors.dto.js';
import {
  InviteInvestorDto,
  InvestorNoteDto,
  InvestorReasonDto,
  UpdateInvestorDto,
} from './dto/write-investor.dto.js';
import { InvestorsManagementService } from './investors-management.service.js';
import { InvestorsService } from './investors.service.js';

/**
 * The investor account endpoints, for staff.
 *
 * Each route names the permission it needs, from the keys Sprint 3 already
 * defined: reading is investor.view; inviting, and sending an invitation
 * again, is investor.create; contact details, suspending and reinstating are
 * investor.edit; closing an account and withdrawing an unanswered invitation
 * — the two ways a relationship ends — are investor.delete.
 *
 * Account changes are separate routes rather than one "set status" endpoint,
 * so each is its own audited act with its own name, and so the route that
 * reinstates an account can never be used to do something else.
 *
 * Note for anyone adding a route here: one method decorator per method. Two
 * stacked on one method silently keeps only the last, and the other route
 * vanishes with a 404 — route-protection.spec.ts fails if that happens.
 */
@ApiTags('Investors')
@Controller('investors')
export class InvestorsController {
  constructor(
    private readonly investors: InvestorsService,
    private readonly management: InvestorsManagementService,
  ) {}

  @Get()
  @RequirePermissions('investor.view')
  @ApiOperation({ summary: 'List investors' })
  @ApiOkResponse({ description: 'A page of investors' })
  @ApiForbiddenResponse({ description: 'Missing investor.view' })
  list(@Query() query: ListInvestorsDto): Promise<Paginated<InvestorListItem>> {
    return this.investors.list(query);
  }

  /**
   * Declared before the ":id" routes on purpose: Nest matches in order, and
   * "summary" would otherwise be taken for an id and rejected by the UUID pipe.
   */
  @Get('summary')
  @RequirePermissions('investor.view')
  @ApiOperation({ summary: 'Investor counts for the dashboard' })
  @ApiOkResponse({ description: 'Counts of what actually exists' })
  summary(): Promise<InvestorSummary> {
    return this.investors.summary();
  }

  @Get(':id')
  @RequirePermissions('investor.view')
  @ApiOperation({ summary: 'One investor' })
  @ApiOkResponse({ description: 'The investor, with their latest identity check' })
  @ApiNotFoundResponse({ description: 'No such investor' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<InvestorDetail> {
    return this.investors.findOne(id);
  }

  @Post()
  @RequirePermissions('investor.create')
  @ApiOperation({ summary: 'Invite somebody to invest. They set a password from the email.' })
  @ApiCreatedResponse({ description: 'Invited' })
  @ApiBadRequestResponse({ description: 'The details are not valid, or too many invitations' })
  @ApiConflictResponse({ description: 'That email address is already in use' })
  invite(
    @CurrentStaff() actor: StaffContext,
    @Body() body: InviteInvestorDto,
  ): Promise<{ id: string }> {
    return this.management.invite(actor, body);
  }

  @Patch(':id')
  @RequirePermissions('investor.edit')
  @ApiOperation({ summary: "Change an investor's contact details or language" })
  @ApiOkResponse({ description: 'Updated' })
  @ApiBadRequestResponse({ description: 'Nothing to change, or not valid' })
  @ApiConflictResponse({ description: 'The account is closed, or the name has been verified' })
  update(
    @CurrentStaff() actor: StaffContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateInvestorDto,
  ): Promise<{ id: string }> {
    return this.management.update(actor, id, body);
  }

  @Post(':id/resend-invitation')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('investor.create')
  @ApiOperation({ summary: 'Send the invitation again, with a fresh expiry' })
  @ApiOkResponse({ description: 'Sent' })
  @ApiBadRequestResponse({ description: 'Sent too recently, or Supabase refused it' })
  @ApiConflictResponse({ description: 'The invitation has already been accepted' })
  resendInvitation(
    @CurrentStaff() actor: StaffContext,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ id: string }> {
    return this.management.resendInvitation(actor, id);
  }

  @Post(':id/suspend')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('investor.edit')
  @ApiOperation({ summary: 'Block an account temporarily. A reason is required.' })
  @ApiOkResponse({ description: 'Suspended' })
  @ApiConflictResponse({ description: 'The account is not active' })
  suspend(
    @CurrentStaff() actor: StaffContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: InvestorReasonDto,
  ): Promise<{ id: string }> {
    return this.management.suspend(actor, id, body);
  }

  @Post(':id/reinstate')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('investor.edit')
  @ApiOperation({ summary: 'Lift a suspension' })
  @ApiOkResponse({ description: 'Reinstated' })
  @ApiConflictResponse({ description: 'The account is not suspended' })
  reinstate(
    @CurrentStaff() actor: StaffContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: InvestorNoteDto,
  ): Promise<{ id: string }> {
    return this.management.reinstate(actor, id, body);
  }

  @Post(':id/close')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('investor.delete')
  @ApiOperation({ summary: 'End the relationship. Final; the record is kept.' })
  @ApiOkResponse({ description: 'Closed' })
  @ApiConflictResponse({ description: 'The account is already closed' })
  close(
    @CurrentStaff() actor: StaffContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: InvestorReasonDto,
  ): Promise<{ id: string }> {
    return this.management.close(actor, id, body);
  }

  @Delete(':id')
  @RequirePermissions('investor.delete')
  @ApiOperation({
    summary: 'Withdraw an invitation nobody accepted. Anything else is closed, never deleted.',
  })
  @ApiOkResponse({ description: 'Withdrawn' })
  @ApiConflictResponse({ description: 'Accepted, or it has identity-check records' })
  withdraw(
    @CurrentStaff() actor: StaffContext,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ id: string }> {
    return this.management.withdraw(actor, id);
  }
}
