import { Head, router } from '@inertiajs/react';
import { Search } from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import LandingLayout from '@/layouts/landing';
import { useT } from '@/lib/i18n';
import PaperSection from './components/paper-section';
import type { Options, Page, Paper } from './types';
export default function Examinations({
   papers,
   filters,
   options,
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
   const t = useT();
   const [values, setValues] = useState<Record<string, string>>(filters);
   const [busy, setBusy] = useState(false);
   function apply(extra: Record<string, string> = {}) {
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

   return (
      <>
         <Head title={t('Past Papers')} />
         <main className="container mx-auto max-w-6xl space-y-5 px-4 py-8 sm:py-10">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
               <h1 className="text-3xl font-bold">{t('Past Papers')}</h1>
               <div className="flex items-center gap-5">
                  <form
                     onSubmit={(e) => {
                        e.preventDefault();
                        apply();
                     }}
                     className="flex items-center gap-2 border-b"
                  >
                     <input
                        aria-label={t('Search past papers')}
                        placeholder={t('Search past papers')}
                        className="w-44 bg-transparent py-2 text-sm outline-none"
                        value={values.q || ''}
                        onChange={(e) =>
                           setValues({ ...values, q: e.target.value })
                        }
                     />
                     <button
                        aria-label={t('Search')}
                        type="submit"
                        className="p-2"
                        disabled={busy}
                     >
                        <Search className="h-4 w-4" />
                     </button>
                  </form>
               </div>
            </div>
            <img
               src="/assets/images/past-papers-office.png"
               alt="Examination papers stacked on a desk"
               className="block aspect-[16/7] w-full rounded-lg object-cover object-center sm:aspect-[3/1]"
               fetchPriority="high"
            />
            <div className="flex justify-between text-sm text-muted-foreground">
               <p>{busy ? t('Searching…') : t(':n papers', { n: papers.total })}</p>
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
                    ['primary', t('Primary')],
                    ['olevel', t('O-Level')],
                    ['alevel', t('Advanced')],
                    ['college', t('University')],
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
