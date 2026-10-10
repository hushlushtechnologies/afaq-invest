import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  INVESTOR_SORT_FIELDS,
  INVESTOR_SOURCES,
  INVESTOR_STATUSES,
  INVESTOR_TYPES,
  KYC_STANDINGS,
  RISK_RATINGS,
  type InvestorSortField,
  type InvestorSource,
  type InvestorStatus,
  type InvestorType,
  type KycStanding,
  type RiskRating,
  type SortDirection,
} from '@afaq/types';

/**
 * What the investor list accepts.
 *
 * Every field is validated and bounded, and the global ValidationPipe strips
 * anything not declared here — so a request cannot smuggle an extra filter
 * into the query.
 */
export class ListInvestorsDto {
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

  @ApiPropertyOptional({ description: 'Matches name, email, phone, or a reference like INV-42' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(120)
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ enum: INVESTOR_TYPES })
  @IsIn(INVESTOR_TYPES)
  @IsOptional()
  type?: InvestorType;

  @ApiPropertyOptional({ enum: INVESTOR_STATUSES })
  @IsIn(INVESTOR_STATUSES)
  @IsOptional()
  status?: InvestorStatus;

  /** EXPIRED included: it is worked out from the date, and the filter does the same. */
  @ApiPropertyOptional({ enum: KYC_STANDINGS })
  @IsIn(KYC_STANDINGS)
  @IsOptional()
  kycStanding?: KycStanding;

  @ApiPropertyOptional({ enum: RISK_RATINGS })
  @IsIn(RISK_RATINGS)
  @IsOptional()
  riskRating?: RiskRating;

  @ApiPropertyOptional({ enum: INVESTOR_SOURCES })
  @IsIn(INVESTOR_SOURCES)
  @IsOptional()
  source?: InvestorSource;

  @ApiPropertyOptional({ enum: INVESTOR_SORT_FIELDS, default: 'createdAt' })
  @IsIn(INVESTOR_SORT_FIELDS)
  @IsOptional()
  sortField?: InvestorSortField;

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsIn(['asc', 'desc'])
  @IsOptional()
  sortDirection?: SortDirection;
}
