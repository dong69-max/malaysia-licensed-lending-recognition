import db from '@/lib/shared/kliv-database.js';
import { normalizeName, cleanText, similarity } from './normalize';
import type { Alias, Company, License } from './types';

export interface MatchBasis {
  detected: string;
  normalized: string;
  officialName: string;
  matchedVia: string;
  matchedValue: string;
  layer: number;
  layerLabel: string;
  nameSimilarity: number;
}

export interface MatchCandidate {
  company: Company;
  licenses: License[];
  score: number;
  basis: MatchBasis;
}

const LAYERS: Record<number, string> = {
  1: '完全相同的标准化名称',
  2: '正式注册公司名称',
  3: '商业名称 / Trading Name',
  4: '已知银行流水名称',
  5: '已知交易描述名称',
  6: 'OCR 常见错误名称',
  7: '模糊匹配',
  8: '部分名称匹配',
  9: '牌照号码匹配',
  10: 'SSM 公司注册号码匹配',
};

const ALIAS_LAYER: Record<string, number> = {
  正式名称: 2,
  商业名称: 3,
  银行流水名称: 4,
  支付平台名称: 5,
  OCR错误名称: 6,
  人工新增名称: 7,
};

export async function loadAll(): Promise<{ companies: Company[]; licenses: License[]; aliases: Alias[] }> {
  const [companies, licenses, aliases] = await Promise.all([
    db.query('companies', { limit: '1000' }) as Promise<Company[]>,
    db.query('licenses', { limit: '1000' }) as Promise<License[]>,
    db.query('company_aliases', { limit: '1000' }) as Promise<Alias[]>,
  ]);
  return { companies, licenses, aliases };
}

function digitsOnly(s: string) {
  return (s || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
}

/** 按十层顺序匹配，返回排序后的候选清单 */
export function matchCompanies(
  input: string,
  data: { companies: Company[]; licenses: License[]; aliases: Alias[] },
  minScore = 55,
): MatchCandidate[] {
  const detected = (input || '').trim();
  const norm = normalizeName(detected);
  const raw = cleanText(detected);
  if (!norm && !raw) return [];

  const byId = new Map<number, Company>();
  data.companies.forEach((c) => byId.set(c._row_id, c));

  const best = new Map<number, { score: number; basis: MatchBasis }>();

  const consider = (
    companyId: number,
    score: number,
    layer: number,
    matchedVia: string,
    matchedValue: string,
    nameSimilarity: number,
  ) => {
    const company = byId.get(companyId);
    if (!company) return;
    const prev = best.get(companyId);
    if (prev && prev.score >= score) return;
    best.set(companyId, {
      score,
      basis: {
        detected,
        normalized: norm,
        officialName: company.company_name,
        matchedVia,
        matchedValue,
        layer,
        layerLabel: LAYERS[layer],
        nameSimilarity,
      },
    });
  };

  // 第一层：完全相同的标准化名称
  data.companies.forEach((c) => {
    if (c.normalized_name && c.normalized_name === norm) {
      consider(c._row_id, 100, 1, '标准化名称完全相同', c.normalized_name, 100);
    }
  });

  // 第二层：正式注册公司名称
  data.companies.forEach((c) => {
    if (cleanText(c.company_name) === raw) {
      consider(c._row_id, 99, 2, '正式注册公司名称', c.company_name, 100);
    }
  });

  // 第三至第六层：别名表（依类型归层）
  data.aliases.forEach((a) => {
    const layer = ALIAS_LAYER[a.alias_type] ?? 7;
    if (a.normalized_alias === norm || cleanText(a.alias_name) === raw) {
      const score = layer <= 3 ? 98 : 97;
      consider(a.company_id, score, layer, `已知${a.alias_type}`, a.alias_name, 100);
    }
  });

  // 第七层：模糊匹配（公司名 + 别名）
  data.companies.forEach((c) => {
    const s = similarity(norm, c.normalized_name || normalizeName(c.company_name));
    if (s >= minScore) consider(c._row_id, s, 7, '名称模糊匹配', c.company_name, s);
  });
  data.aliases.forEach((a) => {
    const s = similarity(norm, a.normalized_alias || normalizeName(a.alias_name));
    if (s >= minScore) consider(a.company_id, s, 7, `与${a.alias_type}模糊匹配`, a.alias_name, s);
  });

  // 第八层：部分名称匹配
  if (norm.length >= 4) {
    data.companies.forEach((c) => {
      const cn = c.normalized_name || normalizeName(c.company_name);
      if (cn.includes(norm) || norm.includes(cn)) {
        const s = Math.max(similarity(norm, cn), 70);
        consider(c._row_id, s, 8, '部分名称包含', c.company_name, s);
      }
    });
  }

  // 第九层：牌照号码匹配
  const rawKey = digitsOnly(detected);
  if (rawKey.length >= 5) {
    data.licenses.forEach((l) => {
      if (l.license_number && digitsOnly(l.license_number) === rawKey) {
        consider(l.company_id, 100, 9, '牌照号码完全相同', l.license_number, 100);
      }
    });
    // 第十层：SSM 号码匹配
    data.companies.forEach((c) => {
      if (c.ssm_number && digitsOnly(c.ssm_number) === rawKey) {
        consider(c._row_id, 100, 10, 'SSM 公司注册号码相同', c.ssm_number, 100);
      }
    });
  }

  const out: MatchCandidate[] = [];
  best.forEach((v, companyId) => {
    const company = byId.get(companyId)!;
    out.push({
      company,
      licenses: data.licenses.filter((l) => l.company_id === companyId),
      score: Math.round(v.score),
      basis: v.basis,
    });
  });

  return out.sort((a, b) => b.score - a.score).slice(0, 10);
}

/** 自由文本搜索：名称 / 别名 / 牌照号 / SSM / 电话 */
export function searchCompanies(
  keyword: string,
  data: { companies: Company[]; licenses: License[]; aliases: Alias[] },
): MatchCandidate[] {
  const k = keyword.trim();
  if (!k) return [];
  const results = matchCompanies(k, data, 45);
  const key = k.toLowerCase();

  // 电话号码 / 直接包含
  const extra: MatchCandidate[] = [];
  const have = new Set(results.map((r) => r.company._row_id));
  data.companies.forEach((c) => {
    if (have.has(c._row_id)) return;
    const hit =
      (c.phone || '').toLowerCase().includes(key) ||
      (c.company_name || '').toLowerCase().includes(key) ||
      (c.ssm_number || '').toLowerCase().includes(key);
    if (hit) {
      extra.push({
        company: c,
        licenses: data.licenses.filter((l) => l.company_id === c._row_id),
        score: 70,
        basis: {
          detected: k,
          normalized: normalizeName(k),
          officialName: c.company_name,
          matchedVia: '关键字包含',
          matchedValue: c.company_name,
          layer: 8,
          layerLabel: LAYERS[8],
          nameSimilarity: 70,
        },
      });
    }
  });
  data.licenses.forEach((l) => {
    if (!l.license_number || !l.license_number.toLowerCase().includes(key)) return;
    if (have.has(l.company_id) || extra.some((e) => e.company._row_id === l.company_id)) return;
    const c = data.companies.find((x) => x._row_id === l.company_id);
    if (!c) return;
    extra.push({
      company: c,
      licenses: data.licenses.filter((x) => x.company_id === c._row_id),
      score: 90,
      basis: {
        detected: k,
        normalized: normalizeName(k),
        officialName: c.company_name,
        matchedVia: '牌照号码包含',
        matchedValue: l.license_number,
        layer: 9,
        layerLabel: LAYERS[9],
        nameSimilarity: 90,
      },
    });
  });

  return [...results, ...extra].sort((a, b) => b.score - a.score);
}
