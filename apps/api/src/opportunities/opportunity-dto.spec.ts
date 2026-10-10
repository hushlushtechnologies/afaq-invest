import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { UpdateCompanyDto } from '../companies/dto/write-company.dto.js';
import {
  CreateOpportunityDto,
  OpportunityReasonDto,
  UpdateOpportunityDto,
} from './dto/write-opportunity.dto.js';

/**
 * What the request bodies accept, run the way the API runs them.
 *
 * The same options as the global ValidationPipe in main.ts — whitelist,
 * forbidNonWhitelisted, implicit conversion — so these behave as a real
 * request would rather than as the decorators look like they should.
 */
function check<T extends object>(cls: new () => T, body: Record<string, unknown>) {
  const dto = plainToInstance(cls, body, { enableImplicitConversion: true });
  const errors = validateSync(dto, { whitelist: true, forbidNonWhitelisted: true });

  return { dto, failed: errors.map((error) => error.property).sort() };
}

const VALID = {
  companyId: 'c0000000-0000-4000-8000-000000000001',
  title: 'Al Jaddaf Tower — Phase 2',
  targetAmount: 5_000_000,
};

describe('an explicit null for a required column', () => {
  /**
   * `@IsOptional()` skips validation for null as well as for a missing field,
   * so `{ "title": null }` used to pass every check and reach a NOT NULL
   * column — a 500 from the database instead of a 400 naming the field.
   */
  it.each(['companyId', 'title', 'targetAmount', 'isFeatured', 'displayOrder'])(
    'is refused for %s on an opportunity edit',
    (field) => {
      expect(check(UpdateOpportunityDto, { [field]: null }).failed).toEqual([field]);
    },
  );

  it('is still allowed where null means "clear it"', () => {
    const { failed, dto } = check(UpdateOpportunityDto, {
      summary: null,
      description: null,
      coverImageUrl: null,
      closesAt: null,
    });

    expect(failed).toEqual([]);
    expect(dto.closesAt).toBeNull();
  });

  it('leaves an absent field alone', () => {
    expect(check(UpdateOpportunityDto, {}).failed).toEqual([]);
  });

  /** The same bug, found in Phase 5's company edit while writing this one. */
  it.each(['name', 'sector'])('is refused for %s on a company edit', (field) => {
    expect(check(UpdateCompanyDto, { [field]: null }).failed).toEqual([field]);
  });

  it('still lets a company clear its optional fields', () => {
    expect(check(UpdateCompanyDto, { legalName: null, website: null }).failed).toEqual([]);
  });
});

describe('the closing date', () => {
  it('becomes a Date from an ISO string', () => {
    const { dto, failed } = check(CreateOpportunityDto, {
      ...VALID,
      closesAt: '2026-12-31T00:00:00.000Z',
    });

    expect(failed).toEqual([]);
    expect(dto.closesAt).toBeInstanceOf(Date);
  });

  it('clears on an empty string, the way an emptied form field arrives', () => {
    expect(check(UpdateOpportunityDto, { closesAt: '' }).dto.closesAt).toBeNull();
  });

  it('refuses something that is not a date, rather than storing Invalid Date', () => {
    expect(check(CreateOpportunityDto, { ...VALID, closesAt: 'next tuesday' }).failed).toEqual([
      'closesAt',
    ]);
  });
});

describe('the target', () => {
  it('accepts fils, and nothing finer', () => {
    expect(check(CreateOpportunityDto, { ...VALID, targetAmount: 5_000_000.25 }).failed).toEqual(
      [],
    );
    expect(check(CreateOpportunityDto, { ...VALID, targetAmount: 5_000_000.125 }).failed).toEqual([
      'targetAmount',
    ]);
  });

  it('refuses nothing, less than nothing, and four zeros too many', () => {
    for (const targetAmount of [0, -1, 1_000_000_000_000]) {
      expect(
        check(CreateOpportunityDto, { ...VALID, targetAmount }).failed,
        String(targetAmount),
      ).toEqual(['targetAmount']);
    }
  });
});

describe('the body as a whole', () => {
  /**
   * The status and the pinned rule set are never accepted in a body: the
   * status moves through its own audited routes, and the rule set is chosen
   * by the platform at opening.
   */
  it('refuses a status or a rule set smuggled into an edit', () => {
    expect(check(UpdateOpportunityDto, { status: 'OPEN' }).failed).toEqual(['status']);
    expect(check(UpdateOpportunityDto, { ruleSetId: 'r-1' }).failed).toEqual(['ruleSetId']);
    expect(check(UpdateOpportunityDto, { committedAmount: 0 }).failed).toEqual(['committedAmount']);
  });

  it('requires a real reason to suspend or cancel', () => {
    expect(check(OpportunityReasonDto, {}).failed).toEqual(['reason']);
    expect(check(OpportunityReasonDto, { reason: '  ' }).failed).toEqual(['reason']);
    expect(check(OpportunityReasonDto, { reason: 'Valuation under review' }).failed).toEqual([]);
  });
});
