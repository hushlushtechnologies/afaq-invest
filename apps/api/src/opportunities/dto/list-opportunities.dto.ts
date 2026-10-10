import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  COMPANY_TYPES,
  OPPORTUNITY_SORT_FIELDS,
  OPPORTUNITY_STATUSES,
  type CompanyType,
  type OpportunitySortField,
  type OpportunityStatus,
  type SortDirection,
} from '@afaq/types';

/**
 * What the opportunity list accepts.
 *
 * Every field is validated and bounded, and the global ValidationPipe strips
 * anything not declared here — so a request cannot smuggle an extra filter
 * into the query.
 */
export class ListOpportunitiesDto {
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

  @ApiPropertyOptional({ description: 'Matches the title or the company name' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(120)
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ enum: OPPORTUNITY_STATUSES })
  @IsIn(OPPORTUNITY_STATUSES)
  @IsOptional()
  status?: OpportunityStatus;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsUUID('4')
  @IsOptional()
  companyId?: string;

  @ApiPropertyOptional({ description: "Exact sector name, from the company's sector" })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(80)
  @IsOptional()
  sector?: string;

  @ApiPropertyOptional({ enum: COMPANY_TYPES })
  @IsIn(COMPANY_TYPES)
  @IsOptional()
  companyType?: CompanyType;

  /** OPEN and SUSPENDED only. Query strings carry "true", so it is converted. */
  @ApiPropertyOptional({ type: Boolean })
  @Transform(({ value }) => (typeof value === 'string' ? value === 'true' : value))
  @IsBoolean()
  @IsOptional()
  liveOnly?: boolean;

  @ApiPropertyOptional({ enum: OPPORTUNITY_SORT_FIELDS, default: 'displayOrder' })
  @IsIn(OPPORTUNITY_SORT_FIELDS)
  @IsOptional()
  sortField?: OpportunitySortField;

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'asc' })
  @IsIn(['asc', 'desc'])
  @IsOptional()
  sortDirection?: SortDirection;
}
