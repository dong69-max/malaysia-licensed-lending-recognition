import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, ClipboardList } from 'lucide-react';
import AppShell from '@/components/AppShell';
import db from '@/lib/shared/kliv-database.js';
import type { CheckRecord } from '@/lib/types';
import { formatDate } from '@/lib/dates';
import { confidenceTone } from '@/lib/normalize';
import { cn } from '@/lib/utils';

export default function Records() {
  const [rows, setRows] = useState<CheckRecord[] | null>(null);

  useEffect(() => {
    (db.query('check_records', { order: '_created_at.desc', limit: '100' }) as Promise<CheckRecord[]>)
      .then((r) => setRows(r))
      .catch(() => setRows([]));
  }, []);

  return (
    <AppShell title="查询记录" back>
      <p className="mb-3 text-xs text-muted-foreground">
        为保护顾客隐私，系统只保存查询时间、交易日期、交易名称与匹配结果，不保存银行流水图片。
      </p>

      {!rows && (
        <div className="mt-10 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      {rows && rows.length === 0 && (
        <div className="mt-12 text-center text-muted-foreground">
          <ClipboardList className="mx-auto h-8 w-8" />
          <p className="mt-2 text-sm">还没有查询记录</p>
        </div>
      )}

      {rows && rows.length > 0 && (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r._row_id} className="rounded-xl border border-border bg-card p-3 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">
                    交易日期：{r.transaction_date ? formatDate(r.transaction_date) : '未提供'}
                  </p>
                  <p className="truncate text-sm font-bold">{r.detected_name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {r.matched_company_name ? `→ ${r.matched_company_name}` : '→ 未找到匹配'}
                  </p>
                  {r.license_status_at_date && r.license_status_at_date !== '未知' && (
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      牌照：{r.license_status_at_date}
                    </p>
                  )}
                </div>
                <span
                  className={cn(
                    'shrink-0 rounded-md border px-2 py-1 text-xs font-bold',
                    confidenceTone(r.confidence || 0),
                  )}
                >
                  {r.confidence || 0}%
                </span>
              </div>
              {r.matched_company_id && (
                <Link
                  to={`/company/${r.matched_company_id}${
                    r.transaction_date ? `?date=${r.transaction_date}` : ''
                  }`}
                  className="mt-2 block text-xs font-semibold text-primary"
                >
                  查看公司资料 →
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
