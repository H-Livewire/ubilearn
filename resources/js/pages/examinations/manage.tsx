import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
export default function Manage({
   papers,
   options,
}: {
   papers: Page<Paper>;
   options: Options;
}) {
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
            <div className="space-y-2">
               {papers.data.map((p) => (
                  <div
                     className="flex flex-wrap items-center justify-between gap-4 rounded-lg border p-3"
                     key={p.id}
                  >
                     <div>
                        <p className="font-medium">{p.title}</p>
                        <p className="text-sm text-muted-foreground">
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
                              p.year,
                              p.exam_type,
                              p.region || 'All regions',
                           ]
                              .filter(Boolean)
                              .join(' · ')}
                        </p>
                     </div>
                     <div className="flex shrink-0 flex-wrap gap-2">
                        {p.has_pdf && (
                           <Button asChild variant="outline">
                              <a
                                 href={`/examinations/${p.id}/files/question`}
                                 target="_blank"
                                 rel="noopener noreferrer"
                              >
                                 View PDF
                              </a>
                           </Button>
                        )}
                        {p.has_marking && (
                           <Button asChild variant="outline">
                              <a
                                 href={`/examinations/${p.id}/files/marking`}
                                 target="_blank"
                                 rel="noopener noreferrer"
                              >
                                 Marking Scheme
                              </a>
                           </Button>
                        )}
                        <Button variant="outline" onClick={() => edit(p)}>
                           Edit
                        </Button>
                     </div>
                  </div>
               ))}
            </div>
            <nav className="flex gap-2">
               {papers.links.map((l, i) =>
                  l.url ? (
                     <Link
                        key={i}
                        href={l.url}
                        className="rounded border px-3 py-2"
                     >
                        {l.label.includes('Previous')
                           ? '←'
                           : l.label.includes('Next')
                             ? '→'
                             : l.label}
                     </Link>
                  ) : null,
               )}
            </nav>
         </div>
      </>
   );
}
Manage.layout = (page: ReactNode) => <DashboardLayout children={page} />;
