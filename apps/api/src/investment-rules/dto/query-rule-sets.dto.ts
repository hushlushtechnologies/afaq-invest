import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsNumber, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  INVESTMENT_MODES,
  RULE_SET_SCOPES,
  RULE_SET_STATUSES,
  type InvestmentMode,
  type RuleSetScope,
  type RuleSetStatus,
} from '@afaq/types';

/** Turns "" into undefined, so an empty query parameter is simply absent. */
const emptyToUndefined = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

/**
 * What the rule-set list accepts.
 *
 * The global ValidationPipe strips anything not declared here, so a request
 * cannot smuggle in an extra filter.
 */
export class ListRuleSetsDto {
  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 25 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  pageSize?: number;

  @ApiPropertyOptional({ enum: RULE_SET_SCOPES })
  @IsIn(RULE_SET_SCOPES)
  @IsOptional()
  scope?: RuleSetScope;

  @ApiPropertyOptional({ enum: RULE_SET_STATUSES })
  @IsIn(RULE_SET_STATUSES)
  @IsOptional()
  status?: RuleSetStatus;

  @ApiPropertyOptional({ format: 'uuid', description: 'Ladders written for one company' })
  @Transform(emptyToUndefined)
  @IsUUID('4')
  @IsOptional()
  companyId?: string;
}

/**
 * Asking what an amount would earn.
 *
 * The one endpoint every portal calls rather than working it out. Nothing
 * here is stored — it is a question, not a request to invest.
 */
export class ResolveTermsDto {
  @ApiProperty({ example: 500_000, minimum: 0 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  amount!: number;

  @ApiProperty({ enum: INVESTMENT_MODES })
  @IsIn(INVESTMENT_MODES)
  mode!: InvestmentMode;

  /**
   * Resolved against this company's own ladder when it has one, and against
   * the platform-wide ladder otherwise.
   */
  @ApiPropertyOptional({ format: 'uuid' })
  @Transform(emptyToUndefined)
  @IsUUID('4')
  @IsOptional()
  companyId?: string;

  /** Required for a locked option, and refused outside the tier's range. */
  @ApiPropertyOptional({ example: 12, minimum: 1, maximum: 120 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(120)
  @IsOptional()
  termMonths?: number;
}
