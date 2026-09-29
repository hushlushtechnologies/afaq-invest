import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { CompanyStatus, CompanyType, CompanyVerification } from '@afaq/types';
import type { PrismaTransactionClient } from '@afaq/database';
import type { StaffContext } from '../auth/staff-context.types.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  assertReorderIsComplete,
  assertStatusChange,
  assertVerifiable,
  assertVerificationChange,
  positionsFor,
  slugFromName,
  slugTaken,
} from './company-policy.js';
import type {
  ChangeCompanyStatusDto,
  ChangeCompanyVerificationDto,
  CreateCompanyDto,
  ReorderCompaniesDto,
  SetCompanyFeaturedDto,
  UpdateCompanyDto,
} from './dto/write-company.dto.js';

/** What the write side needs to know about a company before changing it. */
interface TargetCompany {
  id: string;
  slug: string;
  name: string;
  legalName: string | null;
  type: string;
  status: string;
  verification: string;
  sector: string;
  description: string | null;
  logoUrl: string | null;
  coverImageUrl: string | null;
  website: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  isFeatured: boolean;
  displayOrder: number;
}

const TARGET_SELECT = {
  id: true,
  slug: true,
  name: true,
  legalName: true,
  type: true,
  status: true,
  verification: true,
  sector: true,
  description: true,
  logoUrl: true,
  coverImageUrl: true,
  website: true,
  contactEmail: true,
  contactPhone: true,
  isFeatured: true,
  displayOrder: true,
} as const;

/**
 * What each status change is called in the audit trail.
 *
 * Spelled out rather than derived from the enum so the names read as acts, and
 * so renaming a status never silently renames history.
 */
const STATUS_ACTIONS: Record<CompanyStatus, string> = {
  ACTIVE: 'company.activated',
  INACTIVE: 'company.deactivated',
  SUSPENDED: 'company.suspended',
};

/**
 * Changing companies.
 *
 * Every change follows the same shape: load the company, ask company-policy
 * whether it is allowed, then apply it in one transaction together with its
 * audit entry. The transaction matters — a change without its audit record is
 * worse than no change at all, because the trail then lies by omission.
 */
@Injectable()
export class CompaniesManagementService {
  constructor(private readonly prisma: PrismaService) {}

  async create(actor: StaffContext, input: CreateCompanyDto): Promise<{ id: string }> {
    const slug = slugFromName(input.name);

    const clash = await this.prisma.db.company.findUnique({
      where: { slug },
      select: { id: true },
    });

    // Checked before inserting so the person gets a message about the name
    // rather than a database constraint error. The unique index is still the
    // thing that guarantees it under a race.
    if (clash) throw slugTaken(slug);

    const created = await this.prisma.db.$transaction(async (tx: PrismaTransactionClient) => {
      const company = await tx.company.create({
        data: {
          slug,
          name: input.name,
          legalName: input.legalName ?? null,
          type: input.type,
          status: 'ACTIVE',
          // An outside company starts unvetted; an Afaq company is exempt.
          verification: input.type === 'THIRD_PARTY' ? 'PENDING' : 'NOT_REQUIRED',
          sector: input.sector,
          description: input.description ?? null,
          logoUrl: input.logoUrl ?? null,
          coverImageUrl: input.coverImageUrl ?? null,
          website: input.website ?? null,
          contactEmail: input.contactEmail ?? null,
          contactPhone: input.contactPhone ?? null,
          isFeatured: input.isFeatured ?? false,
          displayOrder: input.displayOrder ?? 0,
          createdById: actor.staffUserId,
        },
        select: { id: true, slug: true, name: true, type: true, verification: true },
      });

      await tx.auditLog.create({
        data: {
          actorStaffUserId: actor.staffUserId,
          actorEmail: actor.email,
          category: 'COMPANY',
          action: 'company.created',
          targetType: 'Company',
          targetId: company.id,
          targetLabel: company.name,
          after: {
            slug: company.slug,
            name: company.name,
            type: company.type,
            verification: company.verification,
            sector: input.sector,
          },
        },
      });

      return company;
    });

    return { id: created.id };
  }

  /**
   * Editing a company's details.
   *
   * The slug is not recalculated when the name changes. Links people have saved
   * keep working, and the address stays the one they first saw.
   */
  async update(actor: StaffContext, id: string, input: UpdateCompanyDto): Promise<{ id: string }> {
    const target = await this.loadTarget(id);

    const changes: Record<string, string | null> = {};
    const before: Record<string, string | null> = {};

    for (const field of [
      'name',
      'legalName',
      'sector',
      'description',
      'logoUrl',
      'coverImageUrl',
      'website',
      'contactEmail',
      'contactPhone',
    ] as const) {
      const next = input[field];
      if (next === undefined) continue;

      const current = target[field];
      if (next === current) continue;

      changes[field] = next;
      before[field] = current;
    }

    if (Object.keys(changes).length === 0) {
      throw new BadRequestException({ reason: 'no_change', message: 'Nothing to change.' });
    }

    await this.prisma.db.$transaction(async (tx: PrismaTransactionClient) => {
      await tx.company.update({ where: { id }, data: changes });

      await tx.auditLog.create({
        data: {
          actorStaffUserId: actor.staffUserId,
          actorEmail: actor.email,
          category: 'COMPANY',
          action: 'company.updated',
          targetType: 'Company',
          targetId: target.id,
          targetLabel: target.name,
          before,
          after: changes,
          // The slug deliberately does not follow the name; worth recording so
          // nobody later reads the mismatch as a bug.
          ...(changes.name !== undefined ? { metadata: { slugUnchanged: target.slug } } : {}),
        },
      });
    });

    return { id };
  }

  /** Activating, deactivating or suspending. */
  async changeStatus(
    actor: StaffContext,
    id: string,
    input: ChangeCompanyStatusDto,
  ): Promise<{ id: string }> {
    const target = await this.loadTarget(id);

    assertStatusChange(target.status as CompanyStatus, input.status);

    await this.prisma.db.$transaction(async (tx: PrismaTransactionClient) => {
      await tx.company.update({ where: { id }, data: { status: input.status } });

      await tx.auditLog.create({
        data: {
          actorStaffUserId: actor.staffUserId,
          actorEmail: actor.email,
          category: 'COMPANY',
          // A verb, not the state: "company.activated" reads as something
          // somebody did, which is what an audit trail is for. "company.active"
          // would read as a fact about the company.
          action: STATUS_ACTIONS[input.status],
          targetType: 'Company',
          targetId: target.id,
          targetLabel: target.name,
          before: { status: target.status },
          after: { status: input.status },
          ...(input.reason ? { metadata: { reason: input.reason } } : {}),
        },
      });
    });

    return { id };
  }

  /**
   * Moving an outside company through vetting.
   *
   * Guarded by company.verify rather than company.edit, so whoever onboarded
   * the company is not also the one who certifies it.
   */
  async changeVerification(
    actor: StaffContext,
    id: string,
    input: ChangeCompanyVerificationDto,
  ): Promise<{ id: string }> {
    const target = await this.loadTarget(id);

    assertVerifiable(target.type as CompanyType);
    assertVerificationChange(target.verification as CompanyVerification, input.verification);

    await this.prisma.db.$transaction(async (tx: PrismaTransactionClient) => {
      await tx.company.update({ where: { id }, data: { verification: input.verification } });

      await tx.auditLog.create({
        data: {
          actorStaffUserId: actor.staffUserId,
          actorEmail: actor.email,
          category: 'COMPANY',
          action: 'company.verification_changed',
          targetType: 'Company',
          targetId: target.id,
          targetLabel: target.name,
          before: { verification: target.verification },
          after: { verification: input.verification },
          ...(input.reason ? { metadata: { reason: input.reason } } : {}),
        },
      });
    });

    return { id };
  }

  async setFeatured(
    actor: StaffContext,
    id: string,
    input: SetCompanyFeaturedDto,
  ): Promise<{ id: string }> {
    const target = await this.loadTarget(id);

    if (target.isFeatured === input.isFeatured) {
      throw new BadRequestException({
        reason: 'no_change',
        message: input.isFeatured
          ? 'That company is already featured.'
          : 'That company is not featured.',
      });
    }

    await this.prisma.db.$transaction(async (tx: PrismaTransactionClient) => {
      await tx.company.update({ where: { id }, data: { isFeatured: input.isFeatured } });

      await tx.auditLog.create({
        data: {
          actorStaffUserId: actor.staffUserId,
          actorEmail: actor.email,
          category: 'COMPANY',
          action: input.isFeatured ? 'company.featured' : 'company.unfeatured',
          targetType: 'Company',
          targetId: target.id,
          targetLabel: target.name,
          before: { isFeatured: target.isFeatured },
          after: { isFeatured: input.isFeatured },
        },
      });
    });

    return { id };
  }

  /**
   * Rewrites the marketplace order.
   *
   * Takes every company id, in the order wanted, and renumbers them all in one
   * transaction. Renumbering the whole list keeps the gaps even; doing it in one
   * transaction means the order is never briefly half-applied, which somebody
   * loading the marketplace mid-write would otherwise see.
   */
  async reorder(actor: StaffContext, input: ReorderCompaniesDto): Promise<{ updated: number }> {
    const known: Array<{ id: string }> = await this.prisma.db.company.findMany({
      select: { id: true },
    });

    assertReorderIsComplete(
      input.orderedIds,
      known.map((row) => row.id),
    );

    const positions = positionsFor(input.orderedIds);

    await this.prisma.db.$transaction(async (tx: PrismaTransactionClient) => {
      for (const position of positions) {
        await tx.company.update({
          where: { id: position.id },
          data: { displayOrder: position.displayOrder },
        });
      }

      await tx.auditLog.create({
        data: {
          actorStaffUserId: actor.staffUserId,
          actorEmail: actor.email,
          category: 'COMPANY',
          action: 'company.reordered',
          targetType: 'Company',
          // A reorder is about the list, not one company.
          targetId: null,
          targetLabel: `${positions.length} companies`,
          after: { order: input.orderedIds },
        },
      });
    });

    return { updated: positions.length };
  }

  private async loadTarget(id: string): Promise<TargetCompany> {
    const target: TargetCompany | null = await this.prisma.db.company.findUnique({
      where: { id },
      select: TARGET_SELECT,
    });

    if (!target) {
      throw new NotFoundException({
        reason: 'not_found',
        message: 'That company no longer exists.',
      });
    }

    return target;
  }
}
