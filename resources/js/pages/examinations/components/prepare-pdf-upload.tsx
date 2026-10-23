import type { PDFDocumentProxy } from 'pdfjs-dist';
import { useEffect, useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { BrandingArea } from '../lib/prepare-pdf';
import CircularProgress from './circular-progress';

type Area = {
   page: number;
   x: number;
   y: number;
   width: number;
   height: number;
   all: boolean;
};
type Point = { x: number; y: number };
async function openPdf(bytes: Uint8Array) {
   const pdfjs = await import('pdfjs-dist');
   pdfjs.GlobalWorkerOptions.workerSrc = (
      await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
   ).default;
   const task = pdfjs.getDocument({
      data: bytes.slice(),
      standardFontDataUrl: '/assets/exam-import/pdfjs/standard_fonts/',
      cMapUrl: '/assets/exam-import/pdfjs/cmaps/',
      cMapPacked: true,
      wasmUrl: '/assets/exam-import/pdfjs/wasm/',
   });

   try {
      return {
         document: await task.promise,
         destroy: () => {
            void task.destroy();
         },
      };
   } catch (error) {
      await task.destroy();

      throw error;
   }
}
export default function PreparePdfUpload({
   id,
   label,
   existing,
   required,
   logoUrl,
   onChange,
   onPendingChange,
}: {
   id: string;
   label: string;
   existing: boolean;
   required: boolean;
   logoUrl: string;
   onChange: (file: File | null) => void;
   onPendingChange: (pending: boolean) => void;
}) {
   const [source, setSource] = useState<File | null>(null);
   const bytes = useRef<Uint8Array | null>(null);
   const original = useRef<PDFDocumentProxy | null>(null);
   const cleanup = useRef<(() => void)[]>([]);
   const job = useRef(0);
   const [document, setDocument] = useState<PDFDocumentProxy | null>(null);
   const canvas = useRef<HTMLCanvasElement>(null);
   const [page, setPage] = useState(1);
   const [areas, setAreas] = useState<Area[]>([]);
   const [start, setStart] = useState<Point | null>(null);
   const [end, setEnd] = useState<Point | null>(null);
   const [allPages, setAllPages] = useState(false);
   const [opacity, setOpacity] = useState(12);
   const [busy, setBusy] = useState(false);
   const [percent, setPercent] = useState(0);
   const [status, setStatus] = useState('');
   const [error, setError] = useState('');
   const [output, setOutput] = useState<File | null>(null);
   const [downloadUrl, setDownloadUrl] = useState('');
   const [accepted, setAccepted] = useState(false);
   const callbacks = useRef({ onChange, onPendingChange });
   useEffect(() => {
      callbacks.current = { onChange, onPendingChange };
   }, [onChange, onPendingChange]);
   useEffect(
      () => () => {
         job.current++;
         cleanup.current.forEach((destroy) => destroy());
      },
      [],
   );
   useEffect(() => {
      if (!document || !canvas.current) {
         return;
      }

      let cancelled = false;
      let render: { cancel: () => void; promise: Promise<void> } | undefined;
      void (async () => {
         try {
            const pdfPage = await document.getPage(page);

            if (cancelled || !canvas.current) {
               return;
            }

            const viewport = pdfPage.getViewport({
               scale: 900 / pdfPage.getViewport({ scale: 1 }).width,
            });
            const target = canvas.current;
            target.width = Math.ceil(viewport.width);
            target.height = Math.ceil(viewport.height);
            render = pdfPage.render({ canvas: target, viewport });
            await render.promise;
         } catch {
            if (!cancelled) {
               setError(
                  'PDF preview imeshindwa kuonekana. Chagua PDF nyingine.',
               );
            }
         }
      })();

      return () => {
         cancelled = true;
         render?.cancel();
      };
   }, [document, page]);
   function invalidate() {
      setOutput(null);
      setAccepted(false);
      callbacks.current.onChange(null);
      callbacks.current.onPendingChange(true);
      setDocument(original.current);
   }
   async function choose(file: File | null) {
      const token = ++job.current;
      setError('');
      setSource(file);
      setOutput(null);
      setAccepted(false);
      setAreas([]);
      setPage(1);
      setStart(null);
      setEnd(null);
      setDocument(null);
      bytes.current = null;
      original.current = null;
      callbacks.current.onChange(null);
      callbacks.current.onPendingChange(Boolean(file));

      if (!file) {
         setBusy(false);

         return;
      }

      if (
         !file.name.toLowerCase().endsWith('.pdf') ||
         file.size > 10 * 1024 * 1024
      ) {
         setError('Chagua PDF isiyozidi 10 MB.');
         setSource(null);
         callbacks.current.onPendingChange(false);

         return;
      }

      setBusy(true);
      setPercent(5);
      setStatus('Reading PDF…');

      try {
         const data = new Uint8Array(await file.arrayBuffer());
         const loaded = await openPdf(data);

         if (token !== job.current) {
            loaded.destroy();

            return;
         }

         if (loaded.document.numPages > 100) {
            loaded.destroy();

            throw new Error('Tumia PDF yenye kurasa zisizozidi 100.');
         }

         cleanup.current.forEach((destroy) => destroy());
         cleanup.current = [loaded.destroy];
         bytes.current = data;
         original.current = loaded.document;
         setDocument(loaded.document);
         setPercent(100);
         setStatus('Select branding areas, then Prepare');
      } catch (e) {
         if (token === job.current) {
            setError(e instanceof Error ? e.message : 'PDF haijafunguka.');
            setSource(null);
            callbacks.current.onPendingChange(false);
         }
      } finally {
         if (token === job.current) {
            setBusy(false);
         }
      }
   }
   const selection =
      start && end
         ? {
              x: Math.min(start.x, end.x),
              y: Math.min(start.y, end.y),
              width: Math.abs(start.x - end.x),
              height: Math.abs(start.y - end.y),
           }
         : null;
   function point(event: PointerEvent<HTMLDivElement>) {
      const box = canvas.current!.getBoundingClientRect();

      return {
         x: Math.max(0, Math.min(1, (event.clientX - box.left) / box.width)),
         y: Math.max(0, Math.min(1, (event.clientY - box.top) / box.height)),
      };
   }
   async function prepare() {
      if (!bytes.current || !original.current || busy) {
         return;
      }

      const token = ++job.current;
      setBusy(true);
      setError('');
      setOutput(null);
      setAccepted(false);
      callbacks.current.onPendingChange(true);
      callbacks.current.onChange(null);

      try {
         const mapped: BrandingArea[] = [];

         for (let number = 1; number <= original.current.numPages; number++) {
            const pdfPage = await original.current.getPage(number);
            const viewport = pdfPage.getViewport({ scale: 1 });

            for (const area of areas.filter(
               (item) => item.all || item.page === number,
            )) {
               const [x1, y1] = viewport.convertToPdfPoint(
                  area.x * viewport.width,
                  area.y * viewport.height,
               );
               const [x2, y2] = viewport.convertToPdfPoint(
                  (area.x + area.width) * viewport.width,
                  (area.y + area.height) * viewport.height,
               );
               mapped.push({
                  page: number,
                  x: Math.min(x1, x2),
                  y: Math.min(y1, y2),
                  width: Math.abs(x2 - x1),
                  height: Math.abs(y2 - y1),
               });
            }
         }

         setPercent(10);
         setStatus('Loading UbiLearn logo…');
         const response = await fetch(logoUrl);

         if (!response.ok) {
            throw new Error('UbiLearn logo haijapakia.');
         }

         const bitmap = await createImageBitmap(await response.blob());
         const brandCanvas = window.document.createElement('canvas');
         brandCanvas.width = bitmap.width;
         brandCanvas.height = bitmap.height;
         brandCanvas.getContext('2d')!.drawImage(bitmap, 0, 0);
         bitmap.close();
         const blob = await new Promise<Blob>((resolve, reject) =>
            brandCanvas.toBlob(
               (value) =>
                  value
                     ? resolve(value)
                     : reject(new Error('Logo conversion failed.')),
               'image/png',
            ),
         );
         const { preparePaperPdf } = await import('../lib/prepare-pdf');
         const result = await preparePaperPdf(
            bytes.current,
            new Uint8Array(await blob.arrayBuffer()),
            mapped,
            opacity / 100,
            (value, message) => {
               if (token === job.current) {
                  setPercent(value);
                  setStatus(message);
               }
            },
            () => token !== job.current,
         );
         const loaded = await openPdf(result);

         if (token !== job.current) {
            loaded.destroy();

            return;
         }

         cleanup.current.push(loaded.destroy);
         setDocument(loaded.document);
         setPage(1);
         setStart(null);
         setEnd(null);
         const prepared = new File(
            [result.slice().buffer],
            source!.name.replace(/\.pdf$/i, '-ubilearn.pdf'),
            { type: 'application/pdf' },
         );
         const url = URL.createObjectURL(prepared);
         cleanup.current.push(() => URL.revokeObjectURL(url));
         setDownloadUrl(url);
         setOutput(prepared);
         setStatus('Ready — review PDF, then use it');
      } catch (e) {
         if (token === job.current) {
            setError(
               e instanceof Error ? e.message : 'PDF preparation failed.',
            );
         }
      } finally {
         if (token === job.current) {
            setBusy(false);
         }
      }
   }

   return (
      <div className="space-y-4 rounded-xl border p-4">
         <Label htmlFor={id}>{label}</Label>
         <Input
            id={id}
            type="file"
            accept="application/pdf,.pdf"
            required={required && !existing}
            disabled={busy}
            onChange={(event) => {
               void choose(event.target.files?.[0] || null);
            }}
         />
         {existing && !source && (
            <p className="text-xs text-emerald-700">
               PDF ipo. Chagua nyingine kuibadilisha.
            </p>
         )}
         {source && (
            <div className="space-y-4">
               <div className="flex flex-wrap items-center gap-3">
                  <Label htmlFor={`${id}-opacity`}>
                     Watermark opacity: {opacity}%
                  </Label>
                  <input
                     id={`${id}-opacity`}
                     type="range"
                     min="3"
                     max="25"
                     value={opacity}
                     disabled={busy}
                     onChange={(event) => {
                        setOpacity(Number(event.target.value));
                        invalidate();
                     }}
                  />
               </div>
               {!output && (
                  <>
                     <p className="text-xs text-muted-foreground">
                        Drag kwenye preview kuchagua branding ya kufunika.
                        Maeneo mengine hayatabadilishwa. Hii ni visual cover, si
                        kufuta taarifa za siri ndani ya PDF.
                     </p>
                     <label className="flex items-center gap-2 text-xs">
                        <input
                           type="checkbox"
                           checked={allPages}
                           disabled={busy}
                           onChange={(event) =>
                              setAllPages(event.target.checked)
                           }
                        />
                        Eneo hili kwenye kurasa zote
                     </label>
                  </>
               )}
               <div className="flex flex-wrap items-center gap-2">
                  <Button
                     type="button"
                     size="sm"
                     variant="outline"
                     disabled={busy || page <= 1}
                     onClick={() => {
                        setPage(page - 1);
                        setStart(null);
                        setEnd(null);
                     }}
                  >
                     Previous
                  </Button>
                  <span className="text-xs">
                     {page} / {document?.numPages || '…'}
                  </span>
                  <Button
                     type="button"
                     size="sm"
                     variant="outline"
                     disabled={busy || !document || page >= document.numPages}
                     onClick={() => {
                        setPage(page + 1);
                        setStart(null);
                        setEnd(null);
                     }}
                  >
                     Next
                  </Button>
               </div>
               {document && (
                  <div
                     className="relative mx-auto w-fit max-w-full touch-none select-none"
                     onPointerDown={(event) => {
                        if (busy || output || !canvas.current) {
                           return;
                        }

                        event.preventDefault();
                        event.currentTarget.setPointerCapture(event.pointerId);
                        const value = point(event);
                        setStart(value);
                        setEnd(value);
                     }}
                     onPointerMove={(event) => {
                        if (
                           event.currentTarget.hasPointerCapture(
                              event.pointerId,
                           )
                        ) {
                           setEnd(point(event));
                        }
                     }}
                     onPointerUp={(event) => {
                        if (
                           event.currentTarget.hasPointerCapture(
                              event.pointerId,
                           )
                        ) {
                           event.currentTarget.releasePointerCapture(
                              event.pointerId,
                           );
                        }
                     }}
                     onPointerCancel={() => {
                        setStart(null);
                        setEnd(null);
                     }}
                  >
                     <canvas
                        ref={canvas}
                        role="img"
                        aria-label={`${label} page ${page} preview`}
                        className="block h-auto max-h-[70vh] w-auto max-w-full border bg-white"
                     />
                     {!output &&
                        areas
                           .filter((area) => area.all || area.page === page)
                           .map((area, index) => (
                              <div
                                 key={index}
                                 className="pointer-events-none absolute border-2 border-emerald-600 bg-emerald-500/15"
                                 style={{
                                    left: `${area.x * 100}%`,
                                    top: `${area.y * 100}%`,
                                    width: `${area.width * 100}%`,
                                    height: `${area.height * 100}%`,
                                 }}
                              />
                           ))}
                     {!output && selection && (
                        <div
                           className="pointer-events-none absolute border-2 border-dashed border-emerald-600 bg-emerald-500/10"
                           style={{
                              left: `${selection.x * 100}%`,
                              top: `${selection.y * 100}%`,
                              width: `${selection.width * 100}%`,
                              height: `${selection.height * 100}%`,
                           }}
                        />
                     )}
                  </div>
               )}
               {!output && (
                  <div className="flex flex-wrap gap-2">
                     <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={
                           busy ||
                           !selection ||
                           selection.width < 0.005 ||
                           selection.height < 0.005
                        }
                        onClick={() => {
                           if (selection) {
                              setAreas([
                                 ...areas,
                                 { ...selection, page, all: allPages },
                              ]);
                              setStart(null);
                              setEnd(null);
                              invalidate();
                           }
                        }}
                     >
                        Add branding area
                     </Button>
                     <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={busy || !document}
                        onClick={() => {
                           setAreas([
                              ...areas,
                              {
                                 page,
                                 x: 0,
                                 y: 0,
                                 width: 1,
                                 height: 0.12,
                                 all: allPages,
                              },
                           ]);
                           invalidate();
                        }}
                     >
                        Select header area (12%)
                     </Button>
                     <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={busy || !areas.length}
                        onClick={() => {
                           setAreas(areas.slice(0, -1));
                           invalidate();
                        }}
                     >
                        Undo area ({areas.length})
                     </Button>
                  </div>
               )}
               {busy && <CircularProgress value={percent} label={status} />}
               {output && !busy && (
                  <CircularProgress
                     value={100}
                     label={
                        accepted ? 'Prepared PDF selected for saving' : status
                     }
                     active={false}
                  />
               )}
               {error && (
                  <p role="alert" className="text-sm text-destructive">
                     {error}
                  </p>
               )}
               <div className="flex flex-wrap gap-2">
                  <Button
                     type="button"
                     disabled={busy || !document}
                     onClick={() => {
                        void prepare();
                     }}
                  >
                     {output ? 'Prepare again' : 'Prepare PDF'}
                  </Button>
                  {output && (
                     <>
                        <Button
                           type="button"
                           variant="outline"
                           disabled={busy || accepted}
                           onClick={() => {
                              callbacks.current.onChange(output);
                              callbacks.current.onPendingChange(false);
                              setAccepted(true);
                           }}
                        >
                           Use prepared PDF
                        </Button>
                        <Button
                           type="button"
                           variant="ghost"
                           onClick={() => {
                              invalidate();
                              setStart(null);
                              setEnd(null);
                           }}
                        >
                           Adjust branding
                        </Button>
                        <a
                           href={downloadUrl}
                           download={output.name}
                           className="inline-flex items-center px-3 text-sm underline"
                        >
                           Download preview
                        </a>
                     </>
                  )}
               </div>
            </div>
         )}
         {!source && error && (
            <p role="alert" className="text-sm text-destructive">
               {error}
            </p>
         )}
      </div>
   );
}
