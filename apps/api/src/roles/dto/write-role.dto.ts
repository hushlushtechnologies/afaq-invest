import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** Creating a custom role. */
export class CreateRoleDto {
  @ApiProperty({ example: 'Regional Auditor' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(2, { message: 'Give the role a name' })
  @MaxLength(64)
  name!: string;

  @ApiPropertyOptional({ example: 'Reviews records for the northern region' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(240)
  @IsOptional()
  description?: string;

  @ApiProperty({ example: ['investor.view', 'report.view'], type: [String] })
  @IsArray()
  @ArrayMinSize(1, { message: 'Choose at least one permission' })
  @ArrayMaxSize(200)
  @IsString({ each: true })
  @Type(() => String)
  permissionKeys!: string[];
}

/**
 * Changing a custom role.
 *
 * The key is absent deliberately: it is generated once from the first name
 * and never changes, so history that mentions it keeps making sense.
 */
export class UpdateRoleDto {
  @ApiPropertyOptional({ example: 'Regional Auditor' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(2, { message: 'Give the role a name' })
  @MaxLength(64)
  @IsOptional()
  name?: string;

  @ApiPropertyOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(240)
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @ArrayMinSize(1, { message: 'Choose at least one permission' })
  @ArrayMaxSize(200)
  @IsString({ each: true })
  @Type(() => String)
  @IsOptional()
  permissionKeys?: string[];
}
