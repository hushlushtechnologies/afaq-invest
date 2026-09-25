import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LOCALE_CODES } from '@afaq/types';

/** Editing someone's details. Their email is not changeable: it is their identity. */
export class UpdateStaffDto {
  @ApiPropertyOptional({ example: 'Fatima Hassan' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(2, { message: 'Enter their full name' })
  @MaxLength(120)
  @IsOptional()
  fullName?: string;

  @ApiPropertyOptional({ example: 'Compliance Officer' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(120)
  @IsOptional()
  jobTitle?: string;

  @ApiPropertyOptional({ enum: LOCALE_CODES })
  @IsIn(LOCALE_CODES)
  @IsOptional()
  preferredLocale?: string;
}

/** Replacing someone's roles. The list sent is the list they end up with. */
export class UpdateStaffRolesDto {
  @ApiProperty({ example: ['FINANCE_OFFICER'], type: [String] })
  @IsArray()
  @ArrayMinSize(1, { message: 'Choose at least one role' })
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(64, { each: true })
  @Type(() => String)
  roleKeys!: string[];
}

/** Suspending, disabling or reactivating someone. */
export class UpdateStaffStatusDto {
  @ApiProperty({ enum: ['ACTIVE', 'SUSPENDED', 'DISABLED'] })
  @IsIn(['ACTIVE', 'SUSPENDED', 'DISABLED'])
  status!: 'ACTIVE' | 'SUSPENDED' | 'DISABLED';

  @ApiPropertyOptional({ description: 'Recorded in the audit trail' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(500)
  @IsOptional()
  reason?: string;
}
