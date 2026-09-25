import { Injectable, NotFoundException } from '@nestjs/common';
import type { Paginated, StaffListItem } from '@afaq/types';
import { PrismaService } from '../prisma/prisma.service.js';
import type { ListStaffDto } from './dto/list-staff.dto.js';

const DEFAULT_PAGE_SIZE = 25;

/** The database shape this service reads, written out rather than inferred. */
interface StaffRow {
  id: string;
  email: string;
  fullName: string;
  jobTitle: string | null;
  status: string;
  lastLoginAt: Date | null;
  lastSeenAt: Date | null;
  invitationExpiresAt: Date | null;
  createdAt: Date;
  roles: Array<{ role: { key: string; name: string } }>;
}

@Injectable()
export class StaffService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * The staff directory, narrowed and paged.
   *
   * Always paged: loading every staff member to show twenty-five of them gets
   * slower every month and is the kind of thing nobody notices until it is a
   * problem.
   */
  async list(query: ListStaffDto): Promise<Paginated<StaffListItem>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;

    const where = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.role ? { roles: { some: { role: { key: query.role } } } } : {}),
      ...(query.search
        ? {
            OR: [
              { fullName: { contains: query.search, mode: 'insensitive' as const } },
              { email: { contains: query.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const sortBy = query.sortBy ?? 'createdAt';
    const sortDirection = query.sortDirection ?? 'desc';

    // Counted and fetched together: two round trips would let the total and
    // the rows disagree if someone is invited in between.
    const [total, rows] = await this.prisma.db.$transaction([
      this.prisma.db.staffUser.count({ where }),
      this.prisma.db.staffUser.findMany({
        where,
        orderBy: { [sortBy]: sortDirection },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: STAFF_SELECT,
      }),
    ]);

    return {
      items: (rows as StaffRow[]).map(toListItem),
      total,
      page,
      pageSize,
    };
  }

  /** One staff member, for the detail drawer. */
  async findOne(id: string): Promise<StaffListItem> {
    const row: StaffRow | null = await this.prisma.db.staffUser.findUnique({
      where: { id },
      select: STAFF_SELECT,
    });

    if (!row) {
      throw new NotFoundException({ message: 'That staff member no longer exists.' });
    }

    return toListItem(row);
  }
}

/** Only what the list needs — never the whole record. */
const STAFF_SELECT = {
  id: true,
  email: true,
  fullName: true,
  jobTitle: true,
  status: true,
  lastLoginAt: true,
  lastSeenAt: true,
  invitationExpiresAt: true,
  createdAt: true,
  roles: { select: { role: { select: { key: true, name: true } } } },
} as const;

function toListItem(row: StaffRow): StaffListItem {
  return {
    id: row.id,
    email: row.email,
    fullName: row.fullName,
    jobTitle: row.jobTitle,
    status: row.status as StaffListItem['status'],
    roles: row.roles.map((entry) => entry.role),
    lastLoginAt: row.lastLoginAt?.toISOString() ?? null,
    lastSeenAt: row.lastSeenAt?.toISOString() ?? null,
    invitationExpiresAt: row.invitationExpiresAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}
