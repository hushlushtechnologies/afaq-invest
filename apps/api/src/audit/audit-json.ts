import type { InputJsonValue } from '@afaq/database';

/**
 * What an audit entry's before, after and metadata may hold.
 *
 * Those three are Json columns. A payload typed `Record<string, unknown>` is
 * refused by the compiler, because unknown might be a Date, a Decimal or a
 * function — none of which is stored as anybody would expect. Typing payloads
 * with this makes every service prove its values are plain JSON before they
 * are written, which is the moment the mistake is cheap.
 *
 * Dates go in as ISO strings and money as plain numbers, converted by the
 * service that writes the entry.
 */
export type AuditJsonValue = InputJsonValue | null;

export type AuditJsonObject = Record<string, AuditJsonValue>;
