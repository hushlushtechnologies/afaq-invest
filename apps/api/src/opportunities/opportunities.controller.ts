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
import type {
  OpportunityDetail,
  OpportunityListItem,
  OpportunitySummary,
  Paginated,
} from '@afaq/types';
import { CurrentStaff } from '../auth/current-staff.decorator.js';
import { RequirePermissions } from '../auth/permissions.decorator.js';
import type { StaffContext } from '../auth/staff-context.types.js';
import { ListOpportunitiesDto } from './dto/list-opportunities.dto.js';
import {
  CreateOpportunityDto,
  OpportunityNoteDto,
  OpportunityReasonDto,
  UpdateOpportunityDto,
} from './dto/write-opportunity.dto.js';
import { OpportunitiesManagementService } from './opportunities-management.service.js';
import { OpportunitiesService } from './opportunities.service.js';

/**
 * The opportunity endpoints.
 *
 * Each route names the permission it needs, from the keys Sprint 3 already
 * defined: reading is opportunity.view; writing a draft is .create and .edit;
 * every change to whether investors can see or enter a raise — open, suspend,
 * resume, close, cancel — is opportunity.approve, described in the catalogue
 * as "Publish opportunities to investors"; deleting a draft is .delete.
 *
 * Status changes are separate routes rather than one "set status" endpoint,
 * so each is its own audited act with its own name, and so a route that
 * opens a raise can never be used to do something else.
 *
 * Note for anyone adding a route here: one method decorator per method. Two
 * stacked on one method silently keeps only the last, and the other route
 * vanishes with a 404 — route-protection.spec.ts fails if that happens.
 */
@ApiTags('Opportunities')
@Controller('opportunities')
export class OpportunitiesController {
  constructor(
    private readonly opportunities: OpportunitiesService,
    private readonly management: OpportunitiesManagementService,
  ) {}

  @Get()
  @RequirePermissions('opportunity.view')
  @ApiOperation({ summary: 'List opportunities' })
  @ApiOkResponse({ description: 'A page of opportunities' })
  @ApiForbiddenResponse({ description: 'Missing opportunity.view' })
  list(@Query() query: ListOpportunitiesDto): Promise<Paginated<OpportunityListItem>> {
    return this.opportunities.list(query);
  }

  /**
   * Declared before the ":id" routes on purpose: Nest matches in order, and
   * "summary" would otherwise be taken for an id and rejected by the UUID pipe.
   */
  @Get('summary')
  @RequirePermissions('opportunity.view')
  @ApiOperation({ summary: 'Opportunity counts and open totals for the dashboard' })
  @ApiOkResponse({ description: 'Counts of what actually exists' })
  summary(): Promise<OpportunitySummary> {
    return this.opportunities.summary();
  }

  @Get('by-slug/:slug')
  @RequirePermissions('opportunity.view')
  @ApiOperation({ summary: 'One opportunity, by its web address' })
  @ApiOkResponse({ description: 'The opportunity, with its pinned terms once opened' })
  @ApiNotFoundResponse({ description: 'No such opportunity' })
  findBySlug(@Param('slug') slug: string): Promise<OpportunityDetail> {
    return this.opportunities.findBySlug(slug);
  }

  @Get(':id')
  @RequirePermissions('opportunity.view')
  @ApiOperation({ summary: 'One opportunity' })
  @ApiOkResponse({ description: 'The opportunity, with its pinned terms once opened' })
  @ApiNotFoundResponse({ description: 'No such opportunity' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<OpportunityDetail> {
    return this.opportunities.findOne(id);
  }

  @Post()
  @RequirePermissions('opportunity.create')
  @ApiOperation({ summary: 'Draft an opportunity' })
  @ApiCreatedResponse({ description: 'The draft was created' })
  @ApiBadRequestResponse({ description: 'The draft is not valid; every issue is listed' })
  @ApiConflictResponse({ description: 'Too many opportunities already share that title' })
  create(
    @CurrentStaff() actor: StaffContext,
    @Body() body: CreateOpportunityDto,
  ): Promise<{ id: string }> {
    return this.management.create(actor, body);
  }

  @Patch(':id')
  @RequirePermissions('opportunity.edit')
  @ApiOperation({ summary: "Change an opportunity's details" })
  @ApiOkResponse({ description: 'Updated' })
  @ApiBadRequestResponse({ description: 'Nothing to change, or the result is not valid' })
  @ApiConflictResponse({
    description: 'It is finished, or the change is not allowed once it has opened',
  })
  update(
    @CurrentStaff() actor: StaffContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateOpportunityDto,
  ): Promise<{ id: string }> {
    return this.management.update(actor, id, body);
  }

  /** Opens a draft to investors and pins the ladder that is live right now. */
  @Post(':id/open')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('opportunity.approve')
  @ApiOperation({ summary: 'Open a draft to investors, pinning the live terms' })
  @ApiOkResponse({ description: 'Opened' })
  @ApiBadRequestResponse({ description: 'Not ready to open; every reason is listed' })
  @ApiConflictResponse({ description: 'Not a draft, or no ladder is published' })
  open(
    @CurrentStaff() actor: StaffContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: OpportunityNoteDto,
  ): Promise<{ id: string }> {
    return this.management.open(actor, id, body);
  }

  @Post(':id/suspend')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('opportunity.approve')
  @ApiOperation({ summary: 'Halt a running opportunity. A reason is required.' })
  @ApiOkResponse({ description: 'Suspended' })
  @ApiConflictResponse({ description: 'It is not open' })
  suspend(
    @CurrentStaff() actor: StaffContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: OpportunityReasonDto,
  ): Promise<{ id: string }> {
    return this.management.suspend(actor, id, body);
  }

  /** Resumes on the terms already pinned. Never re-prices. */
  @Post(':id/resume')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('opportunity.approve')
  @ApiOperation({ summary: 'Resume a suspended opportunity on its pinned terms' })
  @ApiOkResponse({ description: 'Resumed' })
  @ApiBadRequestResponse({
    description: 'Its closing date has passed, or the company cannot take money',
  })
  @ApiConflictResponse({ description: 'It is not suspended' })
  resume(
    @CurrentStaff() actor: StaffContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: OpportunityNoteDto,
  ): Promise<{ id: string }> {
    return this.management.resume(actor, id, body);
  }

  @Post(':id/close')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('opportunity.approve')
  @ApiOperation({ summary: 'Finish an opportunity. Final.' })
  @ApiOkResponse({ description: 'Closed' })
  @ApiConflictResponse({ description: 'It is a draft, or already finished' })
  close(
    @CurrentStaff() actor: StaffContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: OpportunityNoteDto,
  ): Promise<{ id: string }> {
    return this.management.close(actor, id, body);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('opportunity.approve')
  @ApiOperation({ summary: 'Withdraw an opportunity. Final; a reason is required.' })
  @ApiOkResponse({ description: 'Cancelled' })
  @ApiConflictResponse({ description: 'It is already finished, or fully funded' })
  cancel(
    @CurrentStaff() actor: StaffContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: OpportunityReasonDto,
  ): Promise<{ id: string }> {
    return this.management.cancel(actor, id, body);
  }

  @Delete(':id')
  @RequirePermissions('opportunity.delete')
  @ApiOperation({ summary: 'Discard a draft. Anything opened cannot be deleted.' })
  @ApiOkResponse({ description: 'Deleted' })
  @ApiConflictResponse({ description: 'It is not a draft' })
  remove(
    @CurrentStaff() actor: StaffContext,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ id: string }> {
    return this.management.deleteDraft(actor, id);
  }
}
