import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Upload, Loader2, RefreshCw, ShieldAlert, FileText } from 'lucide-react';
import AppShell from '@/components/AppShell';
import { extractTransaction } from '@/lib/ocr';
import { normalizeName } from '@/lib/normalize';

type Stage = 'idle' | 'working' | 'review';

export default function Scan() {
  const navigate = useNavigate();
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<Stage>('idle');
  const [progress, setProgress] = useState(0);
  const [preview, setPreview] = useState<string>('');
  const [error, setError] = useState('');
  const [date, setDate] = useState('');
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [rawText, setRawText] = useState('');

  async function handleFile(file: File) {
    setError('');
    setStage('working');
    setProgress(0);
    const url = URL.createObjectURL(file);
    setPreview(url);
    try {
      if (file.type === 'application/pdf') {
        throw new Error('PDF 暂时无法自动识别，请改为拍摄或截图上传该笔交易的图片，或直接手动输入。');
      }
      const Tesseract = (await import('tesseract.js')).default;
      const result = await Tesseract.recognize(file, 'eng', {
        logger: (m: { status: string; progress: number }) => {
          if (m.status === 'recognizing text') setProgress(Math.round(m.progress * 100));
        },
      });
      const text = result?.data?.text || '';
      const tx = extractTransaction(text);
      setDate(tx.date);
      setName(tx.name);
      setAmount(tx.amount);
      setRawText(text);
      setStage('review');
    } catch (e) {
      setError(e instanceof Error ? e.message : '识别失败，请重新拍摄或手动输入。');
      setStage('review');
    } finally {
      // 隐私：识别完成后立即释放临时图片，不上传、不保存
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  }

  function submit() {
    if (!name.trim()) {
      setError('请填写交易名称。');
      return;
    }
    const params = new URLSearchParams({ name: name.trim(), date, amount, method: '扫描' });
    navigate(`/result?${params.toString()}`);
  }

  return (
    <AppShell title="扫描银行流水" back>
      <div className="flex gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          注意：银行流水包含机密财务资料，请尽量只上传需要识别的交易记录。图片只在本机识别，
          <strong>不会上传，也不会保存</strong>。
        </p>
      </div>

      {stage === 'idle' && (
        <div className="mt-5 grid gap-3">
          <button
            onClick={() => cameraRef.current?.click()}
            className="flex h-32 flex-col items-center justify-center gap-2 rounded-2xl bg-primary text-primary-foreground shadow-lg"
          >
            <Camera className="h-9 w-9" />
            <span className="text-lg font-bold">📷 打开相机拍照</span>
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="flex h-20 items-center justify-center gap-3 rounded-xl border border-border bg-card text-base font-bold shadow-sm"
          >
            <Upload className="h-5 w-5 text-primary" /> 从手机上传图片 / PDF
          </button>
          <button
            onClick={() => setStage('review')}
            className="flex h-14 items-center justify-center gap-2 rounded-xl border border-dashed border-border text-sm font-medium text-muted-foreground"
          >
            <FileText className="h-4 w-4" /> 直接手动输入交易名称
          </button>
          <p className="px-1 text-center text-xs text-muted-foreground">
            建议只拍摄需要识别的那一笔交易：日期 | 交易说明 | 金额
          </p>
        </div>
      )}

      {stage === 'working' && (
        <div className="mt-8 flex flex-col items-center gap-3">
          {preview && (
            <img src={preview} alt="待识别的交易" className="max-h-52 rounded-lg border border-border" />
          )}
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
          <p className="text-sm font-medium">正在识别文字… {progress}%</p>
        </div>
      )}

      {stage === 'review' && (
        <div className="mt-5 space-y-4">
          {error && (
            <div className="rounded-lg bg-destructive/10 p-3 text-xs font-medium text-destructive">{error}</div>
          )}
          <h2 className="text-lg font-bold">系统识别结果</h2>
          <Field label="交易日期">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-12 w-full rounded-lg border border-input bg-card px-3 text-base"
            />
          </Field>
          <Field label="交易名称">
            <input
              value={name}
              onChange={(e) => setName(e.target.value.toUpperCase())}
              placeholder="例如：DEMO CRDT SDN BHD"
              className="h-12 w-full rounded-lg border border-input bg-card px-3 text-base font-semibold uppercase"
            />
            {name && (
              <p className="mt-1 text-xs text-muted-foreground">
                标准化后：<span className="font-semibold text-foreground">{normalizeName(name) || '—'}</span>
              </p>
            )}
          </Field>
          <Field label="金额">
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="例如：850.00"
              className="h-12 w-full rounded-lg border border-input bg-card px-3 text-base"
            />
          </Field>

          {rawText && (
            <details className="rounded-lg bg-muted/60 p-3 text-xs">
              <summary className="cursor-pointer font-semibold">查看识别到的原始文字</summary>
              <pre className="mt-2 whitespace-pre-wrap break-words text-[11px] text-muted-foreground">
                {rawText}
              </pre>
            </details>
          )}

          <button
            onClick={submit}
            className="h-14 w-full rounded-xl bg-primary text-base font-bold text-primary-foreground"
          >
            确认并查询
          </button>
          <button
            onClick={() => {
              setStage('idle');
              setName('');
              setDate('');
              setAmount('');
              setRawText('');
              setError('');
            }}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-border text-sm font-semibold"
          >
            <RefreshCw className="h-4 w-4" /> 重新扫描
          </button>
        </div>
      )}

      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />
      <input
        ref={fileRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-semibold text-foreground">{label}</label>
      {children}
    </div>
  );
}
