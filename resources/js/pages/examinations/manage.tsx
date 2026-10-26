import { Head, useForm, usePage } from '@inertiajs/react';
import {
   ChevronLeft,
   ChevronRight,
   ChevronsLeft,
   ChevronsRight,
   Eye,
   EllipsisVertical,
   ExternalLink,
   Globe,
   LoaderCircle,
   Pencil,
   Search,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogHeader,
   DialogTitle,
} from '@/components/ui/dialog';
import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
   Table,
   TableBody,
   TableCell,
   TableHead,
   TableHeader,
   TableRow,
} from '@/components/ui/table';
import DashboardLayout from '@/layouts/dashboard/layout';
import CircularProgress from './components/circular-progress';
import CoverBackfill from './components/cover-backfill';
import PreparePdfUpload from './components/prepare-pdf-upload';
import type { Paper, Page, Options } from './types';
const blank = {
   title: '',
   education: 'olevel',
   class_name: '',
   region: '',
   subject: '',
   year: '',
   exam_type: '',
   organizer: '',
   source_name: '',
   question_file: null as File | null,
   marking_file: null as File | null,
   published: true,
};
const BASE = '/dashboard/examination-papers';

export default function Manage({
   papers,
   missingCovers = [],
   total,
   filters,
   options,
}: {
   papers: Page<Paper>;
   missingCovers?: number[];
   total: number;
   filters: { q: string; per_page: number };
   options: Options;
}) {
   const [preview, setPreview] = useState<{
      paper: Paper;
      kind: 'question' | 'marking';
   } | null>(null);

   const [rows, setRows] = useState(papers);
   const [q, setQ] = useState(filters.q);
   const [perPage, setPerPage] = useState(filters.per_page);
   const [loading, setLoading] = useState(false);
   const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
   const request = useRef<AbortController | null>(null);

   useEffect(() => {
      setRows(papers);
   }, [papers]);

   // Live search: small JSON request, no page reload, previous request cancelled.
   function load(
      next: { q: string; per_page: number; page: number },
      delay = 0,
   ) {
      if (timer.current) {
         clearTimeout(timer.current);
      }

      timer.current = setTimeout(async () => {
         request.current?.abort();
         const controller = new AbortController();
         request.current = controller;
         setLoading(true);
         const query = new URLSearchParams();

         if (next.q.trim()) {
            query.set('q', next.q.trim());
         }

         query.set('per_page', String(next.per_page));

         if (next.page > 1) {
            query.set('page', String(next.page));
         }

         try {
            const response = await fetch(`${BASE}?${query}`, {
               headers: {
                  Accept: 'application/json',
                  'X-Requested-With': 'XMLHttpRequest',
               },
               credentials: 'same-origin',
               signal: controller.signal,
            });

            if (response.ok) {
               setRows(await response.json());
               window.history.replaceState(
                  window.history.state,
                  '',
                  `${BASE}?${query}`,
               );
            }
         } catch {
            // Aborted by a newer keystroke, or offline: keep the current rows.
         } finally {
            if (request.current === controller) {
               setLoading(false);
            }
         }
      }, delay);
   }
   function goto(page: number) {
      load({ q, per_page: perPage, page });
   }

   const { system } = usePage<SharedData>().props;
   const logoUrl =
      system?.fields?.logo_dark || '/assets/icons/ubi-learn-logo-v2.png';
   const [revision, setRevision] = useState(0);
   const [pending, setPending] = useState({
      question_file: false,
      marking_file: false,
   });
   const awaitingReview = pending.question_file || pending.marking_file;
   function clearUploads() {
      setRevision((value) => value + 1);
      setPending({ question_file: false, marking_file: false });
   }
   const formRef = useRef<HTMLFormElement>(null);
   const [id, setId] = useState<number | null>(null);
   const { data, setData, post, errors, processing, reset, progress } =
      useForm(blank);
   const fields: [keyof typeof blank, string][] = [
      ['title', 'Jina la mtihani'],
      ['subject', 'Somo'],
      ['year', 'Mwaka'],
      ['organizer', 'Shule / Mwandaaji'],
   ];
   const classOptions = options.classes?.[data.education] || {};
   function edit(p: Paper) {
      formRef.current?.reset();
      clearUploads();
      setId(p.id);
      setData({
         ...blank,
         ...Object.fromEntries(
            Object.keys(blank)
               .filter((k) => !k.endsWith('_file'))
               .map((k) => [k, p[k as keyof Paper] ?? '']),
         ),
         year: p.year ? String(p.year) : '',

         published: p.published,
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
   }

   return (
      <>
         <Head title="Past Papers" />
         <div className="mx-auto max-w-5xl space-y-6 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
               <h1 className="text-2xl font-bold">Past Papers</h1>
               <a
                  href="/examinations"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-emerald-700 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-800 hover:shadow-md focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2 focus-visible:outline-none"
               >
                  <Globe className="h-4 w-4" />
                  Ona catalogue
                  <ExternalLink className="h-3.5 w-3.5 opacity-80" />
               </a>
            </div>
            <CoverBackfill ids={missingCovers} />
            <form
               ref={formRef}
               className="rounded-lg border bg-card p-5"
               onSubmit={(e) => {
                  e.preventDefault();

                  if (awaitingReview || processing) {
return;
}

                  post(`/dashboard/examination-papers${id ? `/${id}` : ''}`, {
                     forceFormData: true,
                     preserveScroll: true,
                     onSuccess: () => {
                        formRef.current?.reset();
                        reset();
                        clearUploads();
                        setId(null);
                     },
                  });
               }}
            >
               <h2 className="mb-4 font-semibold">
                  {id ? 'Edit Past Paper' : 'Add Past Paper'}
               </h2>
               <div className="grid gap-4 sm:grid-cols-2">
                  {fields.map(([key, label]) => (
                     <div className="space-y-2" key={key}>
                        <Label htmlFor={key}>{label}</Label>
                        <Input
                           id={key}
                           required={['title', 'subject', 'year'].includes(key)}
                           type={
                              key === 'year'
                                 ? 'number'
                                 : key.endsWith('url')
                                   ? 'url'
                                   : 'text'
                           }
                           value={String(data[key])}
                           onChange={(e) => setData(key, e.target.value)}
                        />
                        {errors[key] && (
                           <p className="text-sm text-destructive">
                              {errors[key]}
                           </p>
                        )}
                     </div>
                  ))}
                  {(
                     [
                        ['education', 'Kiwango cha elimu', options.education],
                        ['class_name', 'Darasa / Class', classOptions],
                        [
                           'region',
                           'Mkoa',
                           Object.fromEntries(
                              options.regions.map((r) => [r, r]),
                           ),
                        ],
                        [
                           'exam_type',
                           'Aina',
                           Object.fromEntries(
                              options.types.map((r) => [
                                 r,
                                 (
                                    {
                                       Annual: 'Annual Examination',
                                       Mock: 'Mock Examination',
                                       Joint: 'Joint Examination',
                                       'Pre-NECTA': 'Pre-National Examination',
                                    } as Record<string, string>
                                 )[r] || r,
                              ]),
                           ),
                        ],
                     ] as [keyof typeof blank, string, Record<string, string>][]
                  ).map(([key, label, items]) => (
                     <div className="space-y-2" key={key}>
                        <Label htmlFor={key}>{label}</Label>
                        <select
                           id={key}
                           className="h-10 w-full rounded-md border bg-background px-3"
                           value={String(data[key])}
                           required={
                              (key === 'class_name' || key === 'exam_type') &&
                              data.education !== 'college'
                           }
                           onChange={(e) => {
                              if (key === 'education') {
                                 setData({
                                    ...data,
                                    education: e.target.value,
                                    class_name: '',
                                    region: '',
                                    exam_type:
                                       e.target.value === 'college'
                                          ? ''
                                          : data.exam_type,
                                 });
                              } else {
                                 setData(key, e.target.value);
                              }
                           }}
                        >
                           {key !== 'education' && (
                              <option value="">
                                 {key === 'class_name'
                                    ? 'Chagua darasa'
                                    : key === 'region'
                                      ? 'All regions / Kitaifa'
                                      : 'Chagua aina'}
                              </option>
                           )}
                           {key === 'class_name' &&
                              data.class_name &&
                              !items[data.class_name] && (
                                 <option value={data.class_name}>
                                    {data.class_name}
                                 </option>
                              )}
                           {Object.entries(items).map(([value, title]) => (
                              <option key={value} value={value}>
                                 {title}
                              </option>
                           ))}
                        </select>
                        {errors[key] && (
                           <p className="text-sm text-destructive">
                              {errors[key]}
                           </p>
                        )}
                     </div>
                  ))}
               </div>
               <div className="my-5 grid gap-4 sm:grid-cols-2">
                  {(
                     [
                        ['question_file', 'Question Paper PDF', 'has_pdf'],
                        [
                           'marking_file',
                           'Marking Scheme PDF (optional)',
                           'has_marking',
                        ],
                     ] as const
                  ).map(([key, label, flag]) => (
                     <div className="space-y-2" key={key}>
                        <PreparePdfUpload
                           key={`${key}-${revision}`}
                           id={key}
                           label={label}
                           existing={Boolean(
                              rows.data.find((p) => p.id === id)?.[flag],
                           )}
                           required={key === 'question_file'}
                           logoUrl={logoUrl}
                           onChange={(file) => setData(key, file)}
                           onPendingChange={(value) =>
                              setPending((current) => ({
                                 ...current,
                                 [key]: value,
                              }))
                           }
                        />
                        {errors[key] && (
                           <p className="text-sm text-destructive">
                              {errors[key]}
                           </p>
                        )}
                     </div>
                  ))}
               </div>
               {progress && (
                  <div className="mb-4">
                     <CircularProgress
                        value={progress.percentage || 0}
                        label="Uploading prepared PDFs…"
                     />
                  </div>
               )}
               {awaitingReview && (
                  <p role="status" className="mb-4 text-sm text-emerald-700">
                     Prepare and review selected PDFs, then click “Use prepared
                     PDF” before saving.
                  </p>
               )}
               <p className="mb-4 text-sm text-muted-foreground">
                  PDF tu · hadi 10 MB kwa faili.
               </p>
               <label className="mb-5 flex items-center gap-2 text-sm">
                  <input
                     type="checkbox"
                     checked={data.published}
                     onChange={(e) => setData('published', e.target.checked)}
                  />
                  Onyesha kwenye catalogue
               </label>
               <div className="flex gap-3">
                  <Button
                     disabled={processing || awaitingReview}
                     className="bg-black text-white hover:bg-black/85"
                  >
                     {processing ? 'Inahifadhi…' : 'Hifadhi'}
                  </Button>
                  {id && (
                     <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                           formRef.current?.reset();
                           reset();
                           clearUploads();
                           setId(null);
                        }}
                     >
                        Ghairi
                     </Button>
                  )}
               </div>
            </form>
            <div className="rounded-xl border bg-card shadow-sm">
               <div className="flex flex-wrap items-center justify-between gap-4 p-5">
                  <p className="font-semibold">
                     Jumla ya mitihani: {total}
                     {q.trim() && (
                        <span className="ml-2 text-sm font-normal text-muted-foreground">
                           · zilizopatikana {rows.total}
                        </span>
                     )}
                  </p>
                  <div className="flex items-center gap-4">
                     <div className="flex items-center gap-2 border-b">
                        <input
                           aria-label="Search past papers"
                           placeholder="Search past papers"
                           className="w-52 bg-transparent py-2 text-sm outline-none"
                           value={q}
                           onChange={(e) => {
                              setQ(e.target.value);
                              load(
                                 {
                                    q: e.target.value,
                                    per_page: perPage,
                                    page: 1,
                                 },
                                 120,
                              );
                           }}
                        />
                        <span className="p-2" aria-hidden="true">
                           {loading ? (
                              <LoaderCircle className="h-4 w-4 animate-spin motion-reduce:animate-none" />
                           ) : (
                              <Search className="h-4 w-4" />
                           )}
                        </span>
                     </div>
                     <select
                        aria-label="Idadi kwa ukurasa"
                        className="h-10 rounded-lg border bg-background px-2 text-sm"
                        value={perPage}
                        onChange={(e) => {
                           const size = Number(e.target.value);
                           setPerPage(size);
                           load({ q, per_page: size, page: 1 });
                        }}
                     >
                        {[10, 15, 20, 25].map((size) => (
                           <option key={size} value={size}>
                              {size}
                           </option>
                        ))}
                     </select>
                  </div>
               </div>
               <Table className="border-y">
                  <TableHeader>
                     <TableRow className="hover:bg-transparent">
                        {['Aina ya mtihani', 'Jina', 'Mkoa', 'Mwaka'].map(
                           (label) => (
                              <TableHead
                                 key={label}
                                 className="h-12 px-5 text-xs font-semibold tracking-wide text-muted-foreground uppercase"
                              >
                                 {label}
                              </TableHead>
                           ),
                        )}
                        <TableHead className="w-14 px-5" />
                     </TableRow>
                  </TableHeader>
                  <TableBody>
                     {rows.data.length ? (
                        rows.data.map((p) => (
                           <TableRow key={p.id} className="transition-colors hover:bg-muted/50">
                              <TableCell className="px-5 py-4 text-sm">
                                 {p.exam_type || '—'}
                              </TableCell>
                              <TableCell className="px-5 py-4">
                                 <div className="flex flex-wrap items-center gap-2">
                                    <p className="text-[15px] font-medium">
                                       {p.title}
                                    </p>
                                    <span
                                       className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${
                                          !p.has_pdf
                                             ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300'
                                             : p.published
                                               ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300'
                                               : 'bg-slate-100 text-slate-600 dark:bg-slate-500/20 dark:text-slate-300'
                                       }`}
                                    >
                                       {!p.has_pdf
                                          ? 'Inahitaji PDF'
                                          : p.published
                                            ? 'Published'
                                            : 'Hidden'}
                                    </span>
                                 </div>
                                 <p className="mt-1 text-xs text-muted-foreground">
                                    {[
                                       options.education[p.education],
                                       p.class_name,
                                       p.subject,
                                    ]
                                       .filter(Boolean)
                                       .join(' · ')}
                                 </p>
                              </TableCell>
                              <TableCell className="px-5 py-4 text-sm">
                                 {p.region || 'All regions'}
                              </TableCell>
                              <TableCell className="px-5 py-4 text-sm">
                                 {p.year || '—'}
                              </TableCell>
                              <TableCell className="px-5 py-4 text-right">
                                 <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                       <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8"
                                          aria-label="Chaguo"
                                       >
                                          <EllipsisVertical className="h-4 w-4" />
                                       </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                       {p.has_pdf && (
                                          <DropdownMenuItem
                                             onClick={() =>
                                                setPreview({
                                                   paper: p,
                                                   kind: 'question',
                                                })
                                             }
                                          >
                                             <Eye /> Preview
                                          </DropdownMenuItem>
                                       )}
                                       {p.has_marking && (
                                          <DropdownMenuItem
                                             onClick={() =>
                                                setPreview({
                                                   paper: p,
                                                   kind: 'marking',
                                                })
                                             }
                                          >
                                             <Eye /> Marking Scheme
                                          </DropdownMenuItem>
                                       )}
                                       <DropdownMenuItem onClick={() => edit(p)}>
                                          <Pencil /> Edit
                                       </DropdownMenuItem>
                                    </DropdownMenuContent>
                                 </DropdownMenu>
                              </TableCell>
                           </TableRow>
                        ))
                     ) : (
                        <TableRow>
                           <TableCell
                              colSpan={5}
                              className="h-28 text-center text-muted-foreground"
                           >
                              Hakuna mtihani uliopatikana
                           </TableCell>
                        </TableRow>
                     )}
                  </TableBody>
               </Table>
               <div className="flex flex-wrap items-center justify-between gap-3 p-5 text-sm">
                  <span className="text-muted-foreground">
                     Showing {rows.from || 0} to {rows.to || 0} of{' '}
                     {rows.total} entries
                  </span>
                  <div className="flex items-center gap-1">
                     <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        className="h-8 w-8"
                        disabled={rows.current_page <= 1}
                        onClick={() => goto(1)}
                     >
                        <ChevronsLeft className="h-4 w-4" />
                     </Button>
                     <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        className="h-8 w-8"
                        disabled={rows.current_page <= 1}
                        onClick={() => goto(rows.current_page - 1)}
                     >
                        <ChevronLeft className="h-4 w-4" />
                     </Button>
                     <span className="mx-2">
                        Page {rows.current_page} of {rows.last_page}
                     </span>
                     <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        className="h-8 w-8"
                        disabled={rows.current_page >= rows.last_page}
                        onClick={() => goto(rows.current_page + 1)}
                     >
                        <ChevronRight className="h-4 w-4" />
                     </Button>
                     <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        className="h-8 w-8"
                        disabled={rows.current_page >= rows.last_page}
                        onClick={() => goto(rows.last_page)}
                     >
                        <ChevronsRight className="h-4 w-4" />
                     </Button>
                  </div>
               </div>
            </div>
            <Dialog
               open={Boolean(preview)}
               onOpenChange={(open) => !open && setPreview(null)}
            >
               <DialogContent className="h-[88vh] grid-rows-[auto_auto_1fr] gap-3 p-4 sm:max-w-5xl">
                  <DialogHeader>
                     <DialogTitle className="pr-6 text-base">
                        {preview?.paper.title}
                     </DialogTitle>
                     <DialogDescription className="sr-only">
                        PDF preview
                     </DialogDescription>
                  </DialogHeader>
                  <div className="flex gap-2">
                     {(['question', 'marking'] as const).map((kind) =>
                        kind === 'question' ||
                        preview?.paper.has_marking ? (
                           <Button
                              key={kind}
                              type="button"
                              size="sm"
                              variant={
                                 preview?.kind === kind ? 'default' : 'outline'
                              }
                              onClick={() =>
                                 preview && setPreview({ ...preview, kind })
                              }
                           >
                              {kind === 'question'
                                 ? 'Maswali'
                                 : 'Marking Scheme'}
                           </Button>
                        ) : null,
                     )}
                  </div>
                  {preview && (
                     <iframe
                        key={`${preview.paper.id}-${preview.kind}`}
                        title="PDF preview"
                        src={`/examinations/${preview.paper.id}/files/${preview.kind}`}
                        className="h-full w-full rounded border"
                     />
                  )}
               </DialogContent>
            </Dialog>
         </div>
      </>
   );
}
Manage.layout = (page: ReactNode) => <DashboardLayout children={page} />;
