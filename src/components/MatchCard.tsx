import { Link } from 'react-router-dom';
import { ChevronRight, ShieldCheck, ShieldAlert, ShieldQuestion } from 'lucide-react';
import type { MatchCandidate } from '@/lib/matcher';
import { confidenceLabel, confidenceTone } from '@/lib/normalize';
import { formatDate, licenseStatusAt, currentLicenseStatus } from '@/lib/dates';
import type { License } from '@/lib/types';
import { cn } from '@/lib/utils';

export function pickLicense(licenses: License[], atDate?: string | null): License | undefined {
  if (!licenses.length) return undefined;
  if (atDate) {
    const valid = licenses.find(
      (l) => licenseStatusAt(l.license_start_date, l.license_expiry_date, atDate) === 'valid',
    );
    if (valid) return valid;
  }
  return [...licenses].sort((a, b) =>
    (b.license_expiry_date || '').localeCompare(a.license_expiry_date || ''),
  )[0];
}

export function LicenseAtDateBadge({
  licenses,
  txDate,
}: {
  licenses: License[];
  txDate?: string | null;
}) {
  if (!txDate || !licenses.length) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs font-medium text-zinc-600">
        <ShieldQuestion className="h-3.5 w-3.5" /> ⚪ 无法确认交易日期的牌照状态
      </span>
    );
  }
  const anyValid = licenses.some(
    (l) => licenseStatusAt(l.license_start_date, l.license_expiry_date, txDate) === 'valid',
  );
  const anyKnown = licenses.some(
    (l) => licenseStatusAt(l.license_start_date, l.license_expiry_date, txDate) !== 'unknown',
  );
  if (anyValid) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
        <ShieldCheck className="h-3.5 w-3.5" /> 🟢 该公司的牌照在交易日期有效
      </span>
    );
  }
  if (anyKnown) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700">
        <ShieldAlert className="h-3.5 w-3.5" /> 🟠 已找到公司，但该牌照在交易日期已经失效
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs font-medium text-zinc-600">
      <ShieldQuestion className="h-3.5 w-3.5" /> ⚪ 无法确认交易日期的牌照状态
    </span>
  );
}

export default function MatchCard({
  candidate,
  txDate,
  rank,
}: {
  candidate: MatchCandidate;
  txDate?: string | null;
  rank?: number;
}) {
  const { company, licenses, score, basis } = candidate;
  const lic = pickLicense(licenses, txDate);

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-bold leading-snug text-foreground">
            {rank ? `${rank}. ` : ''}
            {company.company_name}
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {[company.state, company.district].filter(Boolean).join(' · ') || '州属未知'}
          </p>
        </div>
        <div className={cn('shrink-0 rounded-lg border px-2.5 py-1.5 text-center', confidenceTone(score))}>
          <div className="text-sm font-bold leading-none">{score}%</div>
          <div className="mt-1 text-[10px] leading-none">匹配可信度</div>
        </div>
      </div>

      <p className="mt-2 text-xs font-medium text-muted-foreground">{confidenceLabel(score)}</p>

      <div className="mt-3">
        <LicenseAtDateBadge licenses={licenses} txDate={txDate} />
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
        <Field label="牌照号码" value={lic?.license_number} mono />
        <Field label="牌照到期日" value={lic ? formatDate(lic.license_expiry_date) : undefined} />
        <Field label="当前牌照状态" value={lic ? currentLicenseStatus(lic.license_expiry_date) : '未知'} />
        <Field label="SSM" value={company.ssm_number} mono />
        <Field label="资料来源" value={company.source} />
        <Field label="最后核实" value={company.verified_at ? formatDate(company.verified_at) : undefined} />
      </dl>

      <details className="mt-3 rounded-lg bg-muted/60 px-3 py-2">
        <summary className="cursor-pointer text-xs font-semibold text-foreground">匹配依据</summary>
        <div className="mt-2 space-y-1 text-xs text-muted-foreground">
          <Row k="检测到" v={basis.detected} />
          <Row k="标准化" v={basis.normalized} />
          <Row k="数据库正式名称" v={basis.officialName} />
          <Row k="匹配方式" v={`${basis.matchedVia}（第 ${basis.layer} 层：${basis.layerLabel}）`} />
          <Row k="匹配到的资料" v={basis.matchedValue} />
          <Row k="名称相似度" v={`${basis.nameSimilarity}%`} />
        </div>
      </details>

      <Link
        to={`/company/${company._row_id}?${new URLSearchParams({
          ...(txDate ? { date: txDate } : {}),
          ...(basis.detected ? { detected: basis.detected } : {}),
        }).toString()}`}
        className="mt-3 flex h-11 w-full items-center justify-center gap-1 rounded-lg bg-primary text-sm font-semibold text-primary-foreground"
      >
        查看公司资料 <ChevronRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  return (
    <div>
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd className={cn('font-medium text-foreground break-words', mono && 'font-mono text-[11px]')}>
        {value || '未知'}
      </dd>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-2">
      <span className="shrink-0 text-muted-foreground">{k}：</span>
      <span className="break-words font-medium text-foreground">{v || '—'}</span>
    </div>
  );
}
