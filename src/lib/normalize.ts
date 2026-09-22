/** 名称标准化与相似度计算 */

const SUFFIXES = [
  'SENDIRIAN BERHAD',
  'SDN BHD',
  'SDN BERHAD',
  'BERHAD',
  'BHD',
  'ENTERPRISE SDN BHD',
];

const PREFIXES = [
  'PAYNET',
  'DUITNOW',
  'FPX',
  'IBG',
  'IBFT',
  'INSTANT TRANSFER',
  'TRANSFER TO',
  'PAYMENT TO',
  'CREDIT TRANSFER',
  'DEBIT TRANSFER',
  'ONLINE TRANSFER',
  'INTERBANK GIRO',
  'GIRO',
  'QR PAY',
];

/** 常见 OCR 缩写还原（仅在整词层面，不做逐字符替换） */
const WORD_FIXES: Record<string, string> = {
  CRDT: 'CREDIT',
  CRD: 'CREDIT',
  CR: 'CREDIT',
  CREDT: 'CREDIT',
  KREDIT: 'CREDIT',
  FINANC: 'FINANCE',
  FINANCIAL: 'FINANCE',
  FIN: 'FINANCE',
  CAPITAL: 'CAPITAL',
  MGMT: 'MANAGEMENT',
  SVCS: 'SERVICES',
  SERVICE: 'SERVICES',
  ENT: 'ENTERPRISE',
  ENTERPRISES: 'ENTERPRISE',
  HLDG: 'HOLDINGS',
  HOLDING: 'HOLDINGS',
};

/** 尾部国家/地区标记 */
const TAIL_TOKENS = ['MY', 'MYS', 'MALAYSIA', 'M SDN', 'KL'];

export function cleanText(raw: string): string {
  return (raw || '')
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** 完整标准化：去除支付平台前缀、公司后缀、常见缩写还原 */
export function normalizeName(raw: string): string {
  let s = cleanText(raw);
  if (!s) return '';

  // 去掉支付平台前缀（可能出现多次）
  let changed = true;
  while (changed) {
    changed = false;
    for (const p of PREFIXES) {
      if (s.startsWith(p + ' ')) {
        s = s.slice(p.length + 1).trim();
        changed = true;
      }
    }
  }

  // 去掉公司后缀
  for (const suf of SUFFIXES) {
    if (s.endsWith(' ' + suf) || s === suf) {
      s = s.slice(0, s.length - suf.length).trim();
    }
  }

  // 整词还原
  s = s
    .split(' ')
    .filter(Boolean)
    .map((w) => WORD_FIXES[w] ?? w)
    .join(' ');

  // 去掉尾部地区标记
  for (const t of TAIL_TOKENS) {
    if (s.endsWith(' ' + t)) s = s.slice(0, s.length - t.length).trim();
  }

  // 再次去后缀（还原后可能重新出现）
  for (const suf of SUFFIXES) {
    if (s.endsWith(' ' + suf)) s = s.slice(0, s.length - suf.length).trim();
  }

  return s.replace(/\s+/g, ' ').trim();
}

/** 供模糊比对使用的“形近字归一”版本，仅用于打分，不用于展示 */
export function ocrFold(s: string): string {
  return s
    .replace(/0/g, 'O')
    .replace(/1/g, 'I')
    .replace(/5/g, 'S')
    .replace(/8/g, 'B')
    .replace(/2/g, 'Z');
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
    }
    prev = cur;
  }
  return prev[b.length];
}

/** 0–100 的名称相似度 */
export function similarity(a: string, b: string): number {
  if (!a || !b) return 0;
  const A = ocrFold(a);
  const B = ocrFold(b);
  if (A === B) return 100;
  const maxLen = Math.max(A.length, B.length);
  const base = (1 - levenshtein(A, B) / maxLen) * 100;

  // 词级加成：共同词占比
  const wa = new Set(A.split(' ').filter(Boolean));
  const wb = new Set(B.split(' ').filter(Boolean));
  let common = 0;
  wa.forEach((w) => {
    if (wb.has(w)) common++;
  });
  const wordScore = (common / Math.max(wa.size, wb.size)) * 100;

  let score = base * 0.65 + wordScore * 0.35;

  // 一方完整包含另一方
  if (A.includes(B) || B.includes(A)) score = Math.max(score, 82);

  return Math.max(0, Math.min(99, Math.round(score)));
}

export type ConfidenceLevel = '高度匹配' | '很可能是同一家公司' | '可能是同一家公司' | '低可信度，请人工确认';

export function confidenceLabel(score: number): ConfidenceLevel {
  if (score >= 95) return '高度匹配';
  if (score >= 80) return '很可能是同一家公司';
  if (score >= 60) return '可能是同一家公司';
  return '低可信度，请人工确认';
}

export function confidenceTone(score: number): string {
  if (score >= 95) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (score >= 80) return 'bg-sky-50 text-sky-700 border-sky-200';
  if (score >= 60) return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-zinc-100 text-zinc-600 border-zinc-200';
}
