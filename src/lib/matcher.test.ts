import { describe, it, expect } from 'vitest';
import { matchCompanies, searchCompanies } from './matcher';
import { normalizeName } from './normalize';
import type { Alias, Company, License } from './types';

function company(id: number, name: string, extra: Partial<Company> = {}): Company {
  return {
    _row_id: id,
    company_name: name,
    normalized_name: normalizeName(name),
    ...extra,
  } as Company;
}

function alias(id: number, companyId: number, name: string, type: string): Alias {
  return {
    _row_id: id,
    company_id: companyId,
    alias_name: name,
    normalized_alias: normalizeName(name),
    alias_type: type,
  } as Alias;
}

const companies = [
  company(1, 'ABC CREDIT SDN BHD', { ssm_number: '199501001234', phone: '07-1234567' }),
  company(2, 'ABC CREDIT ENTERPRISE'),
  company(3, 'ABC CREDIT SERVICES'),
  company(4, 'ZZZ HOLDINGS SDN BHD'),
];

const licenses: License[] = [
  {
    _row_id: 10,
    company_id: 1,
    license_number: 'WL1234/01/01-10/311226',
    license_start_date: '2025-01-01',
    license_expiry_date: '2026-12-31',
  } as License,
];

const aliases: Alias[] = [
  alias(20, 1, 'ABC CREDIT SDN BHD', '正式名称'),
  alias(21, 1, 'PAYNET ABC CREDIT', '银行流水名称'),
];

const data = { companies, licenses, aliases };

describe('matchCompanies', () => {
  // @kliv-spec-derived — 来自需求第二十九节：拍到 "ABC CRDT SDN BHD" 应高可信度指向 ABC CREDIT SDN BHD
  it('OCR 缩写写法仍能高可信度匹配到正式公司', () => {
    const r = matchCompanies('ABC CRDT SDN BHD', data);
    expect(r.length).toBeGreaterThan(0);
    expect(r[0].company.company_name).toBe('ABC CREDIT SDN BHD');
    expect(r[0].score).toBeGreaterThanOrEqual(95);
  });

  // @kliv-spec-derived — 来自需求第十八节：已确认的银行流水名称应被直接识别
  it('已知银行流水名称可直接识别', () => {
    const r = matchCompanies('PAYNET ABC CREDIT', data);
    expect(r[0].company._row_id).toBe(1);
    expect(r[0].score).toBeGreaterThanOrEqual(95);
  });

  // @kliv-spec-derived — 来自需求第十二节：多家相似时不得只返回一家
  it('多家名称相似时返回多个候选并按可信度排序', () => {
    const r = matchCompanies('ABC CREDIT', data);
    const names = r.map((x) => x.company.company_name);
    expect(names).toContain('ABC CREDIT SDN BHD');
    expect(names).toContain('ABC CREDIT ENTERPRISE');
    expect(names).toContain('ABC CREDIT SERVICES');
    for (let i = 1; i < r.length; i++) {
      expect(r[i - 1].score).toBeGreaterThanOrEqual(r[i].score);
    }
  });

  // @kliv-spec-derived — 来自需求第十三节：无可靠匹配时应返回空结果，而非硬套一家
  it('完全无关的名称不返回匹配', () => {
    expect(matchCompanies('QWERTY LOGISTICS', data)).toHaveLength(0);
  });

  // @kliv-spec-derived — 来自需求第八节第九、十层：牌照号码与 SSM 号码可直接匹配
  it('牌照号码与 SSM 号码可直接匹配', () => {
    const byLicense = matchCompanies('WL1234/01/01-10/311226', data);
    expect(byLicense[0].company._row_id).toBe(1);
    const bySsm = matchCompanies('199501001234', data);
    expect(bySsm[0].company._row_id).toBe(1);
  });

  it('每个匹配都带有匹配依据', () => {
    const r = matchCompanies('ABC CRDT', data);
    expect(r[0].basis.detected).toBe('ABC CRDT');
    expect(r[0].basis.normalized).toBe('ABC CREDIT');
    expect(r[0].basis.layerLabel).toBeTruthy();
    expect(r[0].basis.officialName).toBe(r[0].company.company_name);
  });

  it('附上该公司的牌照资料', () => {
    const r = matchCompanies('ABC CREDIT SDN BHD', data);
    expect(r[0].licenses).toHaveLength(1);
    expect(r[0].licenses[0].license_number).toBe('WL1234/01/01-10/311226');
  });

  it('空输入返回空结果', () => {
    expect(matchCompanies('', data)).toHaveLength(0);
  });
});

describe('searchCompanies', () => {
  // @kliv-spec-derived — 来自需求第十九节：输入 "abc crdt" 应找到 ABC CREDIT SDN BHD
  it('小写模糊关键字可找到公司', () => {
    const r = searchCompanies('abc crdt', data);
    expect(r.map((x) => x.company.company_name)).toContain('ABC CREDIT SDN BHD');
  });

  // @kliv-spec-derived — 来自需求第十九节：支持电话号码搜索
  it('支持用电话号码搜索', () => {
    const r = searchCompanies('07-1234567', data);
    expect(r.some((x) => x.company._row_id === 1)).toBe(true);
  });

  it('空关键字返回空结果', () => {
    expect(searchCompanies('  ', data)).toHaveLength(0);
  });
});
