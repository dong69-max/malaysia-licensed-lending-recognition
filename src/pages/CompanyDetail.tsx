import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Loader2, Check, Plus } from 'lucide-react';
import AppShell from '@/components/AppShell';
import { LicenseAtDateBadge, pickLicense } from '@/components/MatchCard';
import db from '@/lib/shared/kliv-database.js';
import type { Alias, Company, License } from '@/lib/types';
import { formatDate, currentLicenseStatus, licenseStatusAt } from '@/lib/dates';
import { normalizeName } from '@/lib/normalize';
import { toast } from 'sonner';

export default function CompanyDetail() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const txDate = params.get('date') || '';
  const detected = params.get('detected') || '';

  const [company, setCompany] = useState<Company | null>(null);
  const [licenses, setLicenses] = useState<License[]>([]);
  const [aliases, setAliases] = useState<Alias[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    const cid = Number(id);
    const [c, l, a] = await Promise.all([
      db.get('companies', cid) as Promise<Company | null>,
      db.query('licenses', { company_id: `eq.${cid}`, limit: '100' }) as Promise<License[]>,
      db.query('company_aliases', { company_id: `eq.${cid}`, limit: '200' }) as Promise<Alias[]>,
    ]);
    setCompany(c);
    setLicenses(l);
    setAliases(a);
  }

  useEffect(() => {
    load()
      .catch(() => undefined)
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const normDetected = normalizeName(detected);
  const alreadyKnown = aliases.some(
    (a) => a.alias_name.toUpperCase() === detected.trim().toUpperCase(),
  );

  async function confirmAlias() {
    if (!company || !detected.trim()) return;
    setSaving(true);
    try {
      await db.insert('company_aliases', {
        company_id: company._row_id,
        alias_name: detected.trim().toUpperCase(),
        normalized_alias: normDetected,
        alias_type: '银行流水名称',
        confirmed_count: 1,
      });
      toast.success('已保存为该公司的已确认银行流水名称');
      await load();
    } catch {
      toast.error('保存失败，请稍后再试');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <AppShell title="公司资料" back>
        <div className="mt-10 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </AppShell>
    );
  }

  if (!company) {
    return (
      <AppShell title="公司资料" back>
        <p className="mt-10 text-center text-sm text-muted-foreground">找不到该公司资料。</p>
      </AppShell>
    );
  }

  const lic = pickLicense(licenses, txDate);

  return (
    <AppShell title="公司资料" back>
      <h2 className="text-xl font-black leading-snug">{company.company_name}</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {[company.state, company.district].filter(Boolean).join(' · ') || '州属未知'}
      </p>

      {txDate && (
        <div className="mt-3">
          <LicenseAtDateBadge licenses={licenses} txDate={txDate} />
        </div>
      )}

      {detected && !alreadyKnown && (
        <button
          onClick={confirmAlias}
          disabled={saving}
          className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-primary bg-primary/5 text-sm font-semibold text-primary"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          确认「{detected}」是这家公司的流水名称
        </button>
      )}
      {detected && alreadyKnown && (
        <p className="mt-4 flex items-center gap-1.5 text-xs font-medium text-emerald-700">
          <Check className="h-4 w-4" /> 「{detected}」已在该公司的已确认名称中
        </p>
      )}

      <Section title="基本资料">
        <Item k="公司名称" v={company.company_name} />
        <Item k="SSM号码" v={company.ssm_number} />
        <Item k="业务类型" v={company.business_type} />
        <Item k="主管机关" v={company.authority} />
        <Item k="地区 / Jurisdiction" v={company.jurisdiction} />
        <Item k="州" v={company.state} />
        <Item k="地区" v={company.district} />
        <Item k="注册地址" v={company.registered_address} />
        <Item k="营业地址" v={company.operating_address} />
        <Item k="电话号码" v={company.phone} />
        <Item k="网站" v={company.website} />
        <Item
          k="是否获准进行线上放贷"
          v={
            company.online_lending_approved === 'yes'
              ? '是'
              : company.online_lending_approved === 'no'
                ? '否'
                : '未知'
          }
        />
        <Item k="线上放贷资料来源" v={company.online_approval_source} />
        <Item
          k="线上放贷核实日期"
          v={company.online_approval_verified_date ? formatDate(company.online_approval_verified_date) : null}
        />
        <Item k="资料来源" v={company.source} />
        <Item k="来源网址" v={company.source_url} />
        <Item k="最后核实" v={company.verified_at ? formatDate(company.verified_at) : null} />
      </Section>

      <Section title={`牌照资料（${licenses.length}）`}>
        {licenses.length === 0 && <p className="text-sm text-muted-foreground">暂无牌照资料。</p>}
        {licenses.map((l) => (
          <div key={l._row_id} className="mb-3 rounded-lg border border-border p-3 last:mb-0">
            <Item k="牌照号码" v={l.license_number} />
            <Item k="牌照类型" v={l.license_type} />
            <Item k="牌照开始日期" v={formatDate(l.license_start_date)} />
            <Item k="牌照到期日期" v={formatDate(l.license_expiry_date)} />
            <Item k="当前牌照状态" v={currentLicenseStatus(l.license_expiry_date)} />
            {txDate && (
              <Item
                k="交易日期牌照状态"
                v={
                  { valid: '有效', invalid: '无效', unknown: '未知' }[
                    licenseStatusAt(l.license_start_date, l.license_expiry_date, txDate)
                  ]
                }
              />
            )}
            <Item k="Jurisdiction" v={l.jurisdiction} />
            <Item k="州 / 地区" v={[l.state, l.district].filter(Boolean).join(' · ')} />
            <Item k="营业地址" v={l.operating_address} />
            <Item k="资料来源" v={l.source} />
            <Item k="来源网址" v={l.source_url} />
            <Item k="最后核实" v={l.verified_at ? formatDate(l.verified_at) : null} />
            {lic?._row_id === l._row_id && (
              <p className="mt-1 text-[11px] font-semibold text-primary">（用于本次判断）</p>
            )}
          </div>
        ))}
      </Section>

      <Section title={`名称别名（${aliases.length}）`}>
        {aliases.length === 0 && <p className="text-sm text-muted-foreground">暂无名称别名。</p>}
        <ul className="space-y-1.5">
          {aliases.map((a) => (
            <li key={a._row_id} className="flex items-start justify-between gap-2 text-sm">
              <span className="font-medium">{a.alias_name}</span>
              <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
                {a.alias_type}
              </span>
            </li>
          ))}
        </ul>
      </Section>

      <p className="mt-5 text-xs text-muted-foreground">
        本资料仅供内部识别参考，请以官方机构公布的资料为准。
      </p>
    </AppShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-5 rounded-xl border border-border bg-card p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-bold text-foreground">{title}</h3>
      {children}
    </section>
  );
}

function Item({ k, v }: { k: string; v?: string | null }) {
  return (
    <div className="flex gap-2 border-b border-border/60 py-1.5 last:border-0 text-sm">
      <span className="w-32 shrink-0 text-xs text-muted-foreground">{k}</span>
      <span className="min-w-0 break-words font-medium">{v || '未知'}</span>
    </div>
  );
}
