import { useEffect, useState } from 'react';
import { Loader2, Plus, Trash2, Upload } from 'lucide-react';
import AppShell from '@/components/AppShell';
import db from '@/lib/shared/kliv-database.js';
import type { Alias, Company, License } from '@/lib/types';
import { ALIAS_TYPES } from '@/lib/types';
import { normalizeName } from '@/lib/normalize';
import { formatDate } from '@/lib/dates';
import { toast } from 'sonner';

type Tab = 'companies' | 'licenses' | 'aliases' | 'import';

export default function Admin() {
  const [tab, setTab] = useState<Tab>('companies');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [licenses, setLicenses] = useState<License[]>([]);
  const [aliases, setAliases] = useState<Alias[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const [c, l, a] = await Promise.all([
      db.query('companies', { limit: '1000', order: 'company_name.asc' }) as Promise<Company[]>,
      db.query('licenses', { limit: '1000' }) as Promise<License[]>,
      db.query('company_aliases', { limit: '1000' }) as Promise<Alias[]>,
    ]);
    setCompanies(c);
    setLicenses(l);
    setAliases(a);
  }

  useEffect(() => {
    load()
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  const TABS: { key: Tab; label: string }[] = [
    { key: 'companies', label: '公司' },
    { key: 'licenses', label: '牌照' },
    { key: 'aliases', label: '名称别名' },
    { key: 'import', label: 'CSV 导入' },
  ];

  return (
    <AppShell title="数据管理" back>
      <div className="mb-4 flex gap-1 rounded-lg bg-muted p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={
              'flex-1 rounded-md py-2 text-xs font-semibold ' +
              (tab === t.key ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground')
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="mt-10 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : tab === 'companies' ? (
        <CompaniesTab companies={companies} reload={load} />
      ) : tab === 'licenses' ? (
        <LicensesTab companies={companies} licenses={licenses} reload={load} />
      ) : tab === 'aliases' ? (
        <AliasesTab companies={companies} aliases={aliases} reload={load} />
      ) : (
        <ImportTab reload={load} />
      )}
    </AppShell>
  );
}

const inputCls = 'h-11 w-full rounded-lg border border-input bg-card px-3 text-sm';

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

function CompaniesTab({ companies, reload }: { companies: Company[]; reload: () => Promise<void> }) {
  const empty = {
    company_name: '',
    ssm_number: '',
    business_type: '',
    jurisdiction: '半岛',
    authority: 'KPKT',
    state: '',
    district: '',
    registered_address: '',
    operating_address: '',
    phone: '',
    website: '',
    online_lending_approved: 'unknown',
    source: '',
    source_url: '',
    verified_at: '',
  };
  const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function save() {
    if (!form.company_name.trim()) return toast.error('请填写公司名称');
    if (!form.source.trim() || !form.verified_at) return toast.error('请填写资料来源与最后核实日期');
    setBusy(true);
    try {
      const norm = normalizeName(form.company_name);
      const c = await db.insert<{ _row_id: number }>('companies', {
        ...form,
        company_name: form.company_name.trim().toUpperCase(),
        normalized_name: norm,
        is_demo: 0,
      });
      await db.insert('company_aliases', {
        company_id: c._row_id,
        alias_name: form.company_name.trim().toUpperCase(),
        normalized_alias: norm,
        alias_type: '正式名称',
      });
      toast.success('已新增公司');
      setForm(empty);
      await reload();
    } catch {
      toast.error('保存失败');
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    if (!confirm('确定删除这家公司？相关牌照与别名请自行清理。')) return;
    await db.delete('companies', { _row_id: `eq.${id}` });
    toast.success('已删除');
    await reload();
  }

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-bold">增加公司</h3>
        <div className="grid gap-3">
          <Labeled label="公司名称 *">
            <input className={inputCls} value={form.company_name} onChange={(e) => set('company_name', e.target.value)} />
          </Labeled>
          <div className="grid grid-cols-2 gap-3">
            <Labeled label="SSM号码">
              <input className={inputCls} value={form.ssm_number} onChange={(e) => set('ssm_number', e.target.value)} />
            </Labeled>
            <Labeled label="业务类型">
              <input className={inputCls} value={form.business_type} onChange={(e) => set('business_type', e.target.value)} />
            </Labeled>
            <Labeled label="地区 Jurisdiction">
              <select className={inputCls} value={form.jurisdiction} onChange={(e) => set('jurisdiction', e.target.value)}>
                <option>半岛</option>
                <option>吉隆坡</option>
                <option>布城</option>
                <option>Sabah</option>
                <option>Sarawak</option>
                <option>Labuan</option>
              </select>
            </Labeled>
            <Labeled label="主管机关">
              <input className={inputCls} value={form.authority} onChange={(e) => set('authority', e.target.value)} />
            </Labeled>
            <Labeled label="州">
              <input className={inputCls} value={form.state} onChange={(e) => set('state', e.target.value)} />
            </Labeled>
            <Labeled label="地区 District">
              <input className={inputCls} value={form.district} onChange={(e) => set('district', e.target.value)} />
            </Labeled>
          </div>
          <Labeled label="注册地址">
            <input className={inputCls} value={form.registered_address} onChange={(e) => set('registered_address', e.target.value)} />
          </Labeled>
          <Labeled label="营业地址">
            <input className={inputCls} value={form.operating_address} onChange={(e) => set('operating_address', e.target.value)} />
          </Labeled>
          <div className="grid grid-cols-2 gap-3">
            <Labeled label="电话号码">
              <input className={inputCls} value={form.phone} onChange={(e) => set('phone', e.target.value)} />
            </Labeled>
            <Labeled label="网站">
              <input className={inputCls} value={form.website} onChange={(e) => set('website', e.target.value)} />
            </Labeled>
          </div>
          <Labeled label="是否获准进行线上放贷">
            <select
              className={inputCls}
              value={form.online_lending_approved}
              onChange={(e) => set('online_lending_approved', e.target.value)}
            >
              <option value="unknown">未知</option>
              <option value="yes">是</option>
              <option value="no">否</option>
            </select>
          </Labeled>
          <Labeled label="资料来源 *">
            <input className={inputCls} value={form.source} onChange={(e) => set('source', e.target.value)} placeholder="KPKT / i-KrediKom / eMaps" />
          </Labeled>
          <Labeled label="来源网址">
            <input className={inputCls} value={form.source_url} onChange={(e) => set('source_url', e.target.value)} />
          </Labeled>
          <Labeled label="最后核实日期 *">
            <input type="date" className={inputCls} value={form.verified_at} onChange={(e) => set('verified_at', e.target.value)} />
          </Labeled>
          <button
            onClick={save}
            disabled={busy}
            className="flex h-12 items-center justify-center gap-2 rounded-lg bg-primary text-sm font-bold text-primary-foreground"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} 保存公司
          </button>
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-sm font-bold">公司列表（{companies.length}）</h3>
        <ul className="space-y-2">
          {companies.map((c) => (
            <li key={c._row_id} className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card p-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{c.company_name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {[c.state, c.jurisdiction, c.source].filter(Boolean).join(' · ')}
                  {c.verified_at ? ` · 核实 ${formatDate(c.verified_at)}` : ''}
                </p>
              </div>
              <button onClick={() => remove(c._row_id)} aria-label="删除" className="shrink-0 p-2 text-destructive">
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function LicensesTab({
  companies,
  licenses,
  reload,
}: {
  companies: Company[];
  licenses: License[];
  reload: () => Promise<void>;
}) {
  const empty = {
    company_id: '',
    license_number: '',
    license_type: '',
    license_start_date: '',
    license_expiry_date: '',
    status: 'active',
    source: '',
    source_url: '',
    verified_at: '',
  };
  const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function save() {
    if (!form.company_id) return toast.error('请选择公司');
    if (!form.source.trim()) return toast.error('请填写资料来源');
    setBusy(true);
    try {
      const c = companies.find((x) => x._row_id === Number(form.company_id));
      await db.insert('licenses', {
        ...form,
        company_id: Number(form.company_id),
        jurisdiction: c?.jurisdiction || null,
        state: c?.state || null,
        district: c?.district || null,
        operating_address: c?.operating_address || null,
      });
      toast.success('已新增牌照');
      setForm(empty);
      await reload();
    } catch {
      toast.error('保存失败');
    } finally {
      setBusy(false);
    }
  }

  async function markExpired(id: number) {
    await db.update('licenses', { _row_id: `eq.${id}` }, { status: 'expired' });
    toast.success('已标记为过期');
    await reload();
  }

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-bold">新增 / 增加历史牌照</h3>
        <div className="grid gap-3">
          <Labeled label="公司 *">
            <select className={inputCls} value={form.company_id} onChange={(e) => set('company_id', e.target.value)}>
              <option value="">请选择</option>
              {companies.map((c) => (
                <option key={c._row_id} value={c._row_id}>
                  {c.company_name}
                </option>
              ))}
            </select>
          </Labeled>
          <Labeled label="牌照号码">
            <input className={inputCls} value={form.license_number} onChange={(e) => set('license_number', e.target.value)} />
          </Labeled>
          <Labeled label="牌照类型">
            <input className={inputCls} value={form.license_type} onChange={(e) => set('license_type', e.target.value)} />
          </Labeled>
          <div className="grid grid-cols-2 gap-3">
            <Labeled label="开始日期">
              <input type="date" className={inputCls} value={form.license_start_date} onChange={(e) => set('license_start_date', e.target.value)} />
            </Labeled>
            <Labeled label="到期日期">
              <input type="date" className={inputCls} value={form.license_expiry_date} onChange={(e) => set('license_expiry_date', e.target.value)} />
            </Labeled>
          </div>
          <Labeled label="资料来源 *">
            <input className={inputCls} value={form.source} onChange={(e) => set('source', e.target.value)} />
          </Labeled>
          <Labeled label="来源网址">
            <input className={inputCls} value={form.source_url} onChange={(e) => set('source_url', e.target.value)} />
          </Labeled>
          <Labeled label="最后核实日期">
            <input type="date" className={inputCls} value={form.verified_at} onChange={(e) => set('verified_at', e.target.value)} />
          </Labeled>
          <button
            onClick={save}
            disabled={busy}
            className="flex h-12 items-center justify-center gap-2 rounded-lg bg-primary text-sm font-bold text-primary-foreground"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} 保存牌照
          </button>
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-sm font-bold">牌照列表（{licenses.length}）</h3>
        <ul className="space-y-2">
          {licenses.map((l) => {
            const c = companies.find((x) => x._row_id === l.company_id);
            return (
              <li key={l._row_id} className="rounded-lg border border-border bg-card p-3">
                <p className="text-sm font-semibold">{c?.company_name || '未知公司'}</p>
                <p className="font-mono text-xs text-muted-foreground">{l.license_number || '无牌照号码'}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(l.license_start_date)} → {formatDate(l.license_expiry_date)} · {l.status || '未知'}
                </p>
                {l.status !== 'expired' && (
                  <button onClick={() => markExpired(l._row_id)} className="mt-1 text-xs font-semibold text-amber-700">
                    标记牌照过期
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

function AliasesTab({
  companies,
  aliases,
  reload,
}: {
  companies: Company[];
  aliases: Alias[];
  reload: () => Promise<void>;
}) {
  const [companyId, setCompanyId] = useState('');
  const [aliasName, setAliasName] = useState('');
  const [aliasType, setAliasType] = useState<string>('银行流水名称');
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!companyId || !aliasName.trim()) return toast.error('请选择公司并填写名称');
    setBusy(true);
    try {
      await db.insert('company_aliases', {
        company_id: Number(companyId),
        alias_name: aliasName.trim().toUpperCase(),
        normalized_alias: normalizeName(aliasName),
        alias_type: aliasType,
      });
      toast.success('已新增名称别名');
      setAliasName('');
      await reload();
    } catch {
      toast.error('保存失败');
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    await db.delete('company_aliases', { _row_id: `eq.${id}` });
    await reload();
  }

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-bold">新增名称别名</h3>
        <div className="grid gap-3">
          <Labeled label="公司 *">
            <select className={inputCls} value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
              <option value="">请选择</option>
              {companies.map((c) => (
                <option key={c._row_id} value={c._row_id}>
                  {c.company_name}
                </option>
              ))}
            </select>
          </Labeled>
          <Labeled label="名称 *">
            <input className={inputCls} value={aliasName} onChange={(e) => setAliasName(e.target.value.toUpperCase())} />
          </Labeled>
          <Labeled label="名称类型">
            <select className={inputCls} value={aliasType} onChange={(e) => setAliasType(e.target.value)}>
              {ALIAS_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </Labeled>
          <button
            onClick={save}
            disabled={busy}
            className="flex h-12 items-center justify-center gap-2 rounded-lg bg-primary text-sm font-bold text-primary-foreground"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} 保存名称别名
          </button>
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-sm font-bold">名称别名（{aliases.length}）</h3>
        <ul className="space-y-2">
          {aliases.map((a) => {
            const c = companies.find((x) => x._row_id === a.company_id);
            return (
              <li key={a._row_id} className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{a.alias_name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {c?.company_name || '未知公司'} · {a.alias_type}
                  </p>
                </div>
                <button onClick={() => remove(a._row_id)} aria-label="删除" className="shrink-0 p-2 text-destructive">
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

/** 简单 CSV 解析（支持引号） */
export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else quoted = false;
      } else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') {
      row.push(cell);
      cell = '';
    } else if (ch === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else if (ch !== '\r') cell += ch;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

function ImportTab({ reload }: { reload: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<string>('');

  async function onFile(file: File) {
    setBusy(true);
    setLog('');
    try {
      const text = await file.text();
      const rows = parseCSV(text);
      if (rows.length < 2) throw new Error('文件没有资料');
      const header = rows[0].map((h) => h.trim().toLowerCase());
      const idx = (n: string) => header.indexOf(n);
      let ok = 0;
      for (const r of rows.slice(1)) {
        const name = (r[idx('company_name')] || '').trim();
        if (!name) continue;
        const norm = normalizeName(name);
        const c = await db.insert<{ _row_id: number }>('companies', {
          company_name: name.toUpperCase(),
          normalized_name: norm,
          ssm_number: r[idx('ssm_number')] || null,
          business_type: r[idx('business_type')] || null,
          jurisdiction: r[idx('jurisdiction')] || null,
          authority: r[idx('authority')] || null,
          state: r[idx('state')] || null,
          district: r[idx('district')] || null,
          registered_address: r[idx('registered_address')] || null,
          operating_address: r[idx('operating_address')] || null,
          phone: r[idx('phone')] || null,
          website: r[idx('website')] || null,
          online_lending_approved: r[idx('online_lending_approved')] || 'unknown',
          source: r[idx('source')] || null,
          source_url: r[idx('source_url')] || null,
          verified_at: r[idx('verified_at')] || null,
          is_demo: 0,
        });
        await db.insert('company_aliases', {
          company_id: c._row_id,
          alias_name: name.toUpperCase(),
          normalized_alias: norm,
          alias_type: '正式名称',
        });
        const licNo = r[idx('license_number')];
        if (licNo) {
          await db.insert('licenses', {
            company_id: c._row_id,
            license_number: licNo,
            license_type: r[idx('license_type')] || null,
            license_start_date: r[idx('license_start_date')] || null,
            license_expiry_date: r[idx('license_expiry_date')] || null,
            status: r[idx('status')] || null,
            jurisdiction: r[idx('jurisdiction')] || null,
            state: r[idx('state')] || null,
            district: r[idx('district')] || null,
            source: r[idx('source')] || null,
            source_url: r[idx('source_url')] || null,
            verified_at: r[idx('verified_at')] || null,
          });
        }
        ok++;
      }
      setLog(`成功导入 ${ok} 家公司。`);
      toast.success(`成功导入 ${ok} 家公司`);
      await reload();
    } catch (e) {
      setLog(e instanceof Error ? e.message : '导入失败');
      toast.error('导入失败');
    } finally {
      setBusy(false);
    }
  }

  const template =
    'company_name,ssm_number,business_type,jurisdiction,authority,state,district,registered_address,operating_address,phone,website,online_lending_approved,source,source_url,verified_at,license_number,license_type,license_start_date,license_expiry_date,status';

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <h3 className="mb-2 text-sm font-bold">批量导入 CSV</h3>
        <p className="mb-3 text-xs text-muted-foreground">
          Excel 请先另存为 CSV（UTF-8）。第一行必须是栏位名称：
        </p>
        <pre className="mb-3 overflow-x-auto rounded bg-muted p-2 text-[10px]">{template}</pre>
        <label className="flex h-12 cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary text-sm font-bold text-primary-foreground">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          选择 CSV 文件
          <input
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
          />
        </label>
        {log && <p className="mt-3 text-xs font-medium">{log}</p>}
      </section>
      <p className="text-xs text-muted-foreground">
        提醒：请只导入经过核实的官方资料，并务必填写「资料来源」与「最后核实日期」。
      </p>
    </div>
  );
}
