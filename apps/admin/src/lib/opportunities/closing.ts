import { closingDate, closingInstant } from '@afaq/types';

/**
 * The value a date field sends: the instant the raise closes, or null.
 *
 * A blank field means "no closing date". A malformed one cannot
 * come from a date input, but if it somehow did, it is treated
 * as blank rather than crashing the form.
 */
export function toClosingInstant(date: string): string | null {
  if (date === '') return null;

  try {
    return closingInstant(date);
  } catch {
    return null;
  }
}

/**
 * Converts a stored closing timestamp into the date displayed
 * by an HTML date input, using the UAE calendar.
 */
export function toClosingField(instant: string | null): string {
  if (instant === null || instant === '') {
    return '';
  }

  const date = new Date(instant);

  // Handle invalid stored dates safely.
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return closingDate(date);
}
