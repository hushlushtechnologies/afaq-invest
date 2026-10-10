import { describe, expect, it } from 'vitest';
import {
  addMonths,
  ageOn,
  availableKycMoves,
  canKycTransition,
  COMPLIANCE_DEFAULTS,
  emptyKycDetails,
  formatEmiratesId,
  identityExpiries,
  investorEligibility,
  isEmiratesIdFormat,
  KYC_ISSUE_CODES,
  KYC_MOVE_PERMISSIONS,
  KYC_MOVES,
  KYC_SUBMISSION_STATUSES,
  kycExpiry,
  kycIsEditable,
  kycRenewalInProgress,
  kycSeparationConflict,
  kycStanding,
  kycUploadRefusal,
  maskIdNumber,
  missingDocuments,
  PERMISSIONS,
  requiredDocuments,
  standingOf,
  submissionIssues,
  SYSTEM_ROLES,
  validateKycDetails,
  verificationIssues,
  type CorporateKycDetails,
  type IndividualKycDetails,
  type KycDocumentFacts,
  type KycIssue,
  type KycMove,
  type KycParty,
} from '@afaq/types';

/**
 * The identity-check rules. Pure functions only — no database — because these
 * are the rules two portals and the API all apply, and a disagreement between
 * them is a compliance failure, not a display bug.
 */

/** 08:00 UAE time on 1 June 2026. */
const NOW = new Date('2026-06-01T04:00:00.000Z');
const CONTEXT = { now: NOW, minimumAge: 18 };

function resident(overrides: Partial<IndividualKycDetails> = {}): IndividualKycDetails {
  return {
    type: 'INDIVIDUAL',
    fullName: 'Sara Ali',
    dateOfBirth: '1990-04-15',
    nationality: 'AE',
    countryOfResidence: 'AE',
    identities: [
      {
        idType: 'EMIRATES_ID',
        idNumber: '784-1990-1234567-1',
        issuingCountry: 'AE',
        expiryDate: '2028-04-15',
      },
      { idType: 'PASSPORT', idNumber: 'A1234567', issuingCountry: 'AE', expiryDate: '2030-01-01' },
    ],
    address: {
      line1: 'Villa 12, Street 4',
      line2: null,
      city: 'Dubai',
      region: 'Dubai',
      postalCode: null,
      country: 'AE',
    },
    occupation: 'Engineer',
    employer: null,
    sourceOfFunds: 'SALARY',
    sourceOfFundsDetail: null,
    isPep: false,
    pepDetail: null,
    ...overrides,
  };
}

function party(overrides: Partial<KycParty> = {}): KycParty {
  return {
    key: 'p1',
    roles: ['AUTHORISED_SIGNATORY', 'BENEFICIAL_OWNER'],
    fullName: 'Omar Khalid',
    dateOfBirth: '1980-01-01',
    nationality: 'AE',
    ownershipPercent: 60,
    identity: {
      idType: 'PASSPORT',
      idNumber: 'B7654321',
      issuingCountry: 'AE',
      expiryDate: '2029-01-01',
    },
    isPep: false,
    ...overrides,
  };
}

function company(overrides: Partial<CorporateKycDetails> = {}): CorporateKycDetails {
  return {
    type: 'CORPORATE',
    legalName: 'Gulf Holdings LLC',
    tradeLicenceNumber: 'DED-123456',
    licenceAuthority: 'Dubai DET',
    licenceExpiry: '2027-03-01',
    countryOfIncorporation: 'AE',
    registeredAddress: {
      line1: 'Office 501, Tower A',
      line2: null,
      city: 'Dubai',
      region: 'Dubai',
      postalCode: null,
      country: 'AE',
    },
    businessActivity: 'General trading',
    sourceOfFunds: 'BUSINESS_INCOME',
    sourceOfFundsDetail: null,
    parties: [party()],
    ...overrides,
  };
}

function doc(
  kind: KycDocumentFacts['kind'],
  overrides: Partial<KycDocumentFacts> = {},
): KycDocumentFacts {
  return { kind, partyKey: null, status: 'PENDING', removed: false, ...overrides };
}

const codes = (issues: KycIssue[]): string[] => issues.map((issue) => issue.code);

/* -------------------------------------------------------------------------- */

describe('review steps', () => {
  const MOVES = Object.keys(KYC_MOVES) as KycMove[];

  it('every step is a transition the status table allows', () => {
    for (const move of MOVES) {
      const { from, to } = KYC_MOVES[move];
      for (const source of from) expect(canKycTransition(source, to), move).toBe(true);
    }
  });

  it('approved and rejected are final', () => {
    for (const status of ['APPROVED', 'REJECTED'] as const) {
      expect(availableKycMoves(status)).toEqual([]);
      for (const next of KYC_SUBMISSION_STATUSES)
        expect(canKycTransition(status, next)).toBe(false);
    }
  });

  it.each([
    ['DRAFT', ['submit']],
    ['SUBMITTED', ['verify', 'requestChanges', 'reject']],
    ['VERIFIED', ['approve', 'requestChanges', 'reject']],
    ['CHANGES_REQUESTED', ['submit']],
  ] as const)('%s offers %j', (status, moves) => {
    expect(availableKycMoves(status)).toEqual(moves);
  });

  it('nothing is approved without first being verified', () => {
    expect(canKycTransition('SUBMITTED', 'APPROVED')).toBe(false);
    expect(KYC_MOVES.approve.from).toEqual(['VERIFIED']);
  });

  it('only a draft or a returned case can be edited', () => {
    expect(KYC_SUBMISSION_STATUSES.filter(kycIsEditable)).toEqual(['DRAFT', 'CHANGES_REQUESTED']);
  });
});

describe('who may take each step', () => {
  const KEYS = new Set<string>(PERMISSIONS.map((permission) => permission.key));
  const role = (key: string) => SYSTEM_ROLES.find((candidate) => candidate.key === key)!;

  it('every step names a real permission', () => {
    for (const permission of Object.values(KYC_MOVE_PERMISSIONS)) {
      expect(KEYS.has(permission), permission).toBe(true);
    }
  });

  /**
   * The roles already encode the two-person split: an officer can check but
   * not decide. If a role change ever let officers approve, the separation
   * check below would be the only thing left between one person and an
   * approval they verified themselves.
   */
  it('a compliance officer can verify but not approve or reject', () => {
    const officer = role('COMPLIANCE_OFFICER').permissions as readonly string[];
    expect(officer).toContain(KYC_MOVE_PERMISSIONS.verify);
    expect(officer).not.toContain(KYC_MOVE_PERMISSIONS.approve);
    expect(officer).not.toContain(KYC_MOVE_PERMISSIONS.reject);
  });

  it('a compliance manager can decide', () => {
    const manager = role('COMPLIANCE_MANAGER').permissions as readonly string[];
    expect(manager).toContain(KYC_MOVE_PERMISSIONS.approve);
    expect(manager).toContain(KYC_MOVE_PERMISSIONS.reject);
  });
});

describe('two people', () => {
  const submission = { preparedByStaffIds: ['staff-prep'], verifiedById: 'staff-verifier' };

  it('whoever prepared a case for the investor may not verify it', () => {
    expect(kycSeparationConflict('verify', submission, 'staff-prep')).toBe('prepared_by_reviewer');
  });

  it('nor approve it', () => {
    expect(kycSeparationConflict('approve', submission, 'staff-prep')).toBe('prepared_by_reviewer');
  });

  it('whoever verified may not approve', () => {
    expect(kycSeparationConflict('approve', submission, 'staff-verifier')).toBe(
      'verifier_cannot_approve',
    );
  });

  it('a third person may approve', () => {
    expect(kycSeparationConflict('approve', submission, 'staff-other')).toBeNull();
  });

  it('anybody else may verify a case the investor prepared themselves', () => {
    expect(
      kycSeparationConflict('verify', { preparedByStaffIds: [], verifiedById: null }, 'staff-prep'),
    ).toBeNull();
  });

  /** The cautious outcomes stay open to the person who has just looked. */
  it.each(['reject', 'requestChanges'] as const)('%s is not restricted', (move) => {
    expect(kycSeparationConflict(move, submission, 'staff-verifier')).toBeNull();
    expect(kycSeparationConflict(move, submission, 'staff-prep')).toBeNull();
  });
});

describe('calendar months', () => {
  it('clamps to the end of a shorter month', () => {
    expect(addMonths(new Date('2026-01-31T10:00:00Z'), 1).toISOString()).toBe(
      '2026-02-28T10:00:00.000Z',
    );
    expect(addMonths(new Date('2028-01-31T10:00:00Z'), 1).toISOString()).toBe(
      '2028-02-29T10:00:00.000Z',
    );
  });

  it('crosses years', () => {
    expect(addMonths(new Date('2026-11-15T00:00:00Z'), 36).toISOString()).toBe(
      '2029-11-15T00:00:00.000Z',
    );
  });
});

describe('when an approval expires', () => {
  const approvedAt = new Date('2026-06-01T08:00:00Z');

  it('at the review date for the risk rating', () => {
    const at = (riskRating: 'LOW' | 'MEDIUM' | 'HIGH') =>
      kycExpiry({
        approvedAt,
        riskRating,
        reviewMonths: COMPLIANCE_DEFAULTS.reviewMonths,
        documentExpiries: ['2040-01-01'],
      }).toISOString();

    expect(at('LOW')).toBe('2029-06-01T08:00:00.000Z');
    expect(at('MEDIUM')).toBe('2028-06-01T08:00:00.000Z');
    expect(at('HIGH')).toBe('2027-06-01T08:00:00.000Z');
  });

  it('earlier, at the end of the day the first document runs out (UAE time)', () => {
    const expiry = kycExpiry({
      approvedAt,
      riskRating: 'LOW',
      reviewMonths: COMPLIANCE_DEFAULTS.reviewMonths,
      documentExpiries: ['2030-01-01', '2027-02-10'],
    });
    expect(expiry.toISOString()).toBe('2027-02-10T19:59:59.999Z');
  });

  it('reads the expiries straight from the details', () => {
    expect(identityExpiries(resident())).toEqual(['2028-04-15', '2030-01-01']);
    expect(identityExpiries(company())).toEqual(['2027-03-01', '2029-01-01']);
  });
});

describe('standing', () => {
  it('projects each submission status', () => {
    expect(KYC_SUBMISSION_STATUSES.map(standingOf)).toEqual([
      'IN_PROGRESS',
      'PENDING_REVIEW',
      'PENDING_REVIEW',
      'IN_PROGRESS',
      'APPROVED',
      'REJECTED',
    ]);
  });

  const FUTURE = '2027-01-01T00:00:00.000Z';
  const PAST = '2026-01-01T00:00:00.000Z';

  it('an approval in date is APPROVED', () => {
    expect(kycStanding({ kycStatus: 'APPROVED', kycExpiresAt: FUTURE }, NOW)).toBe('APPROVED');
  });

  it('a renewal in progress does not stop an approval still in date', () => {
    const investor = { kycStatus: 'PENDING_REVIEW' as const, kycExpiresAt: FUTURE };
    expect(kycStanding(investor, NOW)).toBe('APPROVED');
    expect(kycRenewalInProgress(investor, NOW)).toBe(true);
  });

  it('past its date it is EXPIRED, computed rather than stored', () => {
    expect(kycStanding({ kycStatus: 'APPROVED', kycExpiresAt: PAST }, NOW)).toBe('EXPIRED');
  });

  it('an expired approval with a renewal under way shows the renewal', () => {
    expect(kycStanding({ kycStatus: 'IN_PROGRESS', kycExpiresAt: PAST }, NOW)).toBe('IN_PROGRESS');
  });

  it('a rejection wins, even over an approval still in date', () => {
    expect(kycStanding({ kycStatus: 'REJECTED', kycExpiresAt: FUTURE }, NOW)).toBe('REJECTED');
  });

  it('never checked is NOT_STARTED', () => {
    expect(kycStanding({ kycStatus: 'NOT_STARTED', kycExpiresAt: null }, NOW)).toBe('NOT_STARTED');
  });
});

describe('may this investor invest', () => {
  const approved = { kycStatus: 'APPROVED' as const, kycExpiresAt: '2027-01-01T00:00:00Z' };

  it('yes, when active and approved', () => {
    expect(investorEligibility({ status: 'ACTIVE', ...approved }, NOW)).toEqual({ eligible: true });
  });

  it.each(['INVITED', 'SUSPENDED', 'CLOSED'] as const)('not while %s', (status) => {
    expect(investorEligibility({ status, ...approved }, NOW)).toEqual({
      eligible: false,
      reason: 'account_inactive',
    });
  });

  it('not once the approval has expired', () => {
    expect(
      investorEligibility(
        { status: 'ACTIVE', kycStatus: 'APPROVED', kycExpiresAt: '2026-01-01T00:00:00Z' },
        NOW,
      ),
    ).toEqual({ eligible: false, reason: 'kyc_expired' });
  });

  it('not before approval', () => {
    expect(
      investorEligibility(
        { status: 'ACTIVE', kycStatus: 'PENDING_REVIEW', kycExpiresAt: null },
        NOW,
      ),
    ).toEqual({ eligible: false, reason: 'kyc_not_approved' });
  });
});

describe('required documents', () => {
  it('a UAE resident: Emirates ID both sides and a passport', () => {
    expect(requiredDocuments(resident()).map((d) => d.kind)).toEqual([
      'EMIRATES_ID_FRONT',
      'EMIRATES_ID_BACK',
      'PASSPORT',
    ]);
  });

  it('somebody living abroad: a passport and proof of address', () => {
    expect(requiredDocuments(resident({ countryOfResidence: 'GB' })).map((d) => d.kind)).toEqual([
      'PASSPORT',
      'PROOF_OF_ADDRESS',
    ]);
  });

  it('a politically exposed person adds source of funds', () => {
    expect(requiredDocuments(resident({ isPep: true })).map((d) => d.kind)).toContain(
      'SOURCE_OF_FUNDS',
    );
  });

  it('a company: licence, memorandum, and an ID per person named', () => {
    const details = company({ parties: [party({ key: 'a' }), party({ key: 'b' })] });
    expect(requiredDocuments(details)).toEqual([
      { kind: 'TRADE_LICENCE', partyKey: null },
      { kind: 'MEMORANDUM_OF_ASSOCIATION', partyKey: null },
      { kind: 'PARTY_ID', partyKey: 'a' },
      { kind: 'PARTY_ID', partyKey: 'b' },
    ]);
  });

  it('a company with a politically exposed owner adds source of funds', () => {
    expect(
      requiredDocuments(company({ parties: [party({ isPep: true })] })).map((d) => d.kind),
    ).toContain('SOURCE_OF_FUNDS');
  });
});

describe('missing documents', () => {
  const all = [doc('EMIRATES_ID_FRONT'), doc('EMIRATES_ID_BACK'), doc('PASSPORT')];

  it('none when every required file is there', () => {
    expect(missingDocuments(resident(), all)).toEqual([]);
  });

  it('a rejected file counts as missing', () => {
    const issues = missingDocuments(resident(), [
      ...all.slice(0, 2),
      doc('PASSPORT', { status: 'REJECTED' }),
    ]);
    expect(issues.map((issue) => issue.values?.kind)).toEqual(['PASSPORT']);
  });

  it('a removed file counts as missing', () => {
    const issues = missingDocuments(resident(), [
      ...all.slice(0, 2),
      doc('PASSPORT', { removed: true }),
    ]);
    expect(issues.map((issue) => issue.values?.kind)).toEqual(['PASSPORT']);
  });

  it("a party's ID is matched to that party, not any party", () => {
    const details = company({ parties: [party({ key: 'a' }), party({ key: 'b' })] });
    const issues = missingDocuments(details, [
      doc('TRADE_LICENCE'),
      doc('MEMORANDUM_OF_ASSOCIATION'),
      doc('PARTY_ID', { partyKey: 'a' }),
    ]);
    expect(issues).toHaveLength(1);
    expect(issues[0]!.values).toEqual({ kind: 'PARTY_ID', partyKey: 'b' });
  });
});

describe('verifying', () => {
  const accepted = (kind: KycDocumentFacts['kind']) => doc(kind, { status: 'ACCEPTED' });

  it('needs every required document accepted, and a risk rating', () => {
    const issues = verificationIssues(
      resident(),
      [accepted('EMIRATES_ID_FRONT'), accepted('EMIRATES_ID_BACK'), doc('PASSPORT')],
      null,
    );
    expect(codes(issues)).toEqual(['document_not_accepted', 'no_risk_rating']);
  });

  it('passes when it has both', () => {
    expect(
      verificationIssues(
        resident(),
        [accepted('EMIRATES_ID_FRONT'), accepted('EMIRATES_ID_BACK'), accepted('PASSPORT')],
        'LOW',
      ),
    ).toEqual([]);
  });
});

describe('validating the details', () => {
  it('a complete resident has no issues', () => {
    expect(validateKycDetails(resident(), CONTEXT, { complete: true })).toEqual([]);
  });

  it('a complete company has no issues', () => {
    expect(validateKycDetails(company(), CONTEXT, { complete: true })).toEqual([]);
  });

  /** A blank draft is saved without a wall of errors about fields nobody reached. */
  it.each(['INDIVIDUAL', 'CORPORATE'] as const)('an empty %s draft saves cleanly', (type) => {
    expect(validateKycDetails(emptyKycDetails(type), CONTEXT, { complete: false })).toEqual([]);
  });

  it.each(['INDIVIDUAL', 'CORPORATE'] as const)('but cannot be submitted', (type) => {
    expect(
      validateKycDetails(emptyKycDetails(type), CONTEXT, { complete: true }).length,
    ).toBeGreaterThan(3);
  });

  it('a draft still has to be well-formed', () => {
    const issues = validateKycDetails(
      resident({ nationality: 'UAE', dateOfBirth: '1990-02-30' }),
      CONTEXT,
      { complete: false },
    );
    expect(codes(issues).sort()).toEqual(['invalid_country', 'invalid_date']);
  });

  describe('age, on the platform calendar', () => {
    // NOW is 1 June 2026 in Dubai.
    it('eighteen today is old enough', () => {
      expect(ageOn('2008-06-01', NOW)).toBe(18);
      expect(
        validateKycDetails(resident({ dateOfBirth: '2008-06-01' }), CONTEXT, { complete: true }),
      ).toEqual([]);
    });

    it('eighteen tomorrow is not', () => {
      expect(ageOn('2008-06-02', NOW)).toBe(17);
      const issues = validateKycDetails(resident({ dateOfBirth: '2008-06-02' }), CONTEXT, {
        complete: true,
      });
      expect(issues).toEqual([
        expect.objectContaining({ code: 'too_young', values: { minimumAge: 18 } }),
      ]);
    });

    it('follows the configured minimum', () => {
      expect(
        codes(validateKycDetails(resident(), { ...CONTEXT, minimumAge: 40 }, { complete: true })),
      ).toEqual(['too_young']);
    });

    it('a birth date in the future is refused', () => {
      expect(
        codes(
          validateKycDetails(resident({ dateOfBirth: '2030-01-01' }), CONTEXT, { complete: true }),
        ),
      ).toEqual(['date_in_future']);
    });
  });

  it('an expired identity document is refused', () => {
    const details = resident();
    details.identities[1] = { ...details.identities[1]!, expiryDate: '2026-05-31' };
    const issues = validateKycDetails(details, CONTEXT, { complete: true });
    expect(issues).toEqual([
      expect.objectContaining({ code: 'id_expired', field: 'identities.1.expiryDate' }),
    ]);
  });

  it('a document expiring today is still good today', () => {
    const details = resident();
    details.identities[1] = { ...details.identities[1]!, expiryDate: '2026-06-01' };
    expect(validateKycDetails(details, CONTEXT, { complete: true })).toEqual([]);
  });

  it('an Emirates ID must look like one', () => {
    const details = resident();
    details.identities[0] = { ...details.identities[0]!, idNumber: '123-4567' };
    expect(codes(validateKycDetails(details, CONTEXT, { complete: true }))).toEqual([
      'invalid_emirates_id',
    ]);
  });

  it('a UAE resident must give an Emirates ID, and everybody a passport', () => {
    const issues = validateKycDetails(resident({ identities: [] }), CONTEXT, { complete: true });
    expect(codes(issues).sort()).toEqual(['missing_emirates_id', 'missing_passport']);
  });

  it('the same kind of document is not listed twice', () => {
    const details = resident();
    details.identities.push({ ...details.identities[1]! });
    expect(codes(validateKycDetails(details, CONTEXT, { complete: true }))).toEqual([
      'duplicate_identity',
    ]);
  });

  it('a politically exposed person must say what role', () => {
    expect(
      codes(validateKycDetails(resident({ isPep: true }), CONTEXT, { complete: true })),
    ).toEqual(['required']);
  });

  describe('company owners', () => {
    it('three thirds add up to one hundred, not a fraction over', () => {
      const details = company({
        parties: [
          party({ key: 'a', ownershipPercent: 33.33 }),
          party({ key: 'b', ownershipPercent: 33.33 }),
          party({ key: 'c', ownershipPercent: 33.34 }),
        ],
      });
      expect(validateKycDetails(details, CONTEXT, { complete: true })).toEqual([]);
    });

    it('more than one hundred percent is refused', () => {
      const details = company({
        parties: [
          party({ key: 'a', ownershipPercent: 60 }),
          party({ key: 'b', ownershipPercent: 50 }),
        ],
      });
      expect(validateKycDetails(details, CONTEXT, { complete: true })).toEqual([
        expect.objectContaining({ code: 'ownership_over_total', values: { total: 110 } }),
      ]);
    });

    it('a share is a percentage', () => {
      expect(
        codes(
          validateKycDetails(company({ parties: [party({ ownershipPercent: 140 })] }), CONTEXT, {
            complete: true,
          }),
        ),
      ).toContain('ownership_out_of_range');
    });

    it('an owner must own something', () => {
      expect(
        codes(
          validateKycDetails(company({ parties: [party({ ownershipPercent: null })] }), CONTEXT, {
            complete: true,
          }),
        ),
      ).toEqual(['owner_without_share']);
    });

    it('needs somebody who signs and somebody who owns', () => {
      const signatoryOnly = company({
        parties: [party({ roles: ['AUTHORISED_SIGNATORY'], ownershipPercent: null })],
      });
      expect(codes(validateKycDetails(signatoryOnly, CONTEXT, { complete: true }))).toEqual([
        'no_beneficial_owner',
      ]);

      const ownerOnly = company({ parties: [party({ roles: ['BENEFICIAL_OWNER'] })] });
      expect(codes(validateKycDetails(ownerOnly, CONTEXT, { complete: true }))).toEqual([
        'no_signatory',
      ]);
    });

    it('an expired licence is refused', () => {
      expect(
        codes(
          validateKycDetails(company({ licenceExpiry: '2026-01-01' }), CONTEXT, { complete: true }),
        ),
      ).toEqual(['licence_expired']);
    });
  });

  it('submitting checks the details and the documents together', () => {
    expect(codes(submissionIssues(resident(), [], CONTEXT))).toEqual([
      'missing_document',
      'missing_document',
      'missing_document',
    ]);
  });
});

describe('every issue code can actually happen', () => {
  /**
   * The portals will need a sentence for each code. A code no rule can
   * produce would be a sentence nobody ever reads, and a missing one would be
   * an untranslated key — so the fixture below must reach all of them.
   */
  it('the fixtures reach every code', () => {
    const reached = new Set<string>();
    const collect = (issues: KycIssue[]) => issues.forEach((issue) => reached.add(issue.code));

    collect(validateKycDetails(emptyKycDetails('INDIVIDUAL'), CONTEXT, { complete: true }));
    collect(validateKycDetails(emptyKycDetails('CORPORATE'), CONTEXT, { complete: true }));
    collect(
      validateKycDetails(resident({ nationality: 'X', dateOfBirth: '1990-13-01' }), CONTEXT, {
        complete: true,
      }),
    );
    collect(
      validateKycDetails(resident({ dateOfBirth: '2020-01-01' }), CONTEXT, { complete: true }),
    );
    collect(
      validateKycDetails(resident({ dateOfBirth: '2030-01-01' }), CONTEXT, { complete: true }),
    );

    const expired = resident();
    expired.identities[0] = { ...expired.identities[0]!, idNumber: '1', expiryDate: '2020-01-01' };
    expired.identities.push({ ...expired.identities[1]! });
    collect(validateKycDetails(expired, CONTEXT, { complete: true }));

    collect(
      validateKycDetails(
        company({
          licenceExpiry: '2020-01-01',
          parties: [
            party({ key: 'a', roles: ['BENEFICIAL_OWNER'], ownershipPercent: 150 }),
            party({ key: 'b', roles: ['BENEFICIAL_OWNER'], ownershipPercent: 60 }),
            party({ key: 'c', roles: ['BENEFICIAL_OWNER'], ownershipPercent: null }),
            party({ key: 'd', roles: ['BENEFICIAL_OWNER'], ownershipPercent: 50 }),
          ],
        }),
        CONTEXT,
        { complete: true },
      ),
    );
    collect(
      validateKycDetails(
        company({ parties: [party({ roles: ['AUTHORISED_SIGNATORY'], ownershipPercent: null })] }),
        CONTEXT,
        { complete: true },
      ),
    );

    collect(validateKycDetails(resident({ identities: [] }), CONTEXT, { complete: true }));
    collect(missingDocuments(resident(), []));
    collect(verificationIssues(resident(), [], null));

    expect([...reached].sort()).toEqual([...KYC_ISSUE_CODES].sort());
  });
});

describe('uploads', () => {
  const MAX = COMPLIANCE_DEFAULTS.maxDocumentBytes;

  it('takes PDFs and photos up to the limit', () => {
    for (const mimeType of ['application/pdf', 'image/jpeg', 'image/png']) {
      expect(kycUploadRefusal({ mimeType, sizeBytes: MAX }, MAX), mimeType).toBeNull();
    }
  });

  it('refuses anything else', () => {
    expect(kycUploadRefusal({ mimeType: 'application/pdf', sizeBytes: 0 }, MAX)).toBe('empty');
    expect(kycUploadRefusal({ mimeType: 'application/pdf', sizeBytes: MAX + 1 }, MAX)).toBe(
      'too_large',
    );
    for (const mimeType of ['text/html', 'image/svg+xml', 'application/x-msdownload', '']) {
      expect(kycUploadRefusal({ mimeType, sizeBytes: 100 }, MAX), mimeType).toBe(
        'unsupported_type',
      );
    }
  });
});

describe('identity numbers on screen', () => {
  it('shows only the last four characters', () => {
    expect(maskIdNumber('784-1990-1234567-1')).toBe('•••• 5671');
    expect(maskIdNumber('A1234567')).toBe('•••• 4567');
    expect(maskIdNumber('123')).toBe('••••');
  });

  it('formats an Emirates ID the way the card prints it', () => {
    expect(formatEmiratesId('784199012345671')).toBe('784-1990-1234567-1');
    expect(isEmiratesIdFormat('784 1990 1234567 1')).toBe(true);
    expect(isEmiratesIdFormat('785199012345671')).toBe(false);
    expect(isEmiratesIdFormat('78419901234567')).toBe(false);
  });
});
