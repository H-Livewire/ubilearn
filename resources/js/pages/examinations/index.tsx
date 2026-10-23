import { Head, router } from '@inertiajs/react';
import { Search, SlidersHorizontal } from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
   Sheet,
   SheetContent,
   SheetTitle,
   SheetTrigger,
} from '@/components/ui/sheet';
import LandingLayout from '@/layouts/landing';
import PaperSection from './components/paper-section';
import type { Options, Page, Paper } from './types';
const selectClass =
   'h-11 w-full rounded-md border border-input bg-background px-3 text-sm';
export default function Examinations({
   papers,
   filters,
   options,
   subjects,
   years,
   levels = {},
   levelTotals = {},
}: {
   papers: Page<Paper>;
   filters: Record<string, string>;
   options: Options;
   subjects: string[];
   years: number[];
   levels?: Record<string, Paper[]>;
   levelTotals?: Record<string, number>;
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
         <Head title="Past Papers" />
         <main className="container mx-auto max-w-6xl space-y-5 px-4 py-8 sm:py-10">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
               <h1 className="text-3xl font-bold">Past Papers</h1>
               <div className="flex items-center gap-5">
                  <form
                     onSubmit={(e) => {
                        e.preventDefault();
                        apply();
                     }}
                     className="flex items-center gap-2 border-b"
                  >
                     <input
                        aria-label="Search past papers"
                        placeholder="Search past papers"
                        className="w-44 bg-transparent py-2 text-sm outline-none"
                        value={values.q || ''}
                        onChange={(e) =>
                           setValues({ ...values, q: e.target.value })
                        }
                     />
                     <button
                        aria-label="Search"
                        type="submit"
                        className="p-2"
                        disabled={busy}
                     >
                        <Search className="h-4 w-4" />
                     </button>
                  </form>
                  <Sheet open={open} onOpenChange={setOpen}>
                     <SheetTrigger asChild>
                        <Button variant="outline">
                           <SlidersHorizontal size={16} /> Filters
                        </Button>
                     </SheetTrigger>
                     <SheetContent
                        side="right"
                        className="overflow-y-auto p-6 motion-reduce:animate-none"
                     >
                        <SheetTitle>Filter Past Papers</SheetTitle>
                        <div className="mt-4 space-y-5">
                           <div className="space-y-2">
                              <Label htmlFor="filter-level">Level</Label>
                              <select
                                 id="filter-level"
                                 className={selectClass}
                                 value={values.education || ''}
                                 onChange={(e) =>
                                    setValues({
                                       ...values,
                                       education: e.target.value,
                                       class_name: '',
                                    })
                                 }
                              >
                                 <option value="">All levels</option>
                                 {Object.entries(options.education).map(
                                    ([key, label]) => (
                                       <option key={key} value={key}>
                                          {label}
                                       </option>
                                    ),
                                 )}
                              </select>
                           </div>
                           {filterFields('drawer')}
                           <Button
                              disabled={busy}
                              className="w-full"
                              onClick={() => apply()}
                           >
                              Apply filters
                           </Button>
                           <Button
                              variant="outline"
                              className="w-full"
                              onClick={() => {
                                 setOpen(false);
                                 setValues({});
                                 router.get('/examinations');
                              }}
                           >
                              Clear filters
                           </Button>
                        </div>
                     </SheetContent>
                  </Sheet>
               </div>
            </div>
            <img
               src="/assets/images/past-papers-photography.jpeg"
               alt="Examination papers stacked on a desk"
               className="block aspect-[16/7] w-full rounded-lg object-cover object-center sm:aspect-[3/1]"
               fetchPriority="high"
            />
            <div className="flex justify-between text-sm text-muted-foreground">
               <p>{busy ? 'Inatafuta…' : `${papers.total} mitihani`}</p>
            </div>
            {(filters.education
               ? [
                    {
                       key: filters.education,
                       title: options.education[filters.education],
                       items: papers.data,
                    },
                 ]
               : [
                    ['primary', 'Primary'],
                    ['olevel', 'O-Level'],
                    ['alevel', 'Advanced'],
                    ['college', 'University'],
                    ...(levels.nursery?.length ? [['nursery', 'Awali']] : []),
                 ].map(([key, title]) => ({
                    key,
                    title,
                    items: levels[key] || [],
                 }))
            ).map((section) => (
               <PaperSection
                  key={`${section.key}:${JSON.stringify(filters)}:${section.items.map((paper) => paper.id).join(',')}`}
                  level={section.key}
                  title={section.title}
                  initial={section.items}
                  filters={filters}
                  grid={Boolean(filters.education)}
                  regions={options.regions.slice(0, 26)}
                  initialTotal={
                     filters.education
                        ? papers.total
                        : (levelTotals[section.key] ?? section.items.length)
                  }
                  initialPage={
                     filters.education ? (papers.current_page ?? 1) : 1
                  }
               />
            ))}
         </main>
      </>
   );
}
Examinations.layout = (page: ReactNode) => (
   <LandingLayout children={page} language />
);
