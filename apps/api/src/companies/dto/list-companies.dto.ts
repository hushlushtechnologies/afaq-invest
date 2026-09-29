import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  COMPANY_SORT_FIELDS,
  COMPANY_STATUSES,
  COMPANY_TYPES,
  COMPANY_VERIFICATIONS,
  type CompanySortField,
  type CompanyStatus,
  type CompanyType,
  type CompanyVerification,
  type SortDirection,
} from '@afaq/types';

/**
 * What the company list accepts.
 *
 * Every field is validated and bounded, and the global ValidationPipe strips
 * anything not declared here — so a request cannot smuggle an extra filter
 * into the query.
 */
export class ListCompaniesDto {
  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  /** Capped: an unbounded page size is a denial-of-service waiting to happen. */
  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 25 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  pageSize?: number;

  @ApiPropertyOptional({ description: 'Matches name, legal name or sector' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(120)
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ enum: COMPANY_TYPES })
  @IsIn(COMPANY_TYPES)
  @IsOptional()
  type?: CompanyType;

  @ApiPropertyOptional({ enum: COMPANY_STATUSES })
  @IsIn(COMPANY_STATUSES)
  @IsOptional()
  status?: CompanyStatus;

  @ApiPropertyOptional({ enum: COMPANY_VERIFICATIONS })
  @IsIn(COMPANY_VERIFICATIONS)
  @IsOptional()
  verification?: CompanyVerification;

  @ApiPropertyOptional({ description: 'Exact sector name' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(80)
  @IsOptional()
  sector?: string;

  /** Query strings carry "true", not true, so it is converted before validation. */
  @ApiPropertyOptional({ type: Boolean })
  @Transform(({ value }) => (typeof value === 'string' ? value === 'true' : value))
  @IsBoolean()
  @IsOptional()
  featuredOnly?: boolean;

  @ApiPropertyOptional({ enum: COMPANY_SORT_FIELDS, default: 'displayOrder' })
  @IsIn(COMPANY_SORT_FIELDS)
  @IsOptional()
  sortBy?: CompanySortField;

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'asc' })
  @IsIn(['asc', 'desc'])
  @IsOptional()
  sortDirection?: SortDirection;
}
