import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateBy,
  ValidateIf,
  type ValidationOptions,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  INVESTOR_TYPES,
  isPlausiblePhone,
  LOCALE_CODES,
  MAX_INVESTOR_REASON_LENGTH,
  MIN_INVESTOR_REASON_LENGTH,
  normaliseEmail,
  type InvestorType,
} from '@afaq/types';

/** Trims, and leaves anything that is not a string for the validators to reject. */
const trimmed = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

/** Turns "" into null, so an emptied form field clears the column. */
const trimmedOrNull = ({ value }: { value: unknown }): unknown => {
  if (typeof value !== 'string') return value;
  const text = value.trim();
  return text === '' ? null : text;
};

/** "ae" and " AE " are both the UAE; "" clears it. */
const countryOrNull = ({ value }: { value: unknown }): unknown => {
  if (typeof value !== 'string') return value;
  const text = value.trim().toUpperCase();
  return text === '' ? null : text;
};

/**
 * Optional, but never null.
 *
 * `@IsOptional()` skips validation for null as well as for a missing field,
 * so `{ "displayName": null }` would pass every check and reach a NOT NULL
 * column — a 500 from the database instead of a 400 naming the field. This
 * skips only when the field is absent, so an explicit null is refused.
 */
const presentOnly = ValidateIf((_object: object, value: unknown) => value !== undefined);

/** Shared with the admin form through @afaq/types, so both refuse the same numbers. */
function IsPlausiblePhone(options?: ValidationOptions): PropertyDecorator {
  return ValidateBy(
    {
      name: 'isPlausiblePhone',
      validator: {
        validate: (value: unknown) => typeof value === 'string' && isPlausiblePhone(value),
        defaultMessage: () => 'Enter a phone number with 7 to 15 digits',
      },
    },
    options,
  );
}

const COUNTRY_CODE = /^[A-Z]{2}$/;

/**
 * Staff inviting somebody to invest.
 *
 * Only what is needed to reach them and to know what kind of check they will
 * go through. Everything else — date of birth, nationality, documents —
 * arrives through KYC, where it is checked, rather than being typed in here
 * where nobody checks it.
 */
export class InviteInvestorDto {
  @ApiProperty({ enum: INVESTOR_TYPES })
  @IsIn(INVESTOR_TYPES)
  type!: InvestorType;

  /** Lowercased here, once, so two spellings of one address cannot become two investors. */
  @ApiProperty({ example: 'sara.ali@example.com' })
  @Transform(({ value }) => (typeof value === 'string' ? normaliseEmail(value) : value))
  @IsEmail({}, { message: 'Enter a valid email address' })
  @MaxLength(254)
  email!: string;

  @ApiProperty({ example: 'Sara Ali', description: "The person's name, or the company's" })
  @Transform(trimmed)
  @IsString()
  @MinLength(2, { message: 'Enter their full name' })
  @MaxLength(160)
  displayName!: string;

  @ApiPropertyOptional({ example: '+971 50 123 4567', nullable: true })
  @Transform(trimmedOrNull)
  @IsString()
  @MaxLength(32)
  @IsPlausiblePhone()
  @IsOptional()
  phone?: string | null;

  @ApiPropertyOptional({ example: 'AE', description: 'ISO 3166-1 alpha-2', nullable: true })
  @Transform(countryOrNull)
  @IsString()
  @Matches(COUNTRY_CODE, { message: 'Choose a country' })
  @IsOptional()
  countryOfResidence?: string | null;

  @ApiPropertyOptional({ enum: LOCALE_CODES, default: 'en' })
  @IsIn(LOCALE_CODES)
  @IsOptional()
  preferredLocale?: string;
}

/**
 * Housekeeping on an account.
 *
 * Not the email: it is the sign-in identity and changes through its own
 * verified flow. Not the type: an individual does not become a company, a new
 * account is opened. And the name only until identity has been confirmed —
 * the service refuses it after that.
 */
export class UpdateInvestorDto {
  @ApiPropertyOptional()
  @Transform(trimmed)
  @presentOnly
  @IsString()
  @MinLength(2, { message: 'Enter their full name' })
  @MaxLength(160)
  displayName?: string;

  @ApiPropertyOptional({ nullable: true })
  @Transform(trimmedOrNull)
  @IsString()
  @MaxLength(32)
  @IsPlausiblePhone()
  @IsOptional()
  phone?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @Transform(countryOrNull)
  @IsString()
  @Matches(COUNTRY_CODE, { message: 'Choose a country' })
  @IsOptional()
  countryOfResidence?: string | null;

  @ApiPropertyOptional({ enum: LOCALE_CODES })
  @presentOnly
  @IsIn(LOCALE_CODES)
  preferredLocale?: string;
}

/**
 * Suspending or closing an account: the reason is required.
 *
 * Both take something away from a real person. Whoever does it has to say
 * why, and the audit trail keeps it.
 */
export class InvestorReasonDto {
  @ApiProperty({ minLength: MIN_INVESTOR_REASON_LENGTH, maxLength: MAX_INVESTOR_REASON_LENGTH })
  @Transform(trimmed)
  @IsString()
  @MinLength(MIN_INVESTOR_REASON_LENGTH)
  @MaxLength(MAX_INVESTOR_REASON_LENGTH)
  reason!: string;
}

/** Reinstating: a note is welcome but not required. */
export class InvestorNoteDto {
  @ApiPropertyOptional({ maxLength: MAX_INVESTOR_REASON_LENGTH, nullable: true })
  @Transform(trimmedOrNull)
  @IsString()
  @MaxLength(MAX_INVESTOR_REASON_LENGTH)
  @IsOptional()
  reason?: string | null;
}
