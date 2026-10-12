import { Head, Link, router } from '@inertiajs/react';
import { FileText, Search, SlidersHorizontal } from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
   Sheet,
   SheetContent,
   SheetTitle,
   SheetTrigger,
} from '@/components/ui/sheet';
import LandingLayout from '@/layouts/landing';
import type { Options, Page, Paper } from './types';
const selectClass =
   'h-11 w-full rounded-md border border-input bg-background px-3 text-sm';
export default function Examinations({
   papers,
   filters,
   options,
   subjects,
   years,
}: {
   papers: Page<Paper>;
   filters: Record<string, string>;
   options: Options;
   subjects: string[];
   years: number[];
}) {
   const [values, setValues] = useState<Record<string, string>>(filters);
   const [open, setOpen] = useState(false);
   const [busy, setBusy] = useState(false);
   function apply(extra: Record<string, string> = {}) {
      setOpen(false);
      router.get(
         '/examinations',
         { ...values, ...extra },
         {
            preserveScroll: true,
            onStart: () => setBusy(true),
            onFinish: () => setBusy(false),
         },
      );
   }
   const classes =
      values.education === 'nursery'
         ? ['Baby class', 'Middle class', 'Pre-unit']
         : values.education === 'primary'
           ? Array.from({ length: 7 }, (_, i) => `Standard ${i + 1}`)
           : values.education === 'olevel'
             ? Array.from({ length: 4 }, (_, i) => `Form ${i + 1}`)
             : values.education === 'alevel'
               ? ['Form 5', 'Form 6']
               : values.education === 'college'
                 ? ['Certificate', 'Diploma', 'Degree']
                 : [
                      'Standard 1',
                      'Standard 2',
                      'Standard 3',
                      'Standard 4',
                      'Standard 5',
                      'Standard 6',
                      'Standard 7',
                      'Form 1',
                      'Form 2',
                      'Form 3',
                      'Form 4',
                      'Form 5',
                      'Form 6',
                      'Certificate',
                      'Diploma',
                      'Degree',
                   ];
   const fields: [string, string, string[], string][] = [
      ['class_name', 'Darasa', classes, 'Madarasa yote'],
      ['region', 'Mkoa', options.regions, 'Mikoa yote'],
      ['subject', 'Somo', subjects, 'Masomo yote'],
      ['year', 'Mwaka', years.map(String), 'Miaka yote'],
      ['exam_type', 'Aina', options.types, 'Aina zote'],
      ['answers', 'Majibu', ['yes', 'no'], 'Yote'],
   ];
   const filterFields = (prefix: string) => (
      <>
         {fields.map(([key, label, items, all]) => (
            <div key={key} className="space-y-2">
               <Label htmlFor={`${prefix}-${key}`}>{label}</Label>
               <select
                  id={`${prefix}-${key}`}
                  className={selectClass}
                  value={values[key] || ''}
                  onChange={(e) =>
                     setValues({ ...values, [key]: e.target.value })
                  }
               >
                  <option value="">{all}</option>
                  {items.map((item) => (
                     <option key={item} value={item}>
                        {key === 'answers'
                           ? item === 'yes'
                              ? 'Yenye majibu'
                              : 'Hakuna majibu yaliyowekwa'
                           : item}
                     </option>
                  ))}
               </select>
            </div>
         ))}
      </>
   );

   return (
      <>
         <Head title="Examinations" />
         <main className="container mx-auto max-w-6xl space-y-5 px-4 py-8 sm:py-10">
            <div>
               <h1 className="text-3xl font-bold">Examinations</h1>
               <p className="mt-2 text-sm text-muted-foreground">
                  Tafuta mtihani, soma au pakua.
               </p>
            </div>
            <form
               onSubmit={(e) => {
                  e.preventDefault();
                  apply();
               }}
               className="flex gap-2"
            >
               <div className="relative flex-1">
                  <Search className="absolute top-3 left-3 h-5 w-5 text-muted-foreground" />
                  <Input
                     aria-label="Tafuta mitihani"
                     className="h-11 pl-10"
                     placeholder="Tafuta somo, mtihani au mkoa…"
                     value={values.q || ''}
                     onChange={(e) =>
                        setValues({ ...values, q: e.target.value })
                     }
                  />
               </div>
               <Button
                  disabled={busy}
                  className="h-11 bg-black font-semibold text-white hover:bg-black/85"
               >
                  Tafuta
               </Button>
            </form>
            <div className="flex gap-2 overflow-x-auto pb-1">
               {Object.entries({ '': 'Zote', ...options.education }).map(
                  ([key, label]) => (
                     <Button
                        key={key}
                        variant="outline"
                        className={`shrink-0 ${values.education === key || (!values.education && !key) ? 'border-emerald-700 bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : ''}`}
                        onClick={() => {
                           setValues({
                              ...values,
                              education: key,
                              class_name: '',
                           });
                           apply({ education: key, class_name: '' });
                        }}
                     >
                        {label}
                     </Button>
                  ),
               )}
            </div>
            <div className="hidden rounded-lg border p-4 lg:block">
               <div className="grid grid-cols-6 gap-3">
                  {filterFields('desktop')}
               </div>
               <div className="mt-3 flex justify-end gap-3">
                  <Button
                     variant="ghost"
                     onClick={() => router.get('/examinations')}
                  >
                     Ondoa filters
                  </Button>
                  <Button
                     className="bg-black text-white hover:bg-black/85"
                     disabled={busy}
                     onClick={() => apply()}
                  >
                     Onyesha mitihani
                  </Button>
               </div>
            </div>
            <div className="lg:hidden">
               <Sheet open={open} onOpenChange={setOpen}>
                  <SheetTrigger asChild>
                     <Button
                        variant="outline"
                        className="w-full justify-between"
                     >
                        <span className="flex items-center gap-2">
                           <SlidersHorizontal size={16} />
                           Filters
                        </span>
                     </Button>
                  </SheetTrigger>
                  <SheetContent className="overflow-y-auto p-5">
                     <SheetTitle>Filters</SheetTitle>
                     <div className="mt-6 space-y-4">
                        {filterFields('mobile')}
                        <Button
                           className="w-full bg-black text-white hover:bg-black/85"
                           onClick={() => apply()}
                        >
                           Onyesha mitihani
                        </Button>
                        <Button
                           variant="outline"
                           className="w-full"
                           onClick={() => {
                              setOpen(false);
                              router.get('/examinations');
                           }}
                        >
                           Ondoa filters
                        </Button>
                     </div>
                  </SheetContent>
               </Sheet>
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
               <p>{busy ? 'Inatafuta…' : `${papers.total} mitihani`}</p>
               <Link className="underline" href="/exams/all">
                  Online exams
               </Link>
            </div>
            <div className="space-y-3" aria-busy={busy}>
               {papers.data.map((p) => (
                  <article
                     key={p.id}
                     className="flex flex-col gap-4 rounded-lg border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                     <div className="flex min-w-0 gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                           <FileText size={22} />
                        </div>
                        <div>
                           <h2 className="font-semibold">{p.title}</h2>
                           <p className="mt-1 text-sm text-muted-foreground">
                              {[p.class_name, p.subject, p.year, p.exam_type]
                                 .filter(Boolean)
                                 .join(' · ')}
                              {p.has_answers ? ' · Yenye majibu' : ''}
                           </p>
                           <p className="mt-1 text-xs text-muted-foreground">
                              {p.region
                                 ? `Mkoa: ${p.region}`
                                 : p.exam_type === 'NECTA'
                                   ? 'Kitaifa'
                                   : 'Mikoa yote'}
                              {p.organizer ? ` · ${p.organizer}` : ''}
                              {p.source_name
                                 ? ` · Chanzo: ${p.source_name}`
                                 : ''}
                           </p>
                        </div>
                     </div>
                     <div className="flex shrink-0 gap-2">
                        <Button asChild variant="outline">
                           <Link href={`/examinations/${p.id}`}>
                              Ona mtihani
                           </Link>
                        </Button>
                        {(p.pdf_url || p.source_url) && (
                           <Button
                              asChild
                              className="bg-black text-white hover:bg-black/85"
                           >
                              <a
                                 href={p.pdf_url || p.source_url || ''}
                                 target="_blank"
                                 rel="noopener noreferrer"
                              >
                                 {p.pdf_url ? 'Fungua PDF' : 'Fungua chanzo ↗'}
                              </a>
                           </Button>
                        )}
                     </div>
                  </article>
               ))}
            </div>
            {!papers.data.length && (
               <div className="rounded-lg border p-8 text-center text-muted-foreground">
                  Hakuna mitihani inayolingana na filters hizi. Jaribu filters
                  nyingine.
               </div>
            )}
            <nav aria-label="Kurasa" className="flex flex-wrap gap-2">
               {papers.links.map((l, i) =>
                  l.url ? (
                     <Link
                        key={i}
                        href={l.url}
                        className={`rounded-md border px-3 py-2 text-sm ${l.active ? 'bg-black text-white' : ''}`}
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
         </main>
      </>
   );
}
Examinations.layout = (page: ReactNode) => (
   <LandingLayout children={page} language />
);
