import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LOCALE_CODES } from '@afaq/types';

/**
 * Inviting a staff member.
 *
 * The email is lowercased here, once, so "Fatima@afaq.ae" and
 * "fatima@afaq.ae" cannot become two accounts.
 */
export class InviteStaffDto {
  @ApiProperty({ example: 'fatima@afaq.ae' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail({}, { message: 'Enter a valid email address' })
  @MaxLength(254)
  email!: string;

  @ApiProperty({ example: 'Fatima Hassan' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(2, { message: 'Enter their full name' })
  @MaxLength(120)
  fullName!: string;

  @ApiPropertyOptional({ example: 'Compliance Officer' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(120)
  @IsOptional()
  jobTitle?: string;

  @ApiProperty({ example: ['COMPLIANCE_OFFICER'], type: [String] })
  @IsArray()
  @ArrayMinSize(1, { message: 'Choose at least one role' })
  // A generous ceiling that still stops someone posting a thousand entries.
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(64, { each: true })
  @Type(() => String)
  roleKeys!: string[];

  @ApiPropertyOptional({ enum: LOCALE_CODES })
  @IsIn(LOCALE_CODES)
  @IsOptional()
  preferredLocale?: string;
}
