import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import {
   ChevronLeft,
   ChevronRight,
   ChevronsLeft,
   ChevronsRight,
   Eye,
   EllipsisVertical,
   Pencil,
} from 'lucide-react';
import { useRef, useState } from 'react';
import type { ReactNode } from 'react';
import SearchInput from '@/components/search-input';
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
   total,
   filters,
   options,
}: {
   papers: Page<Paper>;
   total: number;
   filters: { q: string; per_page: number };
   options: Options;
}) {
   const [preview, setPreview] = useState<{
      paper: Paper;
      kind: 'question' | 'marking';
   } | null>(null);

   function go(next: { q?: string; per_page?: number; page?: number }) {
      const query: Record<string, string | number> = {
         q: filters.q,
         per_page: filters.per_page,
         page: papers.current_page,
         ...next,
      };

      router.get(
         BASE,
         Object.fromEntries(
            Object.entries(query).filter(([, value]) => value !== ''),
         ),
         { preserveState: true, preserveScroll: true, replace: true },
      );
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
            <div className="flex justify-between">
               <h1 className="text-2xl font-bold">Past Papers</h1>
               <Link href="/examinations" className="underline">
                  Ona catalogue ↗
               </Link>
            </div>
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
                              papers.data.find((p) => p.id === id)?.[flag],
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
            <div className="rounded-lg border bg-card">
               <div className="flex flex-wrap items-center justify-between gap-3 p-3">
                  <p className="font-semibold">
                     Jumla ya mitihani: {total}
                     {filters.q && (
                        <span className="ml-2 text-sm font-normal text-muted-foreground">
                           · zilizopatikana {papers.total}
                        </span>
                     )}
                  </p>
                  <div className="flex items-center gap-2">
                     <SearchInput
                        className="md:max-w-[240px]"
                        placeholder="Tafuta mtihani…"
                        searchKey="q"
                        onChangeValue={(q) => go({ q, page: 1 })}
                     />
                     <select
                        aria-label="Idadi kwa ukurasa"
                        className="h-10 rounded-lg border bg-background px-2 text-sm"
                        value={filters.per_page}
                        onChange={(e) =>
                           go({ per_page: Number(e.target.value), page: 1 })
                        }
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
                     <TableRow>
                        <TableHead>Aina ya mtihani</TableHead>
                        <TableHead>Jina</TableHead>
                        <TableHead>Mkoa</TableHead>
                        <TableHead>Mwaka</TableHead>
                        <TableHead className="w-10" />
                     </TableRow>
                  </TableHeader>
                  <TableBody>
                     {papers.data.length ? (
                        papers.data.map((p) => (
                           <TableRow key={p.id}>
                              <TableCell className="py-2">
                                 {p.exam_type || '—'}
                              </TableCell>
                              <TableCell className="py-2">
                                 <p className="font-medium">{p.title}</p>
                                 <p className="text-xs text-muted-foreground">
                                    {!p.has_pdf
                                       ? 'Inahitaji PDF'
                                       : p.published
                                         ? 'Published'
                                         : 'Hidden'}{' '}
                                    ·{' '}
                                    {[
                                       options.education[p.education],
                                       p.class_name,
                                       p.subject,
                                    ]
                                       .filter(Boolean)
                                       .join(' · ')}
                                 </p>
                              </TableCell>
                              <TableCell className="py-2">
                                 {p.region || 'All regions'}
                              </TableCell>
                              <TableCell className="py-2">
                                 {p.year || '—'}
                              </TableCell>
                              <TableCell className="py-2 text-right">
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
                              className="h-20 text-center text-muted-foreground"
                           >
                              Hakuna mtihani uliopatikana
                           </TableCell>
                        </TableRow>
                     )}
                  </TableBody>
               </Table>
               <div className="flex flex-wrap items-center justify-between gap-3 p-3 text-sm">
                  <span className="text-muted-foreground">
                     Showing {papers.from || 0} to {papers.to || 0} of{' '}
                     {papers.total} entries
                  </span>
                  <div className="flex items-center gap-1">
                     <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        className="h-8 w-8"
                        disabled={papers.current_page <= 1}
                        onClick={() => go({ page: 1 })}
                     >
                        <ChevronsLeft className="h-4 w-4" />
                     </Button>
                     <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        className="h-8 w-8"
                        disabled={papers.current_page <= 1}
                        onClick={() => go({ page: papers.current_page - 1 })}
                     >
                        <ChevronLeft className="h-4 w-4" />
                     </Button>
                     <span className="mx-2">
                        Page {papers.current_page} of {papers.last_page}
                     </span>
                     <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        className="h-8 w-8"
                        disabled={papers.current_page >= papers.last_page}
                        onClick={() => go({ page: papers.current_page + 1 })}
                     >
                        <ChevronRight className="h-4 w-4" />
                     </Button>
                     <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        className="h-8 w-8"
                        disabled={papers.current_page >= papers.last_page}
                        onClick={() => go({ page: papers.last_page })}
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
