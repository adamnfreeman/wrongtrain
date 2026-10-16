/* Dates and clock times. Calendar dates are "YYYY-MM-DD" strings and clock times are minutes
   after midnight, so nothing here depends on the phone's own time zone. */

const MON3 = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DOW3 = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const pad = (n: number) => String(n).padStart(2, '0');

/** Today's date where the time zone is. */
export function todayIn(tz: string, at = new Date()): string {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(at);
  } catch {
    return `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}`;
  }
}

/** Minutes after midnight, right now, where the time zone is. */
export function minutesIn(tz: string, at = new Date()): number {
  try {
    const [h, m] = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false })
      .format(at).split(':').map(Number);
    return (h % 24) * 60 + m;
  } catch {
    return at.getHours() * 60 + at.getMinutes();
  }
}

function parts(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return { y, m, d };
}

export function addDays(iso: string, n: number): string {
  const { y, m, d } = parts(iso);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

export function daysBetween(a: string, b: string): number {
  const A = parts(a), B = parts(b);
  return Math.round((Date.UTC(B.y, B.m - 1, B.d) - Date.UTC(A.y, A.m - 1, A.d)) / 864e5);
}

export function weekday(iso: string): number {
  const { y, m, d } = parts(iso);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export const dow = (iso: string) => DOW3[weekday(iso)];
export const dayOfMonth = (iso: string) => parts(iso).d;
/** "Oct 28" */
export const shortDate = (iso: string) => `${MON3[parts(iso).m - 1]} ${parts(iso).d}`;
/** "Wed Oct 28" */
export const longDate = (iso: string) => `${dow(iso)} ${shortDate(iso)}`;

/** "09:30" → 570. */
export function hm(s?: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s || '');
  return m ? +m[1] * 60 + +m[2] : null;
}

/** 570 → "9:30 AM" */
export function fmtT(min: number): string {
  const m = ((Math.round(min) % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60), x = m % 60;
  return `${((h + 11) % 12) + 1}:${pad(x)} ${h < 12 ? 'AM' : 'PM'}`;
}

/** "09:30" → "9:30 AM", passing through anything that is not a clock time. */
export const fmtHM = (s?: string) => { const v = hm(s); return v == null ? (s || '') : fmtT(v); };

/** 95 → "1 h 35 min" */
export function fmtDur(min: number): string {
  const m = Math.max(0, Math.round(min));
  const h = Math.floor(m / 60), x = m % 60;
  return h ? `${h} h${x ? ` ${x} min` : ''}` : `${x} min`;
}

export function stamp(iso: string): string {
  const d = new Date(iso);
  if (isNaN(+d)) return iso;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ', ' +
    d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}
