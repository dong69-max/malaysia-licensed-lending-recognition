import { describe, it, expect } from 'vitest';
import { mergePageTexts, needsOcr } from './pdf';

describe('needsOcr', () => {
  it('内嵌文字少于 30 字符视为扫描版，需要 OCR', () => {
    expect(needsOcr('')).toBe(true);
    expect(needsOcr('   ')).toBe(true);
    expect(needsOcr('RM 850.00')).toBe(true);
  });

  it('内嵌文字充足则为文字版，无需 OCR', () => {
    expect(needsOcr('TARIKH 12/03/2026 DEMO CRDT SDN BHD RM 850.00 KREDIT')).toBe(false);
  });
});

describe('mergePageTexts', () => {
  it('OCR 文字优先于内嵌文字', () => {
    const merged = mergePageTexts([{ text: 'short', ocrText: 'TARIKH 01/02/2026 TXG FINANCIAL' }]);
    expect(merged).toBe('TARIKH 01/02/2026 TXG FINANCIAL');
  });

  it('没有 OCR 文字时使用内嵌文字', () => {
    const merged = mergePageTexts([{ text: 'TARIKH 01/02/2026 TXG FINANCIAL SOLUTIONS' }]);
    expect(merged).toContain('TXG FINANCIAL SOLUTIONS');
  });

  it('多页按顺序换行拼接，空页被剔除', () => {
    const merged = mergePageTexts([
      { text: 'PAGE ONE BANK A' },
      { text: '   ', ocrText: '   ' },
      { text: 'PAGE TWO BANK B' },
    ]);
    expect(merged).toBe('PAGE ONE BANK A\nPAGE TWO BANK B');
  });
});
