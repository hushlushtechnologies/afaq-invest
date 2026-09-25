import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  STAFF_SORT_FIELDS,
  STAFF_STATUSES,
  type SortDirection,
  type StaffSortField,
  type StaffStatus,
} from '@afaq/types';

/**
 * What the staff list accepts.
 *
 * Every field is validated and bounded. The global ValidationPipe rejects
 * anything not declared here, so a request cannot smuggle extra filters into
 * the query.
 */
export class ListStaffDto {
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

  @ApiPropertyOptional({ description: 'Matches name or email' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(120)
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ enum: STAFF_STATUSES })
  @IsIn(STAFF_STATUSES)
  @IsOptional()
  status?: StaffStatus;

  @ApiPropertyOptional({ description: 'Role key, e.g. FINANCE_MANAGER' })
  @IsString()
  @MaxLength(64)
  @IsOptional()
  role?: string;

  @ApiPropertyOptional({ enum: STAFF_SORT_FIELDS, default: 'createdAt' })
  @IsIn(STAFF_SORT_FIELDS)
  @IsOptional()
  sortBy?: StaffSortField;

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsIn(['asc', 'desc'])
  @IsOptional()
  sortDirection?: SortDirection;
}
