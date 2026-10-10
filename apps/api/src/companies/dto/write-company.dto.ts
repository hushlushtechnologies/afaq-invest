import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  IsUrl,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  COMPANY_STATUSES,
  COMPANY_TYPES,
  COMPANY_VERIFICATIONS,
  type CompanyStatus,
  type CompanyType,
  type CompanyVerification,
} from '@afaq/types';

/** Turns "" into null, so an emptied optional form field clears the column. */
const emptyToNull = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' && value.trim() === '' ? null : value;

/** Trims, and leaves anything that is not a string for the validators to reject. */
const trimmed = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

/**
 * Creating a company.
 *
 * Neither the slug nor the verification state appears here. The slug is
 * derived from the name by the API, once. Verification has its own endpoint
 * and permission, so editing text cannot certify a partner.
 */
export class CreateCompanyDto {
  @ApiProperty({ example: 'Afaq Al Manzil Properties' })
  @Transform(trimmed)
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name!: string;

  @ApiPropertyOptional({ example: 'Afaq Al Manzil Properties LLC' })
  @Transform(emptyToNull)
  @IsString()
  @MaxLength(200)
  @IsOptional()
  legalName?: string | null;

  @ApiProperty({ enum: COMPANY_TYPES })
  @IsIn(COMPANY_TYPES)
  type!: CompanyType;

  @ApiProperty({ example: 'Real Estate' })
  @Transform(trimmed)
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  sector!: string;

  @ApiPropertyOptional()
  @Transform(emptyToNull)
  @IsString()
  @MaxLength(4000)
  @IsOptional()
  description?: string | null;

  /** A Supabase Storage path, not a public URL. */
  @ApiPropertyOptional({ description: 'Supabase Storage path' })
  @Transform(emptyToNull)
  @IsString()
  @MaxLength(500)
  @IsOptional()
  logoUrl?: string | null;

  @ApiPropertyOptional({ description: 'Supabase Storage path' })
  @Transform(emptyToNull)
  @IsString()
  @MaxLength(500)
  @IsOptional()
  coverImageUrl?: string | null;

  @ApiPropertyOptional({ example: 'https://www.afaqalmanzilproperties.com/' })
  @Transform(emptyToNull)
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true, require_tld: true })
  @IsOptional()
  website?: string | null;

  @ApiPropertyOptional({ example: 'invest@example.com' })
  @Transform(emptyToNull)
  @IsEmail()
  @MaxLength(200)
  @IsOptional()
  contactEmail?: string | null;

  @ApiPropertyOptional({ example: '+971 4 000 0000' })
  @Transform(emptyToNull)
  @IsString()
  @MaxLength(40)
  @IsOptional()
  contactPhone?: string | null;

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
 * Editing a company. Every field is optional to submit; required DB fields
 * must nevertheless reject explicit null and empty strings.
 *
 * Type, status and verification are deliberately absent: each is managed by
 * its own endpoint and permissions.
 */
export class UpdateCompanyDto {
  @ApiPropertyOptional()
  @Transform(trimmed)
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  // IsOptional skips null as well as undefined; use ValidateIf instead.
  @ValidateIf((_object, value: unknown) => value !== undefined)
  name?: string;

  @ApiPropertyOptional()
  @Transform(emptyToNull)
  @IsString()
  @MaxLength(200)
  @IsOptional()
  legalName?: string | null;

  @ApiPropertyOptional()
  @Transform(trimmed)
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  @ValidateIf((_object, value: unknown) => value !== undefined)
  sector?: string;

  @ApiPropertyOptional()
  @Transform(emptyToNull)
  @IsString()
  @MaxLength(4000)
  @IsOptional()
  description?: string | null;

  @ApiPropertyOptional({ description: 'Supabase Storage path' })
  @Transform(emptyToNull)
  @IsString()
  @MaxLength(500)
  @IsOptional()
  logoUrl?: string | null;

  @ApiPropertyOptional({ description: 'Supabase Storage path' })
  @Transform(emptyToNull)
  @IsString()
  @MaxLength(500)
  @IsOptional()
  coverImageUrl?: string | null;

  @ApiPropertyOptional()
  @Transform(emptyToNull)
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true, require_tld: true })
  @IsOptional()
  website?: string | null;

  @ApiPropertyOptional()
  @Transform(emptyToNull)
  @IsEmail()
  @MaxLength(200)
  @IsOptional()
  contactEmail?: string | null;

  @ApiPropertyOptional()
  @Transform(emptyToNull)
  @IsString()
  @MaxLength(40)
  @IsOptional()
  contactPhone?: string | null;
}

/** Activating, deactivating or suspending a company. */
export class ChangeCompanyStatusDto {
  @ApiProperty({ enum: COMPANY_STATUSES })
  @IsIn(COMPANY_STATUSES)
  status!: CompanyStatus;

  /** Recorded in the audit entry. Worth having for a suspension. */
  @ApiPropertyOptional({ maxLength: 500 })
  @Transform(emptyToNull)
  @IsString()
  @MaxLength(500)
  @IsOptional()
  reason?: string | null;
}

/** Moving an outside company through vetting. */
export class ChangeCompanyVerificationDto {
  @ApiProperty({ enum: COMPANY_VERIFICATIONS })
  @IsIn(COMPANY_VERIFICATIONS)
  verification!: CompanyVerification;

  @ApiPropertyOptional({ maxLength: 500 })
  @Transform(emptyToNull)
  @IsString()
  @MaxLength(500)
  @IsOptional()
  reason?: string | null;
}

/** Promoting or demoting a company in the marketplace. */
export class SetCompanyFeaturedDto {
  @ApiProperty()
  @IsBoolean()
  isFeatured!: boolean;
}

/**
 * A new marketplace order. The full list of company IDs, not a partial one,
 * so an absent company cannot silently retain a conflicting old position.
 */
export class ReorderCompaniesDto {
  @ApiProperty({ type: [String], description: 'Every company id, in the order wanted' })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(500)
  @IsUUID('4', { each: true })
  orderedIds!: string[];
}
