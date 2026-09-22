import { describe, it, expect } from 'vitest';
import { parseDate, formatDate, licenseStatusAt, currentLicenseStatus, toISO } from './dates';

describe('parseDate', () => {
  it('解析多种常见日期格式', () => {
    expect(toISO(parseDate('12/08/2026')!)).toBe('2026-08-12');
    expect(toISO(parseDate('12-08-2026')!)).toBe('2026-08-12');
    expect(toISO(parseDate('2026-08-12')!)).toBe('2026-08-12');
    expect(toISO(parseDate('12 Aug 2026')!)).toBe('2026-08-12');
  });

  it('无法解析时返回 null', () => {
    expect(parseDate('hello')).toBeNull();
    expect(parseDate('')).toBeNull();
    expect(parseDate(null)).toBeNull();
  });
});

describe('formatDate', () => {
  it('统一显示为 DD/MM/YYYY', () => {
    expect(formatDate('2026-08-12')).toBe('12/08/2026');
  });
  it('未知时显示未知', () => {
    expect(formatDate(null)).toBe('未知');
  });
});

describe('licenseStatusAt', () => {
  // @kliv-spec-derived — 来自需求第十五节的三个例子
  it('交易日期落在牌照有效期内 → 有效', () => {
    expect(licenseStatusAt('2025-01-01', '2026-12-31', '15/04/2026')).toBe('valid');
  });

  // @kliv-spec-derived — 来自需求第十五节：牌照在交易日期已失效
  it('交易日期在牌照到期之后 → 无效', () => {
    expect(licenseStatusAt('2024-01-01', '2025-12-31', '15/04/2026')).toBe('invalid');
  });

  // @kliv-spec-derived — 来自需求第十五节：资料不足不得推断
  it('缺少牌照日期资料 → 未知', () => {
    expect(licenseStatusAt(null, null, '15/04/2026')).toBe('unknown');
  });

  it('缺少交易日期 → 未知', () => {
    expect(licenseStatusAt('2025-01-01', '2026-12-31', null)).toBe('unknown');
  });

  it('交易日期早于牌照开始日期 → 无效', () => {
    expect(licenseStatusAt('2026-01-01', '2026-12-31', '01/06/2025')).toBe('invalid');
  });
});

describe('currentLicenseStatus', () => {
  it('没有到期日则为未知', () => {
    expect(currentLicenseStatus(null)).toBe('未知');
  });
  it('已过去的到期日为已过期', () => {
    expect(currentLicenseStatus('2001-01-01')).toBe('已过期');
  });
  it('未来的到期日为有效', () => {
    expect(currentLicenseStatus('2099-01-01')).toBe('有效');
  });
});
