import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Camera, Search, ClipboardList, Database, ShieldAlert } from 'lucide-react';
import AppShell from '@/components/AppShell';
import db from '@/lib/shared/kliv-database.js';

export default function Index() {
  const [counts, setCounts] = useState<{ companies: number; aliases: number } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [companies, aliases] = await Promise.all([
          db.count('companies', {}),
          db.count('company_aliases', {}),
        ]);
        setCounts({ companies, aliases });
      } catch {
        setCounts(null);
      }
    })();
  }, []);

  return (
    <AppShell>
      <div className="pt-4">
        <h1 className="text-2xl font-black leading-tight text-foreground">全马持牌放贷识别系统</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          扫描银行流水，快速识别可能的持牌放贷公司
        </p>
      </div>

      <Link
        to="/scan"
        className="mt-6 flex h-36 w-full flex-col items-center justify-center gap-2 rounded-2xl bg-primary text-primary-foreground shadow-lg transition-transform active:scale-[0.99]"
      >
        <Camera className="h-10 w-10" />
        <span className="text-xl font-bold">📷 扫描银行流水</span>
        <span className="text-xs opacity-80">拍照或上传单笔交易记录</span>
      </Link>

      <div className="mt-4 grid gap-3">
        <Link
          to="/search"
          className="flex h-20 items-center gap-4 rounded-xl border border-border bg-card px-5 shadow-sm"
        >
          <Search className="h-6 w-6 text-primary" />
          <div>
            <div className="text-base font-bold">🔍 搜索贷款公司</div>
            <div className="text-xs text-muted-foreground">名称 / 牌照号码 / SSM / 电话</div>
          </div>
        </Link>
        <Link
          to="/records"
          className="flex h-20 items-center gap-4 rounded-xl border border-border bg-card px-5 shadow-sm"
        >
          <ClipboardList className="h-6 w-6 text-primary" />
          <div>
            <div className="text-base font-bold">📋 查询记录</div>
            <div className="text-xs text-muted-foreground">查看最近的识别结果</div>
          </div>
        </Link>
        <Link
          to="/admin"
          className="flex h-20 items-center gap-4 rounded-xl border border-border bg-card px-5 shadow-sm"
        >
          <Database className="h-6 w-6 text-primary" />
          <div>
            <div className="text-base font-bold">🗂 数据管理</div>
            <div className="text-xs text-muted-foreground">
              {counts
                ? `${counts.companies} 家公司 · ${counts.aliases} 条名称别名`
                : '公司 / 牌照 / 名称别名'}
            </div>
          </div>
        </Link>
      </div>

      <div className="mt-5 flex gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
        <p>本系统为内部识别 / 匹配工具，不作任何法律判断。未找到匹配只代表当前数据库没有记录。</p>
      </div>
    </AppShell>
  );
}
