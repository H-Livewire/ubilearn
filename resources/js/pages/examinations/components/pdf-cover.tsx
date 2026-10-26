import { FileText, LoaderCircle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useT } from '@/lib/i18n';

/** Browser-side fallback renders run two at a time so a long list never freezes the phone. */
let active = 0;
const waiting: Array<() => void> = [];
function limit(task: () => Promise<void>): Promise<void> {
   return new Promise((resolve) => {
      const start = () => {
         active += 1;
         void task().finally(() => {
            active -= 1;
            waiting.shift()?.();
            resolve();
         });
      };

      if (active < 2) {
         start();
      } else {
         waiting.push(start);
      }
   });
}

/** Render only the first page; native PDF embeds do not show covers on many phones. */
function RenderedCover({ id, title }: { id: number; title: string }) {
   const t = useT();
   const host = useRef<HTMLDivElement>(null);
   const canvas = useRef<HTMLCanvasElement>(null);
   const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(
      'loading',
   );
   useEffect(() => {
      let disposed = false;
      let cleanup: (() => void) | undefined;
      const observer = new IntersectionObserver(
         (entries) => {
            if (!entries.some((entry) => entry.isIntersecting)) {
               return;
            }

            observer.disconnect();
            void limit(async () => {
               try {
                  const pdfjs = await import('pdfjs-dist');
                  const worker =
                     await import('pdfjs-dist/build/pdf.worker.min.mjs?url');

                  if (disposed) {
                     return;
                  }

                  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
                  const task = pdfjs.getDocument({
                     url: `/examinations/${id}/files/question`,
                     standardFontDataUrl:
                        '/assets/exam-import/pdfjs/standard_fonts/',
                     cMapUrl: '/assets/exam-import/pdfjs/cmaps/',
                     cMapPacked: true,
                     wasmUrl: '/assets/exam-import/pdfjs/wasm/',
                  });
                  cleanup = () => {
                     void task.destroy();
                  };
                  const pdf = await task.promise;

                  if (disposed || !canvas.current) {
                     return;
                  }

                  const page = await pdf.getPage(1);

                  if (disposed || !canvas.current) {
                     return;
                  }

                  const base = page.getViewport({ scale: 1 });
                  const viewport = page.getViewport({
                     scale: 360 / base.width,
                  });
                  const target = canvas.current;
                  target.width = Math.ceil(viewport.width);
                  target.height = Math.ceil(viewport.height);
                  await page.render({ canvas: target, viewport }).promise;

                  if (!disposed) {
                     setStatus('ready');
                  }

                  await task.destroy();
                  cleanup = undefined;
               } catch {
                  if (!disposed) {
                     setStatus('error');
                  }
               }
            });
         },
         { rootMargin: '200px' },
      );

      if (host.current) {
         observer.observe(host.current);
      }

      return () => {
         disposed = true;
         observer.disconnect();
         cleanup?.();
      };
   }, [id]);

   return (
      <div
         ref={host}
         className="flex h-full w-full items-center justify-center bg-white p-2"
      >
         <canvas
            ref={canvas}
            role="img"
            aria-label={`First page of ${title}`}
            className={`max-h-full max-w-full object-contain ${status === 'ready' ? '' : 'hidden'}`}
         />
         {status !== 'ready' && (
            <div
               className="flex flex-col items-center gap-3 text-emerald-700"
               role="status"
            >
               {status === 'loading' ? (
                  <LoaderCircle className="h-7 w-7 animate-spin motion-reduce:animate-none" />
               ) : (
                  <FileText className="h-12 w-12" />
               )}
               <span className="px-3 text-center text-xs">
                  {status === 'loading'
                     ? t('Loading cover…')
                     : t('View PDF to open paper')}
               </span>
            </div>
         )}
      </div>
   );
}

/** Uses the pre-generated cover image (instant); renders from the PDF only if none exists yet. */
export default function PdfCover({
   id,
   title,
   coverV,
   priority = false,
}: {
   id: number;
   title: string;
   coverV?: string | null;
   priority?: boolean;
}) {
   const [failed, setFailed] = useState(false);

   // Papers without a stored cover get one built on the server at the first request.
   if (!failed) {
      return (
         <div className="flex h-full w-full items-center justify-center bg-white p-2">
            <img
               src={`/examinations/${id}/cover${coverV ? `?v=${coverV}` : ''}`}
               alt={`First page of ${title}`}
               loading={priority ? 'eager' : 'lazy'}
               fetchPriority={priority ? 'high' : 'auto'}
               decoding="async"
               className="max-h-full max-w-full object-contain"
               onError={() => setFailed(true)}
            />
         </div>
      );
   }

   return <RenderedCover id={id} title={title} />;
}
