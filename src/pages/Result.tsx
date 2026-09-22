import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Loader2, SearchX, Pencil, Search as SearchIcon, RefreshCw } from 'lucide-react';
import AppShell from '@/components/AppShell';
import MatchCard from '@/components/MatchCard';
import { loadAll, matchCompanies, type MatchCandidate } from '@/lib/matcher';
import { normalizeName } from '@/lib/normalize';
import { formatDate, licenseStatusAt } from '@/lib/dates';
import db from '@/lib/shared/kliv-database.js';

export default function Result() {
  const [params] = useSearchParams();
  const name = params.get('name') || '';
  const date = params.get('date') || '';
  const amount = params.get('amount') || '';
  const method = params.get('method') || '查询';

  const [loading, setLoading] = useState(true);
  const [candidates, setCandidates] = useState<MatchCandidate[]>([]);
  const [error, setError] = useState('');
  const normalized = useMemo(() => normalizeName(name), [name]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await loadAll();
        const list = matchCompanies(name, data);
        if (cancelled) return;
        setCandidates(list);

        const top = list[0];
        let statusAt = '未知';
        if (top && date) {
          const anyValid = top.licenses.some(
            (l) => licenseStatusAt(l.license_start_date, l.license_expiry_date, date) === 'valid',
          );
          const anyKnown = top.licenses.some(
            (l) => licenseStatusAt(l.license_start_date, l.license_expiry_date, date) !== 'unknown',
          );
          statusAt = anyValid ? '交易日期有效' : anyKnown ? '交易日期已失效' : '未知';
        }
        await db.insert('check_records', {
          transaction_date: date || null,
          detected_name: name,
          normalized_name: normalized,
          amount: amount || null,
          matched_company_id: top?.company._row_id ?? null,
          matched_company_name: top?.company.company_name ?? null,
          confidence: top?.score ?? 0,
          match_basis: top ? `${top.basis.matchedVia}（${top.basis.layerLabel}）` : '未找到匹配',
          license_status_at_date: statusAt,
          source_method: method,
        });
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : '查询失败');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, date]);

  return (
    <AppShell title="匹配结果" back>
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <h2 className="text-sm font-bold text-muted-foreground">系统识别结果</h2>
        <dl className="mt-2 grid grid-cols-2 gap-y-2 text-sm">
          <div className="col-span-2">
            <dt className="text-xs text-muted-foreground">交易名称</dt>
            <dd className="text-base font-bold">{name || '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">标准化名称</dt>
            <dd className="font-semibold">{normalized || '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">交易日期</dt>
            <dd className="font-semibold">{date ? formatDate(date) : '未提供'}</dd>
          </div>
          {amount && (
            <div>
              <dt className="text-xs text-muted-foreground">金额</dt>
              <dd className="font-semibold">RM{amount}</dd>
            </div>
          )}
        </dl>
      </div>

      {loading && (
        <div className="mt-10 flex flex-col items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">正在匹配数据库…</p>
        </div>
      )}

      {error && <p className="mt-6 text-sm text-destructive">{error}</p>}

      {!loading && !error && candidates.length === 0 && (
        <div className="mt-6 rounded-xl border border-border bg-card p-5 text-center shadow-sm">
          <SearchX className="mx-auto h-9 w-9 text-muted-foreground" />
          <h2 className="mt-3 text-lg font-bold">未找到匹配记录</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            检测到：<span className="font-semibold text-foreground">{name}</span>
          </p>
          <p className="mt-2 text-sm text-muted-foreground">当前数据库没有找到足够可靠的匹配记录。</p>
          <div className="mt-4 grid gap-2">
            <Link
              to="/scan"
              className="flex h-12 items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-primary-foreground"
            >
              <RefreshCw className="h-4 w-4" /> 重新扫描
            </Link>
            <Link
              to={`/search?q=${encodeURIComponent(name)}`}
              className="flex h-12 items-center justify-center gap-2 rounded-lg border border-border text-sm font-semibold"
            >
              <SearchIcon className="h-4 w-4" /> 手动搜索公司
            </Link>
            <Link
              to="/scan"
              className="flex h-12 items-center justify-center gap-2 rounded-lg border border-border text-sm font-semibold"
            >
              <Pencil className="h-4 w-4" /> 修改交易名称
            </Link>
          </div>
        </div>
      )}

      {!loading && candidates.length > 0 && (
        <div className="mt-5 space-y-3">
          <h2 className="text-lg font-black">
            {candidates.length === 1 ? '找到匹配' : `找到 ${candidates.length} 个可能匹配`}
          </h2>
          {candidates.map((c, i) => (
            <MatchCard
              key={c.company._row_id}
              candidate={c}
              txDate={date}
              rank={candidates.length > 1 ? i + 1 : undefined}
            />
          ))}
          <p className="px-1 pt-1 text-xs text-muted-foreground">
            本结果仅为名称匹配参考，不构成任何法律判断，请自行核实官方资料。
          </p>
        </div>
      )}
    </AppShell>
  );
}
