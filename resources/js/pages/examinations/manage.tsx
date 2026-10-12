import { Head, Link, useForm } from '@inertiajs/react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import DashboardLayout from '@/layouts/dashboard/layout';
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
   source_url: '',
   pdf_url: '',
   answer_url: '',
   has_answers: false,
   published: true,
};
export default function Manage({
   papers,
   options,
}: {
   papers: Page<Paper>;
   options: Options;
}) {
   const [id, setId] = useState<number | null>(null);
   const { data, setData, post, errors, processing, reset } = useForm(blank);
   const fields: [keyof typeof blank, string][] = [
      ['title', 'Jina la mtihani'],
      ['class_name', 'Darasa (mfano Form 4)'],
      ['subject', 'Somo'],
      ['year', 'Mwaka'],
      ['organizer', 'Shule / Mwandaaji'],
      ['source_name', 'Jina la chanzo'],
      ['source_url', 'Link ya chanzo'],
      ['pdf_url', 'PDF URL (faili yenye ruhusa ya kusambazwa)'],
      ['answer_url', 'Majibu / Marking scheme URL'],
   ];
   function edit(p: Paper) {
      setId(p.id);
      setData({
         ...blank,
         ...Object.fromEntries(
            Object.keys(blank).map((k) => [k, p[k as keyof Paper] ?? '']),
         ),
         year: p.year ? String(p.year) : '',
         has_answers: p.has_answers,
         published: p.published,
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
   }

   return (
      <>
         <Head title="Examination papers" />
         <div className="mx-auto max-w-5xl space-y-6 p-4">
            <div className="flex justify-between">
               <h1 className="text-2xl font-bold">Examination papers</h1>
               <Link href="/examinations" className="underline">
                  Ona catalogue ↗
               </Link>
            </div>
            <form
               className="rounded-lg border bg-card p-5"
               onSubmit={(e) => {
                  e.preventDefault();
                  post(`/dashboard/examination-papers${id ? `/${id}` : ''}`, {
                     preserveScroll: true,
                     onSuccess: () => {
                        reset();
                        setId(null);
                     },
                  });
               }}
            >
               <h2 className="mb-4 font-semibold">
                  {id ? 'Hariri mtihani' : 'Ongeza mtihani'}
               </h2>
               <div className="grid gap-4 sm:grid-cols-2">
                  {fields.map(([key, label]) => (
                     <div className="space-y-2" key={key}>
                        <Label htmlFor={key}>{label}</Label>
                        <Input
                           id={key}
                           required={key === 'title'}
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
                           Object.fromEntries(options.types.map((r) => [r, r])),
                        ],
                     ] as [keyof typeof blank, string, Record<string, string>][]
                  ).map(([key, label, items]) => (
                     <div className="space-y-2" key={key}>
                        <Label htmlFor={key}>{label}</Label>
                        <select
                           id={key}
                           className="h-10 w-full rounded-md border bg-background px-3"
                           value={String(data[key])}
                           onChange={(e) => setData(key, e.target.value)}
                        >
                           {key !== 'education' && (
                              <option value="">Kitaifa / Haijawekwa</option>
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
               <div className="my-5 flex flex-wrap gap-6">
                  {(['has_answers', 'published'] as const).map((k) => (
                     <label key={k} className="flex items-center gap-2 text-sm">
                        <input
                           type="checkbox"
                           checked={data[k]}
                           onChange={(e) => setData(k, e.target.checked)}
                        />
                        {k === 'has_answers'
                           ? 'Majibu yanapatikana'
                           : 'Onyesha kwenye catalogue'}
                     </label>
                  ))}
               </div>
               <div className="flex gap-3">
                  <Button
                     disabled={processing}
                     className="bg-black text-white hover:bg-black/85"
                  >
                     {processing ? 'Inahifadhi…' : 'Hifadhi'}
                  </Button>
                  {id && (
                     <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                           reset();
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
                     className="flex items-center justify-between gap-4 rounded-lg border p-3"
                     key={p.id}
                  >
                     <div>
                        <p className="font-medium">{p.title}</p>
                        <p className="text-sm text-muted-foreground">
                           {p.published ? 'Published' : 'Hidden'} ·{' '}
                           {p.region || 'Kitaifa'}
                        </p>
                     </div>
                     <Button variant="outline" onClick={() => edit(p)}>
                        Hariri
                     </Button>
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
