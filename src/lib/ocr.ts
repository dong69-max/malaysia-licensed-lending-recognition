/** 从 OCR 文本中抽取交易日期、交易名称与金额 */
import { parseDate, toISO } from './dates';

export interface ExtractedTransaction {
  date: string;
  name: string;
  amount: string;
  reference: string;
  rawText: string;
}

const NOISE = [
  'BAKI', 'BALANCE', 'DEBIT', 'KREDIT', 'CREDIT BALANCE', 'STATEMENT', 'PENYATA',
  'ACCOUNT', 'AKAUN', 'TARIKH', 'DATE', 'DESCRIPTION', 'BUTIRAN', 'AMOUNT',
  'JUMLAH', 'TRANSACTION', 'URUSNIAGA', 'PAGE', 'MUKA SURAT', 'TOTAL',
];

const AMOUNT_RE = /(?:RM\s*)?(\d{1,3}(?:,\d{3})*\.\d{2}|\d+\.\d{2})/;
const DATE_RE = /(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}|\d{4}-\d{1,2}-\d{1,2}|\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4})/;
const REF_RE = /\b([A-Z]{2,}\d{6,}|\d{10,})\b/;

export function extractTransaction(text: string): ExtractedTransaction {
  const raw = (text || '').replace(/\r/g, '');
  const lines = raw
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 1);

  let date = '';
  for (const l of lines) {
    const m = l.match(DATE_RE);
    if (m) {
      const d = parseDate(m[1]);
      if (d) {
        date = toISO(d);
        break;
      }
    }
  }

  let amount = '';
  for (const l of lines) {
    const m = l.match(AMOUNT_RE);
    if (m) {
      amount = m[1];
      break;
    }
  }

  let reference = '';
  for (const l of lines) {
    const m = l.toUpperCase().match(REF_RE);
    if (m) {
      reference = m[1];
      break;
    }
  }

  // 交易名称：选择字母最多、且不属于表头噪声的行
  let name = '';
  let bestScore = -1;
  for (const l of lines) {
    let candidate = l
      .replace(DATE_RE, ' ')
      .replace(/(?:RM\s*)?\d{1,3}(?:,\d{3})*\.\d{2}/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const upper = candidate.toUpperCase();
    if (NOISE.some((n) => upper === n || upper.startsWith(n + ' '))) continue;
    const letters = (candidate.match(/[A-Za-z]/g) || []).length;
    if (letters < 3) continue;
    const score = letters - (candidate.match(/\d/g) || []).length * 0.5;
    if (score > bestScore) {
      bestScore = score;
      name = candidate;
    }
  }

  return { date, name: name.toUpperCase(), amount, reference, rawText: raw };
}
