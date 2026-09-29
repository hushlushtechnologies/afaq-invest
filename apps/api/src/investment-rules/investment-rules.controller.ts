import {
  Body,
  Controller,
  Delete,
  Get,
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
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type {
  InvestmentQuote,
  InvestmentSettings,
  Paginated,
  ResolvedInvestmentTerms,
  RuleSetDetail,
  RuleSetListItem,
} from '@afaq/types';
import { CurrentStaff } from '../auth/current-staff.decorator.js';
import { RequirePermissions } from '../auth/permissions.decorator.js';
import type { StaffContext } from '../auth/staff-context.types.js';
import { ListRuleSetsDto, ResolveTermsDto } from './dto/query-rule-sets.dto.js';
import {
  ArchiveRuleSetDto,
  CreateRuleSetDto,
  PublishRuleSetDto,
  ReplaceLadderDto,
  UpdateInvestmentSettingsDto,
  UpdateRuleSetDto,
} from './dto/write-rule-set.dto.js';
import { InvestmentRulesManagementService } from './investment-rules-management.service.js';
import { InvestmentRulesService } from './investment-rules.service.js';

/**
 * The investment rule endpoints.
 *
 * Reading — including asking what an amount would earn — is
 * investment_rule.view. Everything that changes the rules is
 * investment_rule.manage, and publishing additionally asks the administrator
 * for their own password.
 *
 * Note for anyone adding a route here: one method decorator per method. Two
 * stacked on one method silently keeps only the last, and the other route
 * vanishes with a 404 — route-protection.spec.ts fails if that happens.
 */
@ApiTags('Investment rules')
@Controller('investment-rules')
export class InvestmentRulesController {
  constructor(
    private readonly rules: InvestmentRulesService,
    private readonly management: InvestmentRulesManagementService,
  ) {}

  // =========================================================================
  // SETTINGS
  // =========================================================================

  @Get('settings')
  @RequirePermissions('investment_rule.view')
  @ApiOperation({ summary: 'The platform-wide investment settings' })
  @ApiOkResponse({ description: 'Currency, minimum, ROI cap and step-up policy' })
  @ApiNotFoundResponse({ description: 'The database has not been seeded' })
  settings(): Promise<InvestmentSettings> {
    return this.rules.settings();
  }

  @Patch('settings')
  @RequirePermissions('investment_rule.manage')
  @ApiOperation({ summary: 'Change the platform-wide investment settings' })
  @ApiOkResponse({ description: 'Updated' })
  @ApiBadRequestResponse({ description: 'Nothing to change' })
  updateSettings(
    @CurrentStaff() actor: StaffContext,
    @Body() body: UpdateInvestmentSettingsDto,
  ): Promise<{ id: string }> {
    return this.management.updateSettings(actor, body);
  }

  // =========================================================================
  // PRICING
  // =========================================================================

  /**
   * Declared before the ":id" routes: Nest matches in order, and "resolve"
   * would otherwise be taken for an id and rejected by the UUID pipe.
   */
  @Get('resolve')
  @RequirePermissions('investment_rule.view')
  @ApiOperation({ summary: 'Which tier and terms an amount falls under' })
  @ApiOkResponse({ description: 'The resolved terms, including the version they came from' })
  @ApiBadRequestResponse({ description: 'The amount is below the minimum' })
  @ApiConflictResponse({ description: 'Nothing is published, or that mode is unavailable' })
  resolve(@Query() query: ResolveTermsDto): Promise<ResolvedInvestmentTerms> {
    return this.rules.resolve(query);
  }

  /** The same answer with the money worked out. Computed here, never in a browser. */
  @Get('quote')
  @RequirePermissions('investment_rule.view')
  @ApiOperation({ summary: 'What an amount would earn' })
  @ApiOkResponse({ description: 'Per payout, per year, and over the term' })
  @ApiBadRequestResponse({ description: 'Below the minimum, or a term the tier does not offer' })
  @ApiConflictResponse({ description: 'Nothing is published, or that mode is unavailable' })
  quote(@Query() query: ResolveTermsDto): Promise<InvestmentQuote> {
    return this.rules.quote(query);
  }

  /** The ladder in force right now, for a company or platform-wide. */
  @Get('active')
  @RequirePermissions('investment_rule.view')
  @ApiOperation({ summary: 'The ladder currently in force' })
  @ApiOkResponse({ description: "A company's own live ladder, or the platform-wide one" })
  @ApiConflictResponse({ description: 'Nothing is published' })
  active(@Query('companyId') companyId?: string): Promise<RuleSetDetail> {
    return this.rules.activeFor(companyId);
  }

  // =========================================================================
  // RULE SETS
  // =========================================================================

  @Get()
  @RequirePermissions('investment_rule.view')
  @ApiOperation({ summary: 'List rule sets' })
  @ApiOkResponse({ description: 'A page of rule sets, live first' })
  @ApiForbiddenResponse({ description: 'Missing investment_rule.view' })
  list(@Query() query: ListRuleSetsDto): Promise<Paginated<RuleSetListItem>> {
    return this.rules.list(query);
  }

  @Get(':id')
  @RequirePermissions('investment_rule.view')
  @ApiOperation({ summary: 'One rule set, with its whole ladder' })
  @ApiOkResponse({ description: 'The rule set' })
  @ApiNotFoundResponse({ description: 'No such rule set' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<RuleSetDetail> {
    return this.rules.findOne(id);
  }

  @Post()
  @RequirePermissions('investment_rule.manage')
  @ApiOperation({ summary: 'Start a draft, optionally copying an existing ladder' })
  @ApiCreatedResponse({ description: 'The draft was created' })
  @ApiBadRequestResponse({ description: 'The scope and company do not agree' })
  @ApiNotFoundResponse({ description: 'No such company' })
  create(
    @CurrentStaff() actor: StaffContext,
    @Body() body: CreateRuleSetDto,
  ): Promise<{ id: string }> {
    return this.management.createDraft(actor, body);
  }

  @Patch(':id')
  @RequirePermissions('investment_rule.manage')
  @ApiOperation({ summary: 'Rename a draft, or change its basis or notes' })
  @ApiOkResponse({ description: 'Updated' })
  @ApiConflictResponse({ description: 'Only a draft can be edited' })
  update(
    @CurrentStaff() actor: StaffContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateRuleSetDto,
  ): Promise<{ id: string }> {
    return this.management.updateDraft(actor, id, body);
  }

  /**
   * The whole ladder at once. A ladder is only valid as a set — contiguity is
   * a property of the set, not of any one tier — so it is replaced whole.
   */
  @Patch(':id/ladder')
  @RequirePermissions('investment_rule.manage')
  @ApiOperation({ summary: "Replace a draft's tiers" })
  @ApiOkResponse({ description: 'How many tiers the draft now has' })
  @ApiBadRequestResponse({ description: 'The ladder has gaps, overlaps or rates above the cap' })
  @ApiConflictResponse({ description: 'Only a draft can be edited' })
  replaceLadder(
    @CurrentStaff() actor: StaffContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: ReplaceLadderDto,
  ): Promise<{ id: string; tierCount: number }> {
    return this.management.replaceLadder(actor, id, body);
  }

  /**
   * Publishing. Archives whatever it replaces, in the same transaction.
   *
   * Asks for the administrator's own password when step-up is switched on,
   * which it is by default. A refused attempt is recorded as a security event
   * even though nothing changed.
   */
  @Post(':id/publish')
  @RequirePermissions('investment_rule.manage')
  @ApiOperation({ summary: 'Publish a draft and stand down the one it replaces' })
  @ApiOkResponse({ description: 'The version now live' })
  @ApiUnauthorizedResponse({ description: 'Password confirmation missing or incorrect' })
  @ApiBadRequestResponse({ description: 'The draft is empty, or its ladder is no longer valid' })
  @ApiConflictResponse({ description: 'Only a draft can be published' })
  publish(
    @CurrentStaff() actor: StaffContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: PublishRuleSetDto,
  ): Promise<{ id: string; version: number }> {
    return this.management.publish(actor, id, body);
  }

  /** Leaves nothing live for that scope, so it is its own deliberate act. */
  @Post(':id/archive')
  @RequirePermissions('investment_rule.manage')
  @ApiOperation({ summary: 'Take the live ladder out of service' })
  @ApiOkResponse({ description: 'Archived' })
  @ApiConflictResponse({ description: 'Only the live ladder can be archived' })
  archive(
    @CurrentStaff() actor: StaffContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: ArchiveRuleSetDto,
  ): Promise<{ id: string }> {
    return this.management.archive(actor, id, body);
  }

  /**
   * Drafts only. An archived rule set is the record of what investors were
   * sold and is never deleted — the policy refuses it, not this comment.
   */
  @Delete(':id')
  @RequirePermissions('investment_rule.manage')
  @ApiOperation({ summary: 'Discard a draft' })
  @ApiOkResponse({ description: 'Deleted' })
  @ApiConflictResponse({ description: 'Only a draft can be deleted' })
  remove(
    @CurrentStaff() actor: StaffContext,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ id: string }> {
    return this.management.deleteDraft(actor, id);
  }
}
