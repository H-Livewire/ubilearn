import { Head, Link, router } from '@inertiajs/react';
import axios from 'axios';
import { useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { Worker } from 'tesseract.js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import DashboardLayout from '@/layouts/dashboard/layout';
import DiagramCrop from './diagram-crop';
type Image = { name: string; data: string; width?: number; height?: number };
type Question = {
   title: string;
   choices: string[];
   correct: number | null;
   marks: number;
   image: string | null;
};
export default function ImportExam({
   exam,
   drafts = [],
}: {
   exam: { id: number; title: string } | null;
   drafts?: { id: number; title: string }[];
}) {
   const [selectedId, setSelectedId] = useState(exam?.id ?? 0);
   const [file, setFile] = useState<File>();
   const [progress, setProgress] = useState(0);
   const activeExam = exam ?? drafts.find((draft) => draft.id === selectedId);
   const [questions, setQuestions] = useState<Question[]>([]);
   const [images, setImages] = useState<Image[]>([]);
   const originalImages = useRef<Image[]>([]);
   const [brandImage, setBrandImage] = useState(0);
   const [text, setText] = useState('');
   const [status, setStatus] = useState('');
   const [error, setError] = useState('');
   const [busy, setBusy] = useState(false);
   const [reviewed, setReviewed] = useState(false);
   const base = exam
      ? `/dashboard/exams/${exam.id}/import`
      : '/dashboard/exam-import';
   async function stage(percent: number, label: string) {
      setProgress(percent);
      setStatus(label);
      await new Promise<void>((resolve) =>
         requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );
   }
   function change(index: number, patch: Partial<Question>) {
      setQuestions((items) =>
         items.map((q, i) => (i === index ? { ...q, ...patch } : q)),
      );
      setReviewed(false);
   }
   async function parseText(value: string) {
      const { data } = await axios.post(`${base}/parse`, { text: value });
      setQuestions(data.questions);

      if (!data.questions.length) {
         setError(
            'Numbering haijatambuliwa. Rekebisha text iwe 1. Swali, kisha A) B) choices, au ongeza swali mwenyewe.',
         );
      }
   }
   async function importFile(file?: File) {
      if (!file) {
         return;
      }

      setBusy(true);
      setError('');
      setReviewed(false);
      setQuestions([]);
      setImages([]);
      await stage(10, 'Preparing file...');

      try {
         if (file.size > 10 * 1024 * 1024) {
            throw new Error('Document iwe chini ya 10 MB.');
         }

         await stage(35, 'Loading UbiLearn logo...');
         const brand = new Image();
         await new Promise<void>((resolve, reject) => {
            brand.onload = () => resolve();
            brand.onerror = () =>
               reject(new Error('UbiLearn logo could not load.'));
            brand.src = '/assets/icons/ubi-learn-logo-v2.png';
         });

         if (file.name.toLowerCase().endsWith('.docx')) {
            const form = new FormData();
            form.append('document', file);
            const { data } = await axios.post(`${base}/extract`, form, {
               onUploadProgress: (event) => {
                  if (event.total) {
                     setProgress(
                        35 + Math.round((event.loaded / event.total) * 25),
                     );
                  }
               },
            });
            await stage(65, 'Processing questions...');
            setText(data.text);
            setImages(data.images);
            originalImages.current = data.images;
            setQuestions(data.questions);

            if (!data.questions.length) {
               setError(
                  'Kagua numbering kwenye text, au ongeza maswali mwenyewe.',
               );
            }
         } else if (file.name.toLowerCase().endsWith('.pdf')) {
            const pdfjs = await import('pdfjs-dist');
            const workerUrl = (
               await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
            ).default;
            pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
            const loadingTask = pdfjs.getDocument({
               data: await file.arrayBuffer(),
               standardFontDataUrl: '/assets/exam-import/pdfjs/standard_fonts/',
               cMapUrl: '/assets/exam-import/pdfjs/cmaps/',
               cMapPacked: true,
               wasmUrl: '/assets/exam-import/pdfjs/wasm/',
            });
            const pdf = await loadingTask.promise;
            let worker: Worker | undefined;

            try {
               if (pdf.numPages > 30) {
                  throw new Error('Import hadi kurasa 30 kwa document moja.');
               }

               await stage(65, 'Processing questions and page previews...');
               const pageImages: Image[] = [];
               const texts: string[] = [];

               for (let n = 1; n <= pdf.numPages; n++) {
                  setProgress(65 + Math.round(((n - 1) / pdf.numPages) * 20));
                  setStatus(`Processing page ${n}/${pdf.numPages}...`);
                  const page = await pdf.getPage(n);
                  const content = await page.getTextContent();
                  const lines = new Map<
                     number,
                     { x: number; text: string }[]
                  >();

                  for (const item of content.items) {
                     if ('str' in item) {
                        const y = Math.round(item.transform[5]);
                        const list = lines.get(y) ?? [];
                        list.push({ x: item.transform[4], text: item.str });
                        lines.set(y, list);
                     }
                  }

                  let pageText = [...lines.entries()]
                     .sort((a, b) => b[0] - a[0])
                     .map(([, items]) =>
                        items
                           .sort((a, b) => a.x - b.x)
                           .map((item) => item.text)
                           .join('  '),
                     )
                     .join('\n');
                  const original = page.getViewport({ scale: 1 });
                  const viewport = page.getViewport({
                     scale: Math.min(
                        1.5,
                        1800 / original.width,
                        1800 / original.height,
                     ),
                  });
                  const canvas = document.createElement('canvas');
                  canvas.width = viewport.width;
                  canvas.height = viewport.height;
                  await page.render({ canvas, viewport }).promise;

                  if (pageText.trim().length < 20) {
                     setStatus(`OCR: ukurasa ${n}/${pdf.numPages}…`);
                     worker ??= await (
                        await import('tesseract.js')
                     ).createWorker('eng', 1, {
                        workerPath: '/assets/exam-import/ocr/worker.min.js',
                        corePath:
                           '/assets/exam-import/ocr/tesseract-core-lstm.wasm.js',
                        langPath: '/assets/exam-import/ocr/langs',
                        gzip: false,
                     });
                     const result = await worker.recognize(canvas);
                     pageText = result.data.text;
                  }

                  texts.push(pageText);
                  pageImages.push({
                     name: `Ukurasa ${n}`,
                     width: original.width,
                     height: original.height,
                     data: canvas.toDataURL('image/jpeg', 0.8),
                  });
                  page.cleanup();
               }

               const value = texts.join('\n');
               setText(value);
               setImages(pageImages);
               setProgress(90);
               setStatus('Finalizing setup...');
               await parseText(value);
            } finally {
               await worker?.terminate();
               await loadingTask.destroy();
            }
         } else {
            throw new Error(
               'Tumia PDF au DOCX. Kwa .doc ya zamani, save as DOCX kwanza.',
            );
         }

         await stage(90, 'Finalizing setup...');
         await stage(100, 'Ready!');
      } catch (e) {
         setStatus('Preparation failed');
         setError(
            axios.isAxiosError(e)
               ? Object.values(e.response?.data?.errors ?? {})
                    .flat()
                    .join(' ') ||
                    e.response?.data?.message ||
                    'Import imeshindikana.'
               : e instanceof Error
                 ? e.message
                 : 'Import imeshindikana.',
         );
      } finally {
         setBusy(false);
      }
   }
   async function downloadPrepared() {
      if (!file) {
         return;
      }

      setBusy(true);
      setError('');

      try {
         if (file.name.toLowerCase().endsWith('.pdf')) {
            const { jsPDF } = await import('jspdf');
            const pages = images.filter(
               (image) =>
                  image.name.startsWith('Ukurasa ') &&
                  image.width &&
                  image.height,
            );

            if (!pages.length) {
               throw new Error('Prepare PDF kwanza.');
            }

            const first = pages[0];
            const output = new jsPDF({
               unit: 'pt',
               format: [first.width!, first.height!],
               orientation:
                  first.width! > first.height! ? 'landscape' : 'portrait',
            });
            pages.forEach((page, i) => {
               if (i) {
                  output.addPage(
                     [page.width!, page.height!],
                     page.width! > page.height! ? 'landscape' : 'portrait',
                  );
               }

               output.addImage(
                  page.data,
                  'JPEG',
                  0,
                  0,
                  page.width!,
                  page.height!,
               );
            });
            output.save('UbiLearn-' + file.name);
         } else {
            const replacements = images.filter((image) =>
               originalImages.current.some(
                  (original) =>
                     original.name === image.name &&
                     original.data !== image.data,
               ),
            );
            const form = new FormData();
            form.append('document', file);
            replacements.forEach((image, i) => {
               form.append(`replacements[${i}][name]`, image.name);
               form.append(`replacements[${i}][data]`, image.data);
            });
            const response = await axios.post(
               '/dashboard/exam-import/brand-docx',
               form,
               { responseType: 'blob' },
            );
            const url = URL.createObjectURL(response.data);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'UbiLearn-' + file.name;
            link.click();
            URL.revokeObjectURL(url);
         }
      } catch (error) {
         setError(
            error instanceof Error
               ? error.message
               : 'Prepared file download failed.',
         );
      } finally {
         setBusy(false);
      }
   }

   function save() {
      if (!activeExam) {
         setError('Chagua draft ya kuhifadhi maswali.');

         return;
      }

      setBusy(true);
      setError('');
      const selectedImages = [
         ...new Set(
            questions
               .map((q) => q.image)
               .filter((image): image is string => Boolean(image)),
         ),
      ];
      router.post(
         `/dashboard/exams/${activeExam.id}/import`,
         {
            questions: questions.map((q) => ({
               ...q,
               image: q.image ? selectedImages.indexOf(q.image) : null,
            })),
            images: selectedImages,
            reviewed,
         },
         {
            onError: (errors) => setError(Object.values(errors).join(' ')),
            onFinish: () => setBusy(false),
         },
      );
   }

   return (
      <>
         <Head title="Import online exam" />
         <main className="mx-auto max-w-5xl space-y-5 p-4 sm:p-6">
            <Link
               href={
                  exam
                     ? `/dashboard/exams/${exam.id}/edit?tab=questions`
                     : '/dashboard/exams'
               }
               className="text-sm underline"
            >
               ← {exam?.title ?? 'Online exams'}
            </Link>
            <h1 className="text-2xl font-bold">Import PDF / Word</h1>
            <p className="text-sm text-muted-foreground">
               Import → kagua maswali, choices, marks na diagrams → hifadhi
               draft → publish.
            </p>
            <div className="rounded-xl border bg-card p-5">
               <Label htmlFor="document">PDF / DOCX · hadi 10 MB</Label>
               <Input
                  id="document"
                  className="mt-2"
                  type="file"
                  accept=".pdf,.docx"
                  disabled={busy}
                  onChange={(e) => {
                     setFile(e.target.files?.[0]);
                     setProgress(0);
                     setStatus('');
                     setQuestions([]);
                     setImages([]);
                     setText('');
                     setError('');
                  }}
               />
               <Button
                  className="mt-3 bg-black text-white hover:bg-black/85"
                  disabled={busy || !file}
                  onClick={() => importFile(file)}
               >
                  {busy ? 'Preparing…' : 'Prepare'}
               </Button>
               <p className="mt-2 text-sm text-muted-foreground">
                  Scanned PDF hutumia OCR. Kagua equations na maandishi; OCR
                  inaweza kukosea.
               </p>
            </div>
            {status && (
               <div
                  className="space-y-2 rounded-xl border bg-card p-4"
                  role="status"
                  aria-live="polite"
               >
                  <div className="flex justify-between text-sm font-semibold">
                     <span>{status}</span>
                     <span>{progress}%</span>
                  </div>
                  <div
                     role="progressbar"
                     aria-label="Preparing exam"
                     aria-valuenow={progress}
                     aria-valuemin={0}
                     aria-valuemax={100}
                     className="h-2 overflow-hidden rounded-full bg-muted"
                  >
                     <div
                        className="h-full bg-primary transition-all duration-500"
                        style={{ width: `${progress}%` }}
                     />
                  </div>
               </div>
            )}
            {!exam && (
               <div className="space-y-2 rounded-xl border p-4">
                  <Label htmlFor="draft">Draft ya kuhifadhi maswali</Label>
                  <select
                     id="draft"
                     className="h-10 w-full rounded-md border bg-background px-3"
                     value={selectedId}
                     disabled={busy}
                     onChange={(e) => setSelectedId(Number(e.target.value))}
                  >
                     <option value={0}>Chagua draft</option>
                     {drafts.map((draft) => (
                        <option key={draft.id} value={draft.id}>
                           {draft.title}
                        </option>
                     ))}
                  </select>
                  <div className="flex gap-3 text-sm">
                     <a
                        href="/dashboard/exams/create"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline"
                     >
                        Create exam draft
                     </a>
                     <button
                        type="button"
                        className="underline"
                        onClick={() => router.reload({ only: ['drafts'] })}
                     >
                        Refresh drafts
                     </button>
                  </div>
               </div>
            )}
            {error && (
               <p role="alert" className="text-sm text-destructive">
                  {error}
               </p>
            )}
            {images.length > 0 && (
               <details className="rounded-xl border bg-card p-4">
                  <summary className="cursor-pointer font-semibold">
                     Badilisha logo kwenye page / picha
                  </summary>
                  <p className="my-3 text-sm text-muted-foreground">
                     Chagua page au picha ya logo. Replacement itaonekana kwenye
                     preview na diagrams unazotumia kwenye online exam.
                  </p>
                  <select
                     aria-label="Page ya logo"
                     className="mb-3 h-10 w-full rounded-md border bg-background px-3"
                     value={brandImage}
                     disabled={busy}
                     onChange={(e) => setBrandImage(Number(e.target.value))}
                  >
                     {images.map((image, i) => (
                        <option key={i} value={i}>
                           {image.name}
                        </option>
                     ))}
                  </select>
                  {images[brandImage] && (
                     <DiagramCrop
                        key={`${brandImage}-${images[brandImage].data.slice(-24)}`}
                        src={images[brandImage].data}
                        disabled={busy}
                        logo
                        onCrop={(value) => {
                           const previous = images[brandImage].data;
                           setImages((items) =>
                              items.map((image, i) =>
                                 i === brandImage
                                    ? { ...image, data: value }
                                    : image,
                              ),
                           );
                           setQuestions((items) =>
                              items.map((q) =>
                                 q.image === previous
                                    ? { ...q, image: value }
                                    : q,
                              ),
                           );
                           setReviewed(false);
                        }}
                     />
                  )}
               </details>
            )}
            {progress === 100 && (
               <Button
                  variant="outline"
                  disabled={busy}
                  onClick={downloadPrepared}
               >
                  Download prepared file
               </Button>
            )}
            {text && (
               <details className="rounded-lg border p-4">
                  <summary className="cursor-pointer font-semibold">
                     Text iliyopatikana
                  </summary>
                  <Textarea
                     value={text}
                     className="my-3 h-64"
                     onChange={(e) => setText(e.target.value)}
                  />
                  <Button
                     variant="outline"
                     disabled={busy}
                     onClick={async () => {
                        setBusy(true);
                        setError('');

                        try {
                           await parseText(text);
                           setReviewed(false);
                        } catch {
                           setError('Unable to parse text.');
                        } finally {
                           setBusy(false);
                        }
                     }}
                  >
                     Soma maswali tena
                  </Button>
               </details>
            )}
            <p className="text-sm text-muted-foreground">
               Chagua picha ya document kwa swali lenye diagram. Preview ya PDF
               page huhifadhi equations na vector diagrams pia.
            </p>
            {questions.map((q, i) => (
               <article
                  key={i}
                  className="space-y-3 rounded-xl border bg-card p-5"
               >
                  <div className="flex justify-between">
                     <h2 className="font-bold">Swali {i + 1}</h2>
                     <Button
                        variant="ghost"
                        disabled={busy}
                        onClick={() => {
                           setQuestions((items) =>
                              items.filter((_, n) => n !== i),
                           );
                           setReviewed(false);
                        }}
                     >
                        Ondoa
                     </Button>
                  </div>
                  <Textarea
                     aria-label={`Swali ${i + 1}`}
                     value={q.title}
                     disabled={busy}
                     onChange={(e) => change(i, { title: e.target.value })}
                  />
                  <div className="flex flex-wrap gap-3">
                     <div>
                        <Label>Marks</Label>
                        <Input
                           aria-label={`Marks swali ${i + 1}`}
                           type="number"
                           min="0.5"
                           step="0.5"
                           value={q.marks}
                           disabled={busy}
                           onChange={(e) =>
                              change(i, { marks: Number(e.target.value) })
                           }
                        />
                     </div>
                     <div className="min-w-48 flex-1">
                        <Label>Picha / Diagram</Label>
                        <select
                           className="h-10 w-full rounded-md border bg-background px-3"
                           disabled={busy}
                           value={images.findIndex(
                              (image) => image.data === q.image,
                           )}
                           onChange={(e) =>
                              change(i, {
                                 image:
                                    images[Number(e.target.value)]?.data ??
                                    null,
                              })
                           }
                        >
                           <option value={-1}>Hakuna</option>
                           {images.map((image, n) => (
                              <option key={n} value={n}>
                                 {image.name}
                              </option>
                           ))}
                        </select>
                     </div>
                  </div>
                  <Input
                     aria-label={`Upload diagram swali ${i + 1}`}
                     type="file"
                     accept="image/png,image/jpeg"
                     disabled={busy}
                     onChange={(event) => {
                        const file = event.target.files?.[0];

                        if (!file) {
                           return;
                        }

                        if (
                           file.size > 2 * 1024 * 1024 ||
                           !['image/png', 'image/jpeg'].includes(file.type)
                        ) {
                           setError('Diagram iwe PNG/JPEG chini ya 2 MB.');

                           return;
                        }

                        const reader = new FileReader();
                        reader.onload = () => {
                           if (typeof reader.result === 'string') {
                              const data = reader.result;
                              setImages((items) => [
                                 ...items,
                                 { name: file.name, data },
                              ]);
                              change(i, { image: data });
                           }
                        };
                        reader.readAsDataURL(file);
                     }}
                  />
                  {q.image && (
                     <DiagramCrop
                        src={q.image}
                        disabled={busy}
                        onCrop={(data) => {
                           setImages((items) => [
                              ...items,
                              { name: `Diagram swali ${i + 1}`, data },
                           ]);
                           change(i, { image: data });
                        }}
                     />
                  )}
                  {q.choices.map((choice, n) => (
                     <div key={n} className="flex items-center gap-3">
                        <input
                           aria-label={`Jibu sahihi ${n + 1}, swali ${i + 1}`}
                           type="radio"
                           name={`correct-${i}`}
                           checked={q.correct === n}
                           disabled={busy}
                           onChange={() => change(i, { correct: n })}
                        />
                        <Input
                           aria-label={`Choice ${n + 1}, swali ${i + 1}`}
                           value={choice}
                           disabled={busy}
                           onChange={(e) =>
                              change(i, {
                                 choices: q.choices.map((c, k) =>
                                    k === n ? e.target.value : c,
                                 ),
                              })
                           }
                        />
                        <Button
                           variant="ghost"
                           disabled={busy}
                           onClick={() =>
                              change(i, {
                                 choices: q.choices.filter((_, k) => k !== n),
                                 correct: null,
                              })
                           }
                        >
                           ×
                        </Button>
                     </div>
                  ))}
                  <Button
                     variant="outline"
                     disabled={busy || q.choices.length >= 8}
                     onClick={() =>
                        change(i, {
                           choices: [...q.choices, ''],
                           correct: null,
                        })
                     }
                  >
                     Ongeza choice
                  </Button>
                  {q.choices.length === 0 && (
                     <p className="text-sm text-muted-foreground">
                        Written answer — itasahihishwa manually.
                     </p>
                  )}
               </article>
            ))}
            <Button
               variant="outline"
               disabled={busy}
               onClick={() => {
                  setQuestions((q) => [
                     ...q,
                     {
                        title: '',
                        choices: [],
                        correct: null,
                        marks: 1,
                        image: null,
                     },
                  ]);
                  setReviewed(false);
               }}
            >
               Ongeza swali
            </Button>
            {questions.length > 0 && (
               <div className="space-y-3">
                  <label className="flex items-center gap-2 text-sm">
                     <input
                        type="checkbox"
                        checked={reviewed}
                        disabled={busy}
                        onChange={(e) => setReviewed(e.target.checked)}
                     />
                     Nimekagua maswali, majibu sahihi, marks na diagrams.
                  </label>
                  <Button
                     className="bg-black text-white hover:bg-black/85"
                     disabled={busy || !reviewed}
                     onClick={save}
                  >
                     {busy ? 'Inahifadhi…' : 'Hifadhi kwenye draft'}
                  </Button>
               </div>
            )}
         </main>
      </>
   );
}
ImportExam.layout = (page: ReactNode) => <DashboardLayout children={page} />;
