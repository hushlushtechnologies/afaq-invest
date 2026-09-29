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
import type { CompanyDetail, CompanyListItem, CompanySummary, Paginated } from '@afaq/types';
import { CurrentStaff } from '../auth/current-staff.decorator.js';
import { RequirePermissions } from '../auth/permissions.decorator.js';
import type { StaffContext } from '../auth/staff-context.types.js';
import { CompaniesManagementService } from './companies-management.service.js';
import { CompaniesService } from './companies.service.js';
import { ListCompaniesDto } from './dto/list-companies.dto.js';
import {
  ChangeCompanyStatusDto,
  ChangeCompanyVerificationDto,
  CreateCompanyDto,
  ReorderCompaniesDto,
  SetCompanyFeaturedDto,
  UpdateCompanyDto,
} from './dto/write-company.dto.js';

/**
 * The company endpoints.
 *
 * Each route names the permission it needs. Reading is company.view; ordinary
 * editing is company.edit; status, featuring and ordering are company.manage;
 * verification is company.verify, which Compliance holds and the Investment
 * Manager deliberately does not.
 *
 * Note for anyone adding a route here: one method decorator per method. Two
 * stacked on one method silently keeps only the last, and the other route
 * vanishes with a 404 — route-protection.spec.ts now fails if that happens.
 */
@ApiTags('Companies')
@Controller('companies')
export class CompaniesController {
  constructor(
    private readonly companies: CompaniesService,
    private readonly management: CompaniesManagementService,
  ) {}

  @Get()
  @RequirePermissions('company.view')
  @ApiOperation({ summary: 'List companies' })
  @ApiOkResponse({ description: 'A page of companies' })
  @ApiForbiddenResponse({ description: 'Missing company.view' })
  list(@Query() query: ListCompaniesDto): Promise<Paginated<CompanyListItem>> {
    return this.companies.list(query);
  }

  /**
   * Declared before the ":id" routes on purpose: Nest matches in order, and
   * "summary" would otherwise be taken for an id and rejected by the UUID pipe.
   */
  @Get('summary')
  @RequirePermissions('company.view')
  @ApiOperation({ summary: 'Company counts for the dashboard' })
  @ApiOkResponse({ description: 'Counts of what actually exists' })
  summary(): Promise<CompanySummary> {
    return this.companies.summary();
  }

  @Get('sectors')
  @RequirePermissions('company.view')
  @ApiOperation({ summary: 'The sectors currently in use' })
  @ApiOkResponse({ description: 'Distinct sector names, for the list filter' })
  sectors(): Promise<string[]> {
    return this.companies.sectors();
  }

  @Get('by-slug/:slug')
  @RequirePermissions('company.view')
  @ApiOperation({ summary: 'One company, by its web address' })
  @ApiOkResponse({ description: 'The company' })
  @ApiNotFoundResponse({ description: 'No such company' })
  findBySlug(@Param('slug') slug: string): Promise<CompanyDetail> {
    return this.companies.findBySlug(slug);
  }

  @Get(':id')
  @RequirePermissions('company.view')
  @ApiOperation({ summary: 'One company' })
  @ApiOkResponse({ description: 'The company' })
  @ApiNotFoundResponse({ description: 'No such company' })
  // ParseUUIDPipe turns a malformed id into a clean 400 before it reaches the
  // database.
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<CompanyDetail> {
    return this.companies.findOne(id);
  }

  @Post()
  @RequirePermissions('company.create')
  @ApiOperation({ summary: 'Add a company' })
  @ApiCreatedResponse({ description: 'The company was created' })
  @ApiConflictResponse({ description: 'Another company already uses that web address' })
  @ApiBadRequestResponse({ description: 'The name has too few letters to make an address from' })
  create(
    @CurrentStaff() actor: StaffContext,
    @Body() body: CreateCompanyDto,
  ): Promise<{ id: string }> {
    return this.management.create(actor, body);
  }

  @Patch(':id')
  @RequirePermissions('company.edit')
  @ApiOperation({ summary: "Change a company's details" })
  @ApiOkResponse({ description: 'Updated' })
  @ApiBadRequestResponse({ description: 'Nothing to change' })
  update(
    @CurrentStaff() actor: StaffContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateCompanyDto,
  ): Promise<{ id: string }> {
    return this.management.update(actor, id, body);
  }

  /** Whether the company trades. A different power from editing its details. */
  @Patch(':id/status')
  @RequirePermissions('company.manage')
  @ApiOperation({ summary: 'Activate, deactivate or suspend a company' })
  @ApiOkResponse({ description: 'Updated' })
  @ApiBadRequestResponse({ description: 'It is already in that state' })
  changeStatus(
    @CurrentStaff() actor: StaffContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: ChangeCompanyStatusDto,
  ): Promise<{ id: string }> {
    return this.management.changeStatus(actor, id, body);
  }

  /**
   * A compliance decision, not housekeeping — hence its own permission. Afaq's
   * own companies are refused here: verification does not apply to them.
   */
  @Patch(':id/verification')
  @RequirePermissions('company.verify')
  @ApiOperation({ summary: 'Move an outside company through verification' })
  @ApiOkResponse({ description: 'Updated' })
  @ApiForbiddenResponse({ description: 'Missing company.verify' })
  @ApiBadRequestResponse({ description: 'Not an outside company, or not a permitted move' })
  changeVerification(
    @CurrentStaff() actor: StaffContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: ChangeCompanyVerificationDto,
  ): Promise<{ id: string }> {
    return this.management.changeVerification(actor, id, body);
  }

  @Patch(':id/featured')
  @RequirePermissions('company.manage')
  @ApiOperation({ summary: 'Feature or unfeature a company' })
  @ApiOkResponse({ description: 'Updated' })
  setFeatured(
    @CurrentStaff() actor: StaffContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: SetCompanyFeaturedDto,
  ): Promise<{ id: string }> {
    return this.management.setFeatured(actor, id, body);
  }

  /**
   * Not under ":id" — a reorder is about the whole list, and takes every id.
   * Sending a partial list is refused rather than half-applied.
   */
  @Post('reorder')
  @RequirePermissions('company.manage')
  @ApiOperation({ summary: 'Rewrite the marketplace order' })
  @ApiOkResponse({ description: 'How many companies were renumbered' })
  @ApiBadRequestResponse({ description: 'The order is incomplete, or names an unknown company' })
  reorder(
    @CurrentStaff() actor: StaffContext,
    @Body() body: ReorderCompaniesDto,
  ): Promise<{ updated: number }> {
    return this.management.reorder(actor, body);
  }
}
