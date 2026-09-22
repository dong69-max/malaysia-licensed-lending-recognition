import { Link } from 'react-router-dom';
import { Database, ShieldAlert, Info, ScanLine } from 'lucide-react';
import AppShell from '@/components/AppShell';

export default function More() {
  return (
    <AppShell title="更多">
      <div className="grid gap-3">
        <Link
          to="/admin"
          className="flex h-20 items-center gap-4 rounded-xl border border-border bg-card px-5 shadow-sm"
        >
          <Database className="h-6 w-6 text-primary" />
          <div>
            <div className="text-base font-bold">数据管理</div>
            <div className="text-xs text-muted-foreground">公司 / 牌照 / 名称别名 / CSV 导入</div>
          </div>
        </Link>
      </div>

      <section className="mt-5 rounded-xl border border-border bg-card p-4 text-sm shadow-sm">
        <h3 className="mb-2 flex items-center gap-2 text-sm font-bold">
          <Info className="h-4 w-4 text-primary" /> 关于本系统
        </h3>
        <p className="text-muted-foreground">
          本系统为公司内部使用的<strong className="text-foreground">识别 / 匹配工具</strong>，
          用于把银行流水上的交易名称对应到数据库内已记录的放贷公司资料。
        </p>
        <p className="mt-2 text-muted-foreground">
          系统不作任何法律判断。未找到匹配只表示
          <strong className="text-foreground">当前数据库没有找到匹配记录</strong>，
          不代表该公司的任何合法性结论。
        </p>
      </section>

      <section className="mt-4 rounded-xl border border-border bg-card p-4 text-sm shadow-sm">
        <h3 className="mb-2 flex items-center gap-2 text-sm font-bold">
          <ScanLine className="h-4 w-4 text-primary" /> 使用流程
        </h3>
        <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
          <li>点击「扫描银行流水」，只拍摄需要识别的那一笔交易</li>
          <li>系统识别交易日期、交易名称与金额</li>
          <li>确认或修改识别结果</li>
          <li>点击「确认并查询」，系统标准化名称并匹配数据库</li>
          <li>查看匹配公司、牌照状态、匹配依据与可信度</li>
        </ol>
      </section>

      <section className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">
        <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-amber-900">
          <ShieldAlert className="h-4 w-4" /> 隐私提醒
        </h3>
        <ul className="list-disc space-y-1 pl-5 text-amber-800">
          <li>银行流水图片只在手机本机识别，不会上传、不会保存</li>
          <li>系统只保留查询时间、交易日期、交易名称、匹配结果与可信度</li>
          <li>请勿上传 IC 号码、完整银行账号、余额、工资等无关资料</li>
        </ul>
      </section>
    </AppShell>
  );
}
