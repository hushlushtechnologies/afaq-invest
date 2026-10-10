import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { describe, expect, it } from 'vitest';
import {
  isPlausiblePhone,
  MAX_INVESTOR_REASON_LENGTH,
  MIN_INVESTOR_REASON_LENGTH,
} from '@afaq/types';
import { ListInvestorsDto } from './dto/list-investors.dto.js';
import {
  InviteInvestorDto,
  InvestorNoteDto,
  InvestorReasonDto,
  UpdateInvestorDto,
} from './dto/write-investor.dto.js';

/**
 * What the investor request bodies accept, run the way the API runs them.
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

const INVITE = { type: 'INDIVIDUAL', email: 'sara@example.com', displayName: 'Sara Ali' };

describe('inviting', () => {
  it('accepts the least it needs', () => {
    expect(check(InviteInvestorDto, INVITE).failed).toEqual([]);
  });

  it('stores one spelling of the email address', () => {
    const { dto } = check(InviteInvestorDto, { ...INVITE, email: '  Sara.Ali@Example.COM ' });
    expect(dto.email).toBe('sara.ali@example.com');
  });

  it('upper-cases the country and clears empty optional fields', () => {
    const { dto, failed } = check(InviteInvestorDto, {
      ...INVITE,
      countryOfResidence: ' ae ',
      phone: '   ',
    });

    expect(failed).toEqual([]);
    expect(dto.countryOfResidence).toBe('AE');
    expect(dto.phone).toBeNull();
  });

  it.each([
    ['type', { type: 'TRUST' }],
    ['email', { email: 'not-an-address' }],
    ['displayName', { displayName: 'S' }],
    ['phone', { phone: 'call me' }],
    ['countryOfResidence', { countryOfResidence: 'UAE' }],
    ['preferredLocale', { preferredLocale: 'fr' }],
  ])('refuses a bad %s', (field, change) => {
    expect(check(InviteInvestorDto, { ...INVITE, ...change }).failed).toEqual([field]);
  });

  /**
   * Status, source and the KYC columns are the platform's to set. A body that
   * tries to set them is refused outright rather than having them ignored.
   */
  it.each(['status', 'source', 'kycStatus', 'authUserId', 'number'])(
    'refuses an attempt to set %s',
    (field) => {
      expect(check(InviteInvestorDto, { ...INVITE, [field]: 'x' }).failed).toEqual([field]);
    },
  );
});

describe('editing', () => {
  /**
   * `@IsOptional()` lets null through as well as a missing field, and these
   * two are required columns — so a null must be a 400 naming the field, not
   * a 500 from the database.
   */
  it.each(['displayName', 'preferredLocale'])('refuses an explicit null for %s', (field) => {
    expect(check(UpdateInvestorDto, { [field]: null }).failed).toEqual([field]);
  });

  it('lets the optional contact details be cleared', () => {
    const { dto, failed } = check(UpdateInvestorDto, { phone: null, countryOfResidence: '' });
    expect(failed).toEqual([]);
    expect(dto.phone).toBeNull();
    expect(dto.countryOfResidence).toBeNull();
  });

  it.each(['email', 'type'])('does not change %s here', (field) => {
    expect(check(UpdateInvestorDto, { [field]: 'x' }).failed).toEqual([field]);
  });
});

describe('reasons', () => {
  it('requires one to suspend or close, within the shared limits', () => {
    expect(check(InvestorReasonDto, {}).failed).toEqual(['reason']);
    expect(
      check(InvestorReasonDto, { reason: 'x'.repeat(MIN_INVESTOR_REASON_LENGTH - 1) }).failed,
    ).toEqual(['reason']);
    expect(
      check(InvestorReasonDto, { reason: 'x'.repeat(MAX_INVESTOR_REASON_LENGTH + 1) }).failed,
    ).toEqual(['reason']);
    expect(check(InvestorReasonDto, { reason: 'Requested by the investor' }).failed).toEqual([]);
  });

  it('does not count spaces towards the minimum', () => {
    expect(check(InvestorReasonDto, { reason: '   ab   ' }).failed).toEqual(['reason']);
  });

  it('makes the note optional when reinstating', () => {
    expect(check(InvestorNoteDto, {}).failed).toEqual([]);
    expect(check(InvestorNoteDto, { reason: '' }).dto.reason).toBeNull();
  });
});

describe('the list query', () => {
  it('converts and bounds the paging', () => {
    expect(check(ListInvestorsDto, { page: '2', pageSize: '50' }).dto.pageSize).toBe(50);
    expect(check(ListInvestorsDto, { pageSize: '500' }).failed).toEqual(['pageSize']);
  });

  it('accepts EXPIRED as a standing to filter by, though it is never stored', () => {
    expect(check(ListInvestorsDto, { kycStanding: 'EXPIRED' }).failed).toEqual([]);
  });

  it('refuses a sort it does not offer', () => {
    expect(check(ListInvestorsDto, { sortField: 'email' }).failed).toEqual(['sortField']);
  });
});

describe('phone numbers', () => {
  it.each(['+971 50 123 4567', '050-123-4567', '(04) 123 4567', '+44 20 7946 0958'])(
    'keeps %s',
    (phone) => {
      expect(isPlausiblePhone(phone)).toBe(true);
    },
  );

  it.each(['12345', '+1234567890123456', 'sara@example.com', '+971 50 ABC 4567', '++971501234567'])(
    'refuses %s',
    (phone) => {
      expect(isPlausiblePhone(phone)).toBe(false);
    },
  );
});
