import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Upload, Loader2, RefreshCw, ShieldAlert, FileText } from 'lucide-react';
import AppShell from '@/components/AppShell';
import { extractTransaction } from '@/lib/ocr';
import { normalizeName } from '@/lib/normalize';
import { readPdf, mergePageTexts, needsOcr } from '@/lib/pdf';

type Stage = 'idle' | 'working' | 'review';

export default function Scan() {
  const navigate = useNavigate();
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<Stage>('idle');
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [preview, setPreview] = useState<string>('');
  const [error, setError] = useState('');
  const [date, setDate] = useState('');
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [rawText, setRawText] = useState('');

  async function ocrImage(
    image: string | File,
    onProgress: (p: number) => void,
  ): Promise<string> {
    const Tesseract = (await import('tesseract.js')).default;
    const result = await Tesseract.recognize(image, 'eng', {
      logger: (m: { status: string; progress: number }) => {
        if (m.status === 'recognizing text') onProgress(m.progress);
      },
    });
    return result?.data?.text || '';
  }

  async function handleFile(file: File) {
    setError('');
    setStage('working');
    setProgress(0);
    const url = URL.createObjectURL(file);
    setPreview(file.type === 'application/pdf' ? '' : url);
    try {
      let text = '';

      if (file.type === 'application/pdf') {
        setStatusText('正在读取 PDF…');
        const pages = await readPdf(file, {
          maxPages: 8,
          onPage: (n, total) => setStatusText(`正在读取 PDF 第 ${n}/${total} 页…`),
        });
        if (pages.length > 0) setPreview(pages[0].image);

        const collected: { text: string; ocrText?: string }[] = [];
        for (let i = 0; i < pages.length; i++) {
          const page = pages[i];
          if (needsOcr(page.text)) {
            setStatusText(`第 ${page.pageNumber} 页是扫描图片，正在识别文字…`);
            const ocr = await ocrImage(page.image, (p) => {
              setProgress(Math.round(((i + p) / pages.length) * 100));
            });
            collected.push({ text: page.text, ocrText: ocr });
          } else {
            collected.push({ text: page.text });
            setProgress(Math.round(((i + 1) / pages.length) * 100));
          }
        }
        text = mergePageTexts(collected);
      } else {
        setStatusText('正在识别文字…');
        text = await ocrImage(file, (p) => setProgress(Math.round(p * 100)));
      }

      if (!text.trim()) {
        setError('没有识别到文字。请确认图片清晰，或改用手动输入。');
        setStage('review');
        return;
      }

      const tx = extractTransaction(text);
      setDate(tx.date);
      setName(tx.name);
      setAmount(tx.amount);
      setRawText(text);
      setStage('review');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(
        file.type === 'application/pdf' && /password|Password/i.test(msg)
          ? '这个 PDF 设有密码，无法读取。请先解除密码，或改为截图上传。'
          : '识别失败，请重新拍摄、换清晰的截图，或直接手动输入。',
      );
      setStage('review');
    } finally {
      setStatusText('');
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
          注意：银行流水包含机密财务资料，请尽量只上传需要识别的交易记录。图片和 PDF 都只在本机识别，
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
            建议只拍摄需要识别的那一笔交易：日期 | 交易说明 | 金额。PDF 最多自动识别前 8 页。
          </p>
        </div>
      )}

      {stage === 'working' && (
        <div className="mt-8 flex flex-col items-center gap-3">
          {preview ? (
            <img src={preview} alt="待识别的交易" className="max-h-52 rounded-lg border border-border" />
          ) : (
            <div className="flex h-32 w-44 items-center justify-center rounded-lg border border-border bg-muted">
              <FileText className="h-10 w-10 text-muted-foreground" />
            </div>
          )}
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
          <p className="text-sm font-medium">
            {statusText || '正在识别文字…'} {progress > 0 && statusText.includes('识别') ? `${progress}%` : ''}
          </p>
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
              setPreview('');
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
        onChange={(e) => {
          if (e.target.files?.[0]) handleFile(e.target.files[0]);
          e.target.value = '';
        }}
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
