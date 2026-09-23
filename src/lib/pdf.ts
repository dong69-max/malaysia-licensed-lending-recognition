/**
 * 浏览器端 PDF 读取：全程在本机完成，不上传任何文件。
 * - 文字版 PDF：直接读取页面内嵌文字（快而准），无需渲染
 * - 扫描版 PDF（图片页）：尝试把页面渲染成图片交给 OCR；
 *   部分浏览器不支持时优雅降级，由界面提示改用截图
 *
 * PDF 引擎（主库 + worker）成对从官方 CDN 加载同一版本，
 * 只下载代码，文档内容不会离开浏览器。
 */

export interface PdfPageResult {
  pageNumber: number;
  /** 文字版 PDF 直接读出的文字；扫描版为空字符串 */
  text: string;
  /** 页面渲染成的 PNG dataURL（用于 OCR 与预览）；无法渲染时为空字符串 */
  image: string;
}

export interface ReadPdfOptions {
  /** 最多处理多少页，默认 8 */
  maxPages?: number;
  /** 渲染倍率，默认 2（兼顾清晰度与手机内存） */
  scale?: number;
  /** 每页处理后的回调（页码从 1 开始） */
  onPage?: (pageNumber: number, totalPages: number) => void;
}

type PdfjsModule = typeof import('pdfjs-dist');

const PDFJS_VERSION = '5.4.296';
const CDN_BASES = [
  `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}`,
  `https://unpkg.com/pdfjs-dist@${PDFJS_VERSION}`,
];

/** 单页渲染超时（毫秒）：卡住就放弃渲染，只保留文字 */
const RENDER_TIMEOUT_MS = 15000;

let cached: Promise<{ mod: PdfjsModule; base: string }> | null = null;

/**
 * 生成一个同源的 worker 入口（内容只有一句 import），
 * 交给引擎自己启动后台进程，避免跨域限制。
 */
function makeWorkerEntry(workerUrl: string): string {
  const code = `import "${workerUrl}";`;
  return URL.createObjectURL(new Blob([code], { type: 'text/javascript' }));
}

async function loadFromCdn(base: string): Promise<{ mod: PdfjsModule; base: string }> {
  // 运行时拼接的地址 + @vite-ignore，让浏览器直接从 CDN 加载
  const mainUrl = `${base}/build/pdf.min.mjs`;
  const mod = (await import(/* @vite-ignore */ mainUrl)) as PdfjsModule;
  if (!mod?.getDocument) throw new Error('CDN_PDFJS_INVALID');
  mod.GlobalWorkerOptions.workerSrc = makeWorkerEntry(`${base}/build/pdf.worker.min.mjs`);
  return { mod, base };
}

function loadPdfjs(): Promise<{ mod: PdfjsModule; base: string }> {
  if (cached) return cached;
  cached = (async () => {
    for (const base of CDN_BASES) {
      try {
        return await loadFromCdn(base);
      } catch {
        // 换下一个 CDN
      }
    }
    // 最后回退：应用内打包的主库（worker 仍用 CDN 同源入口）
    const local = await import('pdfjs-dist');
    local.GlobalWorkerOptions.workerSrc = makeWorkerEntry(
      `${CDN_BASES[0]}/build/pdf.worker.min.mjs`,
    );
    return { mod: local, base: CDN_BASES[0] };
  })();
  return cached;
}

/** 渲染一页；失败或超时返回空字符串，不让整个流程卡死 */
async function renderPageSafe(page: import('pdfjs-dist').PDFPageProxy, scale: number): Promise<string> {
  try {
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    await Promise.race([
      page.render({ canvas, viewport }).promise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('RENDER_TIMEOUT')), RENDER_TIMEOUT_MS)),
    ]);
    return canvas.toDataURL('image/png');
  } catch {
    return '';
  }
}

export async function readPdf(file: File, opts: ReadPdfOptions = {}): Promise<PdfPageResult[]> {
  const { maxPages = 8, scale = 2, onPage } = opts;

  const { mod: pdfjs, base } = await loadPdfjs();

  const raw = await file.arrayBuffer();
  const doc = await pdfjs
    .getDocument({
      data: raw,
      // 标准字体与 CMap 也从同一 CDN 加载
      cMapUrl: `${base}/cmaps/`,
      cMapPacked: true,
      standardFontDataUrl: `${base}/standard_fonts/`,
    })
    .promise;
  const totalPages = Math.min(doc.numPages, maxPages);
  const results: PdfPageResult[] = [];

  for (let i = 1; i <= totalPages; i++) {
    onPage?.(i, totalPages);
    const page = await doc.getPage(i);

    // 1) 读取页面内嵌文字（文字版 PDF 到此即完成）
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    // 2) 文字太少（扫描版）才渲染成图片供 OCR 使用
    let image = '';
    if (needsOcr(text)) {
      image = await renderPageSafe(page, scale);
    }

    results.push({ pageNumber: i, text, image });
    page.cleanup();
  }

  return results;
}

/** 合并多页文字：OCR 文字优先，去掉空页，按换行拼接 */
export function mergePageTexts(pages: { text: string; ocrText?: string }[]): string {
  return pages
    .map((p) => (p.ocrText && p.ocrText.trim() ? p.ocrText : p.text))
    .map((t) => (t || '').trim())
    .filter((t) => t.length > 0)
    .join('\n');
}

/** 一页是否需要 OCR：内嵌文字太少视为扫描版 */
export function needsOcr(text: string): boolean {
  return (text || '').trim().length < 30;
}
