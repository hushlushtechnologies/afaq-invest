import { Injectable } from '@nestjs/common';
import type { AuditLogListItem, AuthActivityListItem, Paginated } from '@afaq/types';
import { PrismaService } from '../prisma/prisma.service.js';
import type { ListAuditDto, ListAuthActivityDto } from './dto/list-audit.dto.js';

const DEFAULT_PAGE_SIZE = 25;

/**
 * Reading the two trails.
 *
 * Read-only by design: there is no endpoint that edits or deletes an entry,
 * and there is not meant to be one. A record that the people being recorded
 * can rewrite answers nothing.
 */
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListAuditDto): Promise<Paginated<AuditLogListItem>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;

    const where = {
      ...(query.category ? { category: query.category } : {}),
      ...(query.action ? { action: query.action } : {}),
      ...(query.actorStaffUserId ? { actorStaffUserId: query.actorStaffUserId } : {}),
      ...(query.targetType ? { targetType: query.targetType } : {}),
      ...(query.targetId ? { targetId: query.targetId } : {}),
      ...buildDateRange(query.from, query.to),
      ...(query.search
        ? {
            OR: [
              { actorEmail: { contains: query.search, mode: 'insensitive' as const } },
              { targetLabel: { contains: query.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    // Count and page in one round trip: two separate calls can disagree while
    // entries are being written, which they constantly are here.
    const [total, rows] = await this.prisma.db.$transaction([
      this.prisma.db.auditLog.count({ where }),
      this.prisma.db.auditLog.findMany({
        where,
        // Newest first by default: the question is almost always "what just
        // happened?" rather than "what happened first?".
        orderBy: { occurredAt: query.sortDirection ?? 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          occurredAt: true,
          actorStaffUserId: true,
          actorEmail: true,
          category: true,
          action: true,
          targetType: true,
          targetId: true,
          targetLabel: true,
          before: true,
          after: true,
          metadata: true,
          ipAddress: true,
          // userAgent is deliberately not selected: it is long, noisy and of
          // no use in a list. Sign-in activity carries a readable device label.
        },
      }),
    ]);

    return {
      items: rows.map(toAuditItem),
      total,
      page,
      pageSize,
    };
  }

  async listAuthActivity(query: ListAuthActivityDto): Promise<Paginated<AuthActivityListItem>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;

    const where = {
      ...(query.event ? { event: query.event } : {}),
      ...(query.staffUserId ? { staffUserId: query.staffUserId } : {}),
      ...(query.email ? { email: query.email } : {}),
      ...(query.failuresOnly ? { succeeded: false } : {}),
      ...buildDateRange(query.from, query.to),
    };

    const [total, rows] = await this.prisma.db.$transaction([
      this.prisma.db.authActivity.count({ where }),
      this.prisma.db.authActivity.findMany({
        where,
        orderBy: { occurredAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          occurredAt: true,
          staffUserId: true,
          email: true,
          event: true,
          succeeded: true,
          failureReason: true,
          ipAddress: true,
          deviceLabel: true,
        },
      }),
    ]);

    return {
      items: rows.map(toActivityItem),
      total,
      page,
      pageSize,
    };
  }

  /**
   * Everything that ever happened to one thing.
   *
   * The question behind a staff member's history — "who gave them that role,
   * and when?" — needs the target, not the actor, so it is its own path
   * rather than a filter somebody has to know to combine.
   */
  history(
    targetType: string,
    targetId: string,
    pageSize = DEFAULT_PAGE_SIZE,
  ): Promise<Paginated<AuditLogListItem>> {
    return this.list({ targetType, targetId, pageSize });
  }
}

/**
 * Turns a from/to pair into a range.
 *
 * "to" is treated as the whole of that day: somebody asking for entries up to
 * the 5th means the 5th included, not everything before midnight on the 5th.
 */
function buildDateRange(from?: string, to?: string): { occurredAt?: { gte?: Date; lte?: Date } } {
  if (!from && !to) return {};

  const range: { gte?: Date; lte?: Date } = {};

  if (from) range.gte = new Date(from);

  if (to) {
    const end = new Date(to);
    // A date with no time means the caller meant the day, not midnight.
    if (!to.includes('T')) end.setHours(23, 59, 59, 999);
    range.lte = end;
  }

  return { occurredAt: range };
}

interface AuditRow {
  id: string;
  occurredAt: Date;
  actorStaffUserId: string | null;
  actorEmail: string;
  category: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  targetLabel: string | null;
  before: unknown;
  after: unknown;
  metadata: unknown;
  ipAddress: string | null;
}

function toAuditItem(row: AuditRow): AuditLogListItem {
  return {
    ...row,
    category: row.category as AuditLogListItem['category'],
    occurredAt: row.occurredAt.toISOString(),
  };
}

interface ActivityRow {
  id: string;
  occurredAt: Date;
  staffUserId: string | null;
  email: string;
  event: string;
  succeeded: boolean;
  failureReason: string | null;
  ipAddress: string | null;
  deviceLabel: string | null;
}

function toActivityItem(row: ActivityRow): AuthActivityListItem {
  return {
    ...row,
    event: row.event as AuthActivityListItem['event'],
    occurredAt: row.occurredAt.toISOString(),
  };
}
