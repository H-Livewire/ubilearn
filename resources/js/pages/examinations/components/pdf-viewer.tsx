import { LoaderCircle, Minus, Plus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useT } from '@/lib/i18n';

type PdfDoc = import('pdfjs-dist').PDFDocumentProxy;

/** True when the browser cannot show a PDF inside an iframe (most phones). */
export function needsPdfJs(): boolean {
   if (typeof window === 'undefined') {
      return false;
   }

   const nav = navigator as Navigator & { pdfViewerEnabled?: boolean };

   return nav.pdfViewerEnabled !== true || window.innerWidth < 768;
}

function PageCanvas({
   pdf,
   number,
   width,
   zoom,
}: {
   pdf: PdfDoc;
   number: number;
   width: number;
   zoom: number;
}) {
   const holder = useRef<HTMLDivElement>(null);
   const canvas = useRef<HTMLCanvasElement>(null);
   const [visible, setVisible] = useState(number <= 2);
   const [height, setHeight] = useState(Math.round(width * 1.41 * zoom));
   const [done, setDone] = useState(false);

   useEffect(() => {
      if (visible || !holder.current) {
         return;
      }

      const observer = new IntersectionObserver(
         (entries) => {
            if (entries.some((entry) => entry.isIntersecting)) {
               setVisible(true);
               observer.disconnect();
            }
         },
         { rootMargin: '600px' },
      );
      observer.observe(holder.current);

      return () => observer.disconnect();
   }, [visible]);

   useEffect(() => {
      if (!visible || !canvas.current || width <= 0) {
         return;
      }

      let cancelled = false;
      let task: { cancel: () => void; promise: Promise<unknown> } | undefined;
      void (async () => {
         try {
            const page = await pdf.getPage(number);
            const base = page.getViewport({ scale: 1 });
            const cssWidth = width * zoom;
            const ratio = Math.min(window.devicePixelRatio || 1, 2);
            const viewport = page.getViewport({
               scale: (cssWidth / base.width) * ratio,
            });
            const target = canvas.current;

            if (cancelled || !target) {
               return;
            }

            target.width = Math.floor(viewport.width);
            target.height = Math.floor(viewport.height);
            target.style.width = `${cssWidth}px`;
            target.style.height = `${(viewport.height / ratio).toFixed(1)}px`;
            setHeight(Math.round(viewport.height / ratio));
            task = page.render({ canvas: target, viewport });
            await task.promise;

            if (!cancelled) {
               setDone(true);
            }
         } catch {
            // Rendering was cancelled by a zoom change; ignore.
         }
      })();

      return () => {
         cancelled = true;
         task?.cancel();
      };
   }, [pdf, number, width, zoom, visible]);

   return (
      <div
         ref={holder}
         className="relative mx-auto mb-3 bg-white shadow-sm"
         style={{ width: width * zoom, minHeight: height }}
      >
         <canvas ref={canvas} className="block" />
         {!done && (
            <div className="absolute inset-0 flex items-center justify-center text-emerald-700">
               <LoaderCircle className="h-6 w-6 animate-spin motion-reduce:animate-none" />
            </div>
         )}
      </div>
   );
}

/** Scrollable pdf.js reader: every page is drawn on a canvas so it works on phones. */
export default function PdfViewer({ url, title }: { url: string; title: string }) {
   const t = useT();
   const box = useRef<HTMLDivElement>(null);
   const [pdf, setPdf] = useState<PdfDoc | null>(null);
   const [error, setError] = useState(false);
   const [width, setWidth] = useState(0);
   const [zoom, setZoom] = useState(1);

   useEffect(() => {
      const element = box.current;

      if (!element) {
         return;
      }

      const measure = () => setWidth(Math.floor(element.clientWidth - 16));
      measure();
      const observer = new ResizeObserver(measure);
      observer.observe(element);

      return () => observer.disconnect();
   }, []);

   useEffect(() => {
      let disposed = false;
      let destroy: (() => void) | undefined;
      setPdf(null);
      setError(false);
      void (async () => {
         try {
            const pdfjs = await import('pdfjs-dist');
            const worker =
               await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
            pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
            const task = pdfjs.getDocument({
               url,
               standardFontDataUrl: '/assets/exam-import/pdfjs/standard_fonts/',
               cMapUrl: '/assets/exam-import/pdfjs/cmaps/',
               cMapPacked: true,
               wasmUrl: '/assets/exam-import/pdfjs/wasm/',
            });
            destroy = () => void task.destroy();
            const doc = await task.promise;

            if (disposed) {
               void task.destroy();

               return;
            }

            setPdf(doc);
         } catch {
            if (!disposed) {
               setError(true);
            }
         }
      })();

      return () => {
         disposed = true;
         destroy?.();
      };
   }, [url]);

   return (
      <div className="rounded-lg border bg-muted/40">
         <div className="flex items-center justify-between gap-2 border-b px-3 py-2 text-sm">
            <span className="text-muted-foreground">
               {pdf ? `${pdf.numPages} ${t('pages')}` : ''}
            </span>
            <div className="flex items-center gap-1">
               <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className="h-8 w-8"
                  aria-label={t('Zoom out')}
                  disabled={zoom <= 1}
                  onClick={() => setZoom((v) => Math.max(1, v - 0.5))}
               >
                  <Minus className="h-4 w-4" />
               </Button>
               <span className="w-12 text-center tabular-nums">
                  {Math.round(zoom * 100)}%
               </span>
               <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className="h-8 w-8"
                  aria-label={t('Zoom in')}
                  disabled={zoom >= 3}
                  onClick={() => setZoom((v) => Math.min(3, v + 0.5))}
               >
                  <Plus className="h-4 w-4" />
               </Button>
            </div>
         </div>
         <div
            ref={box}
            role="document"
            aria-label={title}
            className="h-[75vh] overflow-auto p-2"
         >
            {error && (
               <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-sm">
                  <p>{t('Could not load the PDF.')}</p>
                  <Button asChild>
                     <a href={url} target="_blank" rel="noreferrer">
                        {t('Open')}
                     </a>
                  </Button>
               </div>
            )}
            {!error && !pdf && (
               <div className="flex h-full items-center justify-center text-emerald-700">
                  <LoaderCircle className="h-8 w-8 animate-spin motion-reduce:animate-none" />
               </div>
            )}
            {pdf &&
               width > 0 &&
               Array.from({ length: pdf.numPages }, (_, index) => (
                  <PageCanvas
                     key={`${url}-${index + 1}`}
                     pdf={pdf}
                     number={index + 1}
                     width={width}
                     zoom={zoom}
                  />
               ))}
         </div>
      </div>
   );
}
