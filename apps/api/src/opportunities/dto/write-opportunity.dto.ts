import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** Turns "" into null, so an emptied form field clears the column. */
const emptyToNull = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' && value.trim() === '' ? null : value;

/** Trims, and leaves anything that is not a string for the validators to reject. */
const trimmed = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

/**
 * An ISO date string becomes a Date; "" and null become null, which clears it.
 *
 * Anything else is left alone so @IsDate rejects it, rather than being turned
 * into an Invalid Date that slips past.
 */
const toDateOrNull = ({ value }: { value: unknown }): unknown => {
  if (value === null || value === '') return null;
  if (typeof value !== 'string') return value;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date;
};

/**
 * Optional, but never null.
 *
 * `@IsOptional()` skips validation for null as well as for a missing field,
 * so `{ "title": null }` would pass every check here and then be written into
 * a required column — Postgres refuses, and the caller gets a 500 instead of
 * a 400 that names the field. This skips only when the field is absent, so an
 * explicit null is validated, and refused.
 */
const presentOnly = ValidateIf((_object: object, value: unknown) => value !== undefined);

/**
 * The largest target accepted: one hundred billion, in platform units.
 *
 * Far above any real raise, and well inside what Decimal(18, 2) holds. It
 * exists so a typo of four extra zeros is refused rather than stored.
 */
const MAX_TARGET = 100_000_000_000;

/**
 * Creating an opportunity.
 *
 * Neither the slug, the status nor the pinned rule set appears here. The slug
 * is derived from the title by the API. The status moves through its own
 * audited endpoints. And the rule set is chosen by the platform at the moment
 * of opening — it is never typed in.
 */
export class CreateOpportunityDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  companyId!: string;

  @ApiProperty({ example: 'Al Jaddaf Tower — Phase 2' })
  @Transform(trimmed)
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  title!: string;

  @ApiPropertyOptional({ description: 'One or two lines for the marketplace card' })
  @Transform(emptyToNull)
  @IsString()
  @MaxLength(400)
  @IsOptional()
  summary?: string | null;

  @ApiPropertyOptional()
  @Transform(emptyToNull)
  @IsString()
  @MaxLength(8000)
  @IsOptional()
  description?: string | null;

  /** A Supabase Storage path, not a public URL — so not validated as one. */
  @ApiPropertyOptional({ description: 'Supabase Storage path' })
  @Transform(emptyToNull)
  @IsString()
  @MaxLength(500)
  @IsOptional()
  coverImageUrl?: string | null;

  /** In platform units, with at most two decimal places — the column's scale. */
  @ApiProperty({ example: 5_000_000 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2, allowNaN: false, allowInfinity: false })
  @IsPositive()
  @Max(MAX_TARGET)
  targetAmount!: number;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  @Transform(toDateOrNull)
  @IsDate()
  @IsOptional()
  closesAt?: Date | null;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  isFeatured?: boolean;

  @ApiPropertyOptional({ minimum: 0, default: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  displayOrder?: number;
}

/**
 * Editing an opportunity. Every field optional — the service refuses a request
 * that would change nothing rather than writing an empty audit entry.
 *
 * Written out rather than derived with PartialType so what an edit may touch
 * is visible in one place. What the service then allows depends on the
 * status: a draft may change anything here; an opened raise may change its
 * description and closing date, may raise its target but not lower it, and
 * may not change company at all.
 */
export class UpdateOpportunityDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsUUID('4')
  @presentOnly
  companyId?: string;

  @ApiPropertyOptional()
  @Transform(trimmed)
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  @presentOnly
  title?: string;

  @ApiPropertyOptional()
  @Transform(emptyToNull)
  @IsString()
  @MaxLength(400)
  @IsOptional()
  summary?: string | null;

  @ApiPropertyOptional()
  @Transform(emptyToNull)
  @IsString()
  @MaxLength(8000)
  @IsOptional()
  description?: string | null;

  @ApiPropertyOptional({ description: 'Supabase Storage path' })
  @Transform(emptyToNull)
  @IsString()
  @MaxLength(500)
  @IsOptional()
  coverImageUrl?: string | null;

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2, allowNaN: false, allowInfinity: false })
  @IsPositive()
  @Max(MAX_TARGET)
  @presentOnly
  targetAmount?: number;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  @Transform(toDateOrNull)
  @IsDate()
  @IsOptional()
  closesAt?: Date | null;

  @ApiPropertyOptional()
  @IsBoolean()
  @presentOnly
  isFeatured?: boolean;

  @ApiPropertyOptional({ minimum: 0 })
  @IsInt()
  @Min(0)
  @presentOnly
  displayOrder?: number;
}

/** Opening, resuming or closing: an optional note for the audit trail. */
export class OpportunityNoteDto {
  @ApiPropertyOptional({ maxLength: 500 })
  @Transform(emptyToNull)
  @IsString()
  @MaxLength(500)
  @IsOptional()
  reason?: string | null;
}

/**
 * Suspending or cancelling: the reason is required.
 *
 * Both take a raise away from investors who may be looking at it. Whoever
 * does that has to say why, and the trail has to hold it.
 */
export class OpportunityReasonDto {
  @ApiProperty({ minLength: 3, maxLength: 500 })
  @Transform(trimmed)
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason!: string;
}
