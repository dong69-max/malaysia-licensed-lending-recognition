/** 日期解析与牌照历史状态判断 */

export type LicenseDateStatus = 'valid' | 'invalid' | 'unknown';

/** 解析多种常见格式：DD/MM/YYYY、DD-MM-YYYY、YYYY-MM-DD、12 Aug 2026 */
export function parseDate(input?: string | null): Date | null {
  if (!input) return null;
  const s = input.trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return mk(+m[1], +m[2], +m[3]);

  m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  if (m) return mk(+m[3], +m[2], +m[1]);

  m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2})$/);
  if (m) return mk(2000 + +m[3], +m[2], +m[1]);

  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  m = s.toUpperCase().match(/^(\d{1,2})\s*([A-Z]{3})[A-Z]*\s*(\d{4})$/);
  if (m) {
    const mi = months.indexOf(m[2]);
    if (mi >= 0) return mk(+m[3], mi + 1, +m[1]);
  }
  return null;
}

function mk(y: number, mo: number, d: number): Date | null {
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return isNaN(dt.getTime()) ? null : dt;
}

export function formatDate(input?: string | null): string {
  const d = parseDate(input || '');
  if (!d) return input || '未知';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getUTCDate())}/${p(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
}

export function toISO(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`;
}

/** 判断某个牌照在指定日期是否有效 */
export function licenseStatusAt(
  start?: string | null,
  expiry?: string | null,
  atDate?: string | null,
): LicenseDateStatus {
  const at = parseDate(atDate || '');
  const s = parseDate(start || '');
  const e = parseDate(expiry || '');
  if (!at || (!s && !e)) return 'unknown';
  if (s && at < s) return 'invalid';
  if (e && at > e) return 'invalid';
  if (!e) return 'unknown';
  return 'valid';
}

/** 当前牌照状态 */
export function currentLicenseStatus(expiry?: string | null): '有效' | '已过期' | '未知' {
  const e = parseDate(expiry || '');
  if (!e) return '未知';
  return e.getTime() >= Date.now() ? '有效' : '已过期';
}
