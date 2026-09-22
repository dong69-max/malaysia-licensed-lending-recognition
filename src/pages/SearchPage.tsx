import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search as SearchIcon, Loader2, SearchX } from 'lucide-react';
import AppShell from '@/components/AppShell';
import MatchCard from '@/components/MatchCard';
import { loadAll, searchCompanies, type MatchCandidate } from '@/lib/matcher';
import type { Alias, Company, License } from '@/lib/types';

export default function SearchPage() {
  const [params, setParams] = useSearchParams();
  const [keyword, setKeyword] = useState(params.get('q') || '');
  const [data, setData] = useState<{ companies: Company[]; licenses: License[]; aliases: Alias[] } | null>(
    null,
  );
  const [results, setResults] = useState<MatchCandidate[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAll()
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!data) return;
    const q = params.get('q') || '';
    setResults(q.trim() ? searchCompanies(q, data) : null);
  }, [data, params]);

  return (
    <AppShell title="搜索贷款公司" back>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setParams(keyword.trim() ? { q: keyword.trim() } : {});
        }}
        className="flex gap-2"
      >
        <input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="公司名称 / 银行流水名称 / 牌照号 / SSM / 电话"
          className="h-12 flex-1 rounded-lg border border-input bg-card px-3 text-base"
        />
        <button
          type="submit"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground"
          aria-label="搜索"
        >
          <SearchIcon className="h-5 w-5" />
        </button>
      </form>

      {loading && (
        <div className="mt-10 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      {!loading && results === null && (
        <p className="mt-8 text-center text-sm text-muted-foreground">
          输入关键字开始搜索，例如「demo crdt」。
        </p>
      )}

      {!loading && results && results.length === 0 && (
        <div className="mt-8 text-center">
          <SearchX className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-2 text-sm font-semibold">未找到匹配记录</p>
          <p className="mt-1 text-xs text-muted-foreground">当前数据库没有找到足够可靠的匹配记录。</p>
        </div>
      )}

      {!loading && results && results.length > 0 && (
        <div className="mt-4 space-y-3">
          <p className="text-sm font-semibold text-muted-foreground">找到 {results.length} 个结果</p>
          {results.map((c) => (
            <MatchCard key={c.company._row_id} candidate={c} />
          ))}
        </div>
      )}
    </AppShell>
  );
}
