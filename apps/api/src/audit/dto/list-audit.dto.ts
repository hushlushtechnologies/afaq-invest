import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { AUDIT_CATEGORIES, AUDIT_SORT_DIRECTIONS, AUTH_EVENT_TYPES } from '@afaq/types';

/** Paging shared by both trails. */
class PagedQuery {
  @ApiPropertyOptional({ default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ default: 25, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  // Capped: the audit trail is the one table that grows without limit, and an
  // unbounded page size is the easiest way to bring the API down by accident.
  @Max(100)
  @IsOptional()
  pageSize?: number;

  @ApiPropertyOptional({ description: 'ISO date; entries from this moment on' })
  @IsISO8601()
  @IsOptional()
  from?: string;

  @ApiPropertyOptional({ description: 'ISO date; inclusive of the whole day' })
  @IsISO8601()
  @IsOptional()
  to?: string;
}

export class ListAuditDto extends PagedQuery {
  @ApiPropertyOptional({ enum: AUDIT_CATEGORIES })
  @IsIn(AUDIT_CATEGORIES)
  @IsOptional()
  category?: (typeof AUDIT_CATEGORIES)[number];

  @ApiPropertyOptional({ example: 'staff.invited' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(64)
  @IsOptional()
  action?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  actorStaffUserId?: string;

  @ApiPropertyOptional({ example: 'StaffUser' })
  @IsString()
  @MaxLength(64)
  @IsOptional()
  targetType?: string;

  @ApiPropertyOptional()
  @IsString()
  @MaxLength(64)
  @IsOptional()
  targetId?: string;

  @ApiPropertyOptional({ description: "Matches the actor's email or the target's label" })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().slice(0, 120) : value))
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ enum: AUDIT_SORT_DIRECTIONS, default: 'desc' })
  @IsIn(AUDIT_SORT_DIRECTIONS)
  @IsOptional()
  sortDirection?: (typeof AUDIT_SORT_DIRECTIONS)[number];
}

export class ListAuthActivityDto extends PagedQuery {
  @ApiPropertyOptional({ enum: AUTH_EVENT_TYPES })
  @IsIn(AUTH_EVENT_TYPES)
  @IsOptional()
  event?: (typeof AUTH_EVENT_TYPES)[number];

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  staffUserId?: string;

  @ApiPropertyOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsString()
  @MaxLength(255)
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ description: 'Only attempts that did not succeed' })
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  @IsOptional()
  failuresOnly?: boolean;
}
