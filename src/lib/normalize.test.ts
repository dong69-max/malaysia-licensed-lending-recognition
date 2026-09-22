import { describe, it, expect } from 'vitest';
import { normalizeName, similarity, confidenceLabel, cleanText } from './normalize';

describe('normalizeName', () => {
  // @kliv-spec-derived — 来自需求第七节：以下写法都应标准化为 "ABC CREDIT"
  it('把各种公司后缀与标点写法统一为同一个名称', () => {
    const variants = [
      'ABC CREDIT SDN. BHD.',
      'ABC CREDIT SDN BHD',
      'ABC-CREDIT',
      'ABC CREDIT',
      'ABC CREDIT SDN.BHD',
      'abc credit sendirian berhad',
    ];
    for (const v of variants) {
      expect(normalizeName(v)).toBe('ABC CREDIT');
    }
  });

  // @kliv-spec-derived — 来自需求第十八节：支付平台前缀与地区尾标应被去除
  it('去除支付平台前缀与地区尾标', () => {
    expect(normalizeName('PAYNET ABC CREDIT')).toBe('ABC CREDIT');
    expect(normalizeName('PAYNET / ABC CREDIT')).toBe('ABC CREDIT');
    expect(normalizeName('ABC CREDIT MY')).toBe('ABC CREDIT');
    expect(normalizeName('DUITNOW ABC CREDIT SDN BHD')).toBe('ABC CREDIT');
  });

  // @kliv-spec-derived — 来自需求第六节：常见缩写 CRDT 应还原为 CREDIT
  it('还原常见 OCR 缩写', () => {
    expect(normalizeName('ABC CRDT SDN BHD')).toBe('ABC CREDIT');
    expect(normalizeName('ABC FINANC')).toBe('ABC FINANCE');
  });

  it('空输入返回空字符串', () => {
    expect(normalizeName('')).toBe('');
    expect(normalizeName('   ')).toBe('');
  });
});

describe('cleanText', () => {
  it('转为大写并移除标点与多余空格', () => {
    expect(cleanText(' abc--credit,  sdn/bhd ')).toBe('ABC CREDIT SDN BHD');
  });
});

describe('similarity', () => {
  it('完全相同得 100', () => {
    expect(similarity('ABC CREDIT', 'ABC CREDIT')).toBe(100);
  });

  // @kliv-spec-derived — 来自需求第七节：形近字 O/0、I/1、S/5、B/8 不应大幅降低相似度
  it('形近字差异仍视为高度相似', () => {
    expect(similarity('ABC CRED1T', 'ABC CREDIT')).toBeGreaterThanOrEqual(95);
    expect(similarity('ABC CRED0', 'ABC CREDO')).toBeGreaterThanOrEqual(95);
  });

  it('完全不同的名称得分低', () => {
    expect(similarity('ABC CREDIT', 'ZZZ HOLDINGS')).toBeLessThan(60);
  });

  it('一方包含另一方时给出较高分数', () => {
    expect(similarity('ABC CREDIT', 'ABC CREDIT SERVICES')).toBeGreaterThanOrEqual(80);
  });

  it('空输入得 0', () => {
    expect(similarity('', 'ABC')).toBe(0);
  });
});

describe('confidenceLabel', () => {
  // @kliv-spec-derived — 来自需求第十一节的匹配等级分界
  it('按 95 / 80 / 60 分界给出等级', () => {
    expect(confidenceLabel(100)).toBe('高度匹配');
    expect(confidenceLabel(95)).toBe('高度匹配');
    expect(confidenceLabel(94)).toBe('很可能是同一家公司');
    expect(confidenceLabel(80)).toBe('很可能是同一家公司');
    expect(confidenceLabel(79)).toBe('可能是同一家公司');
    expect(confidenceLabel(60)).toBe('可能是同一家公司');
    expect(confidenceLabel(59)).toBe('低可信度，请人工确认');
  });
});
