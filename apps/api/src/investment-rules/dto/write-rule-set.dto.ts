import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  INVESTMENT_MODES,
  PAYOUT_FREQUENCIES,
  ROI_BASES,
  RULE_SET_SCOPES,
  type InvestmentMode,
  type PayoutFrequency,
  type RoiBasis,
  type RuleSetScope,
} from '@afaq/types';

/** Turns "" into null, so an emptied form field clears the column. */
const emptyToNull = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' && value.trim() === '' ? null : value;

/** Trims, and leaves anything that is not a string for the validators to reject. */
const trimmed = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

/** The largest amount a tier boundary may take: Decimal(18,2) in the schema. */
const MAX_AMOUNT = 9_999_999_999_999;

/** Two years is the longest term in use; ten is room to change the business. */
const MAX_TERM_MONTHS = 120;

const MAX_NOTICE_DAYS = 365;

// ===========================================================================
// THE LADDER
// ===========================================================================

/** How one tier behaves in one mode. */
export class TierOptionDto {
  @ApiProperty({ enum: INVESTMENT_MODES })
  @IsIn(INVESTMENT_MODES)
  mode!: InvestmentMode;

  /**
   * Quoted over the rule set's basis, not its own. Two decimals, matching
   * Decimal(6,3) in the schema with room to spare.
   */
  @ApiProperty({ example: 4, minimum: 0.001, maximum: 999 })
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  @Max(999)
  roiPercent!: number;

  @ApiProperty({ enum: PAYOUT_FREQUENCIES })
  @IsIn(PAYOUT_FREQUENCIES)
  payoutFrequency!: PayoutFrequency;

  /** Null means open-ended — the normal shape of an unlocked option. */
  @ApiPropertyOptional({ nullable: true, minimum: 1, maximum: MAX_TERM_MONTHS })
  @IsInt()
  @Min(1)
  @Max(MAX_TERM_MONTHS)
  @IsOptional()
  minTermMonths?: number | null;

  @ApiPropertyOptional({ nullable: true, minimum: 1, maximum: MAX_TERM_MONTHS })
  @IsInt()
  @Min(1)
  @Max(MAX_TERM_MONTHS)
  @IsOptional()
  maxTermMonths?: number | null;

  @ApiProperty({ example: 90, minimum: 0, maximum: MAX_NOTICE_DAYS })
  @IsInt()
  @Min(0)
  @Max(MAX_NOTICE_DAYS)
  noticePeriodDays!: number;

  @ApiProperty({ default: false })
  @IsBoolean()
  earnsDuringNotice!: boolean;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  isEnabled?: boolean;
}

/**
 * One amount range.
 *
 * Written inclusively — 250,000 then 250,001 — the way people say them. The
 * shared validator insists the tiers are contiguous, and the engine matches on
 * the floors, so the line has no cracks in it.
 */
export class TierDto {
  @ApiProperty({ example: 'Tier 1' })
  @Transform(trimmed)
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name!: string;

  @ApiProperty({ example: 25_000, minimum: 0 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(MAX_AMOUNT)
  minAmount!: number;

  /** Null on the highest tier only, which must be open-ended. */
  @ApiPropertyOptional({ nullable: true, example: 250_000 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(MAX_AMOUNT)
  @IsOptional()
  maxAmount?: number | null;

  @ApiProperty({ type: [TierOptionDto] })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(4)
  @ValidateNested({ each: true })
  @Type(() => TierOptionDto)
  options!: TierOptionDto[];
}

// ===========================================================================
// RULE SETS
// ===========================================================================

/**
 * Starting a new draft.
 *
 * `fromRuleSetId` copies an existing ladder to start from, which is how a
 * change to a live ladder is actually made: clone the live one, edit the
 * clone, publish it. The original is archived at that moment, not before.
 */
export class CreateRuleSetDto {
  @ApiProperty({ example: 'Ladder 2027' })
  @Transform(trimmed)
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @ApiProperty({ enum: RULE_SET_SCOPES, default: 'GLOBAL' })
  @IsIn(RULE_SET_SCOPES)
  scope!: RuleSetScope;

  /** Required when the scope is COMPANY, and refused when it is GLOBAL. */
  @ApiPropertyOptional({ nullable: true, format: 'uuid' })
  @Transform(emptyToNull)
  @IsUUID('4')
  @IsOptional()
  companyId?: string | null;

  @ApiProperty({ enum: ROI_BASES, default: 'MONTHLY' })
  @IsIn(ROI_BASES)
  roiBasis!: RoiBasis;

  @ApiPropertyOptional({ maxLength: 2000 })
  @Transform(emptyToNull)
  @IsString()
  @MaxLength(2000)
  @IsOptional()
  notes?: string | null;

  /** Copy this rule set's tiers into the new draft. */
  @ApiPropertyOptional({ format: 'uuid' })
  @Transform(emptyToNull)
  @IsUUID('4')
  @IsOptional()
  fromRuleSetId?: string | null;
}

/** Renaming a draft, or changing its basis or notes. Not its tiers. */
export class UpdateRuleSetDto {
  @ApiPropertyOptional()
  @Transform(trimmed)
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ enum: ROI_BASES })
  @IsIn(ROI_BASES)
  @IsOptional()
  roiBasis?: RoiBasis;

  @ApiPropertyOptional({ nullable: true, maxLength: 2000 })
  @Transform(emptyToNull)
  @IsString()
  @MaxLength(2000)
  @IsOptional()
  notes?: string | null;
}

/**
 * The whole ladder, replacing whatever the draft held.
 *
 * Replacing rather than patching individual tiers: a ladder is only ever
 * valid as a whole — contiguity is a property of the set, not of any one
 * tier — so accepting it whole is the only way the check means anything.
 */
export class ReplaceLadderDto {
  @ApiProperty({ type: [TierDto] })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => TierDto)
  tiers!: TierDto[];
}

/**
 * Publishing.
 *
 * The password is the administrator's own, re-entered. It is verified against
 * Supabase and never stored, logged or echoed back.
 */
export class PublishRuleSetDto {
  @ApiPropertyOptional({
    description: 'Your own password, when step-up authentication is switched on',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  @IsOptional()
  password?: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @Transform(emptyToNull)
  @IsString()
  @MaxLength(500)
  @IsOptional()
  reason?: string | null;
}

/** Taking the live ladder out of service. */
export class ArchiveRuleSetDto {
  @ApiPropertyOptional({ maxLength: 500 })
  @Transform(emptyToNull)
  @IsString()
  @MaxLength(500)
  @IsOptional()
  reason?: string | null;
}

// ===========================================================================
// SETTINGS
// ===========================================================================

export class UpdateInvestmentSettingsDto {
  @ApiPropertyOptional({ example: 'AED', minLength: 3, maxLength: 3 })
  @Transform(trimmed)
  @IsString()
  @MinLength(3)
  @MaxLength(3)
  @IsOptional()
  currency?: string;

  @ApiPropertyOptional({ example: 25_000, minimum: 0 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(MAX_AMOUNT)
  @IsOptional()
  minimumInvestment?: number;

  @ApiPropertyOptional({ example: 10, minimum: 0.001 })
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  @Max(999)
  @IsOptional()
  maxRoiPercent?: number;

  @ApiPropertyOptional({ enum: ROI_BASES })
  @IsIn(ROI_BASES)
  @IsOptional()
  maxRoiBasis?: RoiBasis;

  @ApiPropertyOptional({ example: 90, minimum: 0, maximum: MAX_NOTICE_DAYS })
  @IsInt()
  @Min(0)
  @Max(MAX_NOTICE_DAYS)
  @IsOptional()
  defaultNoticePeriodDays?: number;

  /**
   * Turning step-up off is itself a privileged change, so it is audited like
   * any other. It cannot be turned off as part of the same request that
   * publishes a ladder — that would defeat it entirely.
   */
  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  requireStepUpToPublish?: boolean;
}
