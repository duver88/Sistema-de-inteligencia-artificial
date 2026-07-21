// Helpers for the User.accessExpiresAt access-expiration feature.
//
// Convention (matches lib/auth.ts enforcement): accessExpiresAt travels
// through the API as an ISO string (or null = unlimited) that always
// represents the END of the chosen day in UTC (23:59:59.999Z). Super
// admins never expire — the field is ignored for them.

/**
 * True when the user's access has effectively expired: a non-super-admin
 * with accessExpiresAt in the past. Mirrors the `<= now` check in
 * lib/auth.ts so the badge matches what the server enforces.
 */
export function isAccessExpired(user: {
  isSuperAdmin: boolean;
  accessExpiresAt: string | null;
}): boolean {
  if (user.isSuperAdmin || !user.accessExpiresAt) return false;
  const expires = new Date(user.accessExpiresAt).getTime();
  return !Number.isNaN(expires) && expires <= Date.now();
}

/**
 * Format an accessExpiresAt ISO string as a short date. Formatted in UTC
 * so the calendar day the admin picked is shown unchanged regardless of
 * the viewer's timezone (the stored instant is 23:59:59.999Z of that day).
 */
export function formatAccessDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-US', {
    timeZone: 'UTC',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/** `<input type="date">` value (yyyy-MM-dd) → ISO string for the end of that day in UTC. */
export function dateInputToUtcEndOfDay(dateValue: string): string {
  return `${dateValue}T23:59:59.999Z`;
}

/** accessExpiresAt ISO string → yyyy-MM-dd value for `<input type="date">` (UTC date part). */
export function isoToDateInput(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
}
