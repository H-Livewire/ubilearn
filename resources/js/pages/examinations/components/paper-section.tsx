import { Link } from '@inertiajs/react';
import { Check, ChevronDown } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
   DropdownMenu,
   DropdownMenuTrigger,
   DropdownMenuContent,
   DropdownMenuRadioGroup,
   DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu';
import type { Paper } from '../types';
import PaperRow from './paper-row';
import PdfCover from './pdf-cover';

const types = [
   ['', 'All'],
   ['Annual', 'Annual Examination'],
   ['Mock', 'Mock Examination'],
   ['Joint', 'Joint Examination'],
   ['Pre-NECTA', 'Pre-National Examination'],
];
export default function PaperSection({
   level,
   title,
   initial,
   filters,
   grid,
   regions,
   initialTotal = initial.length,
   initialPage = 1,
}: {
   level: string;
   title: string;
   initial: Paper[];
   filters: Record<string, string>;
   grid: boolean;
   regions: string[];
   initialTotal?: number;
   initialPage?: number;
}) {
   const [items, setItems] = useState(initial);
   const [total, setTotal] = useState(initialTotal);
   const [page, setPage] = useState(initialPage);
   const [moreLoading, setMoreLoading] = useState(false);
   const [type, setType] = useState(filters.exam_type || '');
   const [region, setRegion] = useState(filters.region || '');
   const [showRegions, setShowRegions] = useState(
      Boolean(filters.exam_type || filters.region),
   );
   const [loading, setLoading] = useState(false);
   const [error, setError] = useState('');
   const request = useRef<AbortController | null>(null);
   useEffect(() => () => request.current?.abort(), []);
   async function load(
      nextType: string,
      nextRegion: string,
      nextPage = '1',
      append = false,
   ) {
      request.current?.abort();
      const controller = new AbortController();
      request.current = controller;
      setType(nextType);
      setRegion(nextRegion);
      setLoading(!append);
      setMoreLoading(append);

      if (!append) {
         setItems([]);
         setTotal(0);
      }

      setError('');

      try {
         const params = new URLSearchParams({
            ...filters,
            education: level,
            exam_type: nextType,
            region: nextRegion,
         });
         params.set('page', nextPage);
         const response = await fetch(`/examinations?${params}`, {
            signal: controller.signal,
            headers: { Accept: 'application/json' },
            credentials: 'same-origin',
         });

         if (!response.ok) {
            throw new Error('Could not load papers');
         }

         const data = await response.json();

         if (!Array.isArray(data.papers?.data)) {
            throw new Error('Invalid paper response');
         }

         if (!controller.signal.aborted) {
            setItems((current) =>
               append
                  ? [
                       ...current,
                       ...data.papers.data.filter(
                          (paper: Paper) =>
                             !current.some(
                                (existing) => existing.id === paper.id,
                             ),
                       ),
                    ]
                  : data.papers.data,
            );
            setTotal(data.papers.total);
            setPage(data.papers.current_page ?? Number(nextPage));

            if (!append) {
               setShowRegions(true);
            }
         }
      } catch {
         if (!controller.signal.aborted) {
            setError('Mitihani imeshindwa kupakia. Tafadhali jaribu tena.');
         }
      } finally {
         if (!controller.signal.aborted) {
            setLoading(false);
            setMoreLoading(false);
         }
      }
   }

   return (
      <section className="space-y-6 py-5" aria-label={title}>
         <div className="relative border-b pb-5 text-center">
            <h2 className="text-2xl font-bold text-emerald-700 transition-colors duration-300 hover:text-emerald-900 dark:text-emerald-400">
               {title}
            </h2>
            <span
               aria-hidden="true"
               className="absolute bottom-0 left-1/2 h-0.5 w-32 -translate-x-1/2 bg-emerald-700"
            />
         </div>
         <div className="flex justify-start">
            <DropdownMenu>
               <DropdownMenuTrigger asChild>
                  <Button
                     variant="outline"
                     aria-label={`${title} examination type`}
                  >
                     {types.find(([value]) => value === type)?.[1] || 'All'}
                     <ChevronDown size={16} />
                  </Button>
               </DropdownMenuTrigger>
               <DropdownMenuContent align="start">
                  <DropdownMenuRadioGroup
                     value={type}
                     onValueChange={(value) => load(value, '')}
                  >
                     {types.map(([value, label]) => (
                        <DropdownMenuRadioItem
                           key={value}
                           value={value}
                           className="[&>span]:hidden"
                        >
                           {type === value && (
                              <Check
                                 size={14}
                                 className="absolute left-2 text-emerald-700"
                              />
                           )}
                           {label}
                        </DropdownMenuRadioItem>
                     ))}
                  </DropdownMenuRadioGroup>
               </DropdownMenuContent>
            </DropdownMenu>
         </div>
         {showRegions && (
            <PaperRow title={title} noun="regions" grid={false} compact>
               {['', ...regions].map((value) => (
                  <button
                     key={value}
                     type="button"
                     aria-pressed={region === value}
                     onClick={() => load(type, value)}
                     className={`shrink-0 snap-start border-b-2 px-1 py-3 text-sm font-medium whitespace-nowrap transition-colors hover:text-emerald-700 ${region === value ? 'border-emerald-700 text-emerald-700 dark:text-emerald-400' : 'border-transparent text-black dark:text-white'}`}
                  >
                     {value || 'All'}
                  </button>
               ))}
            </PaperRow>
         )}
         <div className="min-h-96" aria-busy={loading}>
            {loading ? (
               <div
                  className="flex min-h-96 items-center justify-center"
                  role="status"
                  aria-label={`Loading ${title} papers`}
               >
                  <div className="paper-dot-loader" aria-hidden="true">
                     <span />
                     <span />
                     <span />
                  </div>
                  <span className="sr-only">Loading papers…</span>
               </div>
            ) : error && !items.length ? (
               <div className="py-16 text-center" role="alert">
                  <p>{error}</p>
                  <Button
                     variant="outline"
                     onClick={() => load(type, region)}
                     className="mt-4"
                  >
                     Try again
                  </Button>
               </div>
            ) : (
               <>
                  {!items.length && (
                     <div
                        className="flex min-h-96 flex-col items-center justify-center gap-4 py-10"
                        role="status"
                     >
                        <img
                           src="/assets/images/past-papers-empty.jpg"
                           alt=""
                           width={160}
                           height={160}
                           className="h-40 w-40 object-contain"
                        />
                        <p className="text-lg font-semibold text-emerald-700 dark:text-emerald-400">
                           Empty
                        </p>
                     </div>
                  )}
                  <PaperRow title={title} grid>
                     {items.map((p) => (
                        <article
                           key={p.id}
                           className={`group flex w-full shrink-0 snap-start flex-col bg-background px-4 py-5 text-center`}
                        >
                           <div className="relative mx-auto h-72 w-full max-w-56 overflow-hidden bg-white shadow-sm transition-transform duration-300 group-hover:-translate-y-1 group-hover:shadow-lg motion-reduce:transform-none">
                              <PdfCover id={p.id} title={p.title} />
                              <Link
                                 href={`/examinations/${p.id}`}
                                 className="absolute inset-0 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
                                 aria-label={`View ${p.title}`}
                              />
                           </div>
                           <div className="flex flex-1 flex-col pt-5">
                              <div className="mb-4 flex-1">
                                 <h3 className="font-semibold text-emerald-700 dark:text-emerald-400">
                                    <Link
                                       href={`/examinations/${p.id}`}
                                       className="transition-colors duration-300 hover:text-emerald-900 hover:underline dark:hover:text-emerald-300"
                                    >
                                       {p.title}
                                    </Link>
                                 </h3>
                                 <p className="mt-1 text-sm text-emerald-700 dark:text-emerald-400">
                                    {[
                                       p.class_name,
                                       p.subject,
                                       p.year,
                                       p.exam_type,
                                    ]
                                       .filter(Boolean)
                                       .join(' · ')}
                                    {p.has_answers ? ' · Yenye majibu' : ''}
                                 </p>
                                 <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-400">
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
                              <div className="flex flex-wrap justify-center gap-2">
                                 <Button asChild variant="outline">
                                    <Link href={`/examinations/${p.id}`}>
                                       View PDF
                                    </Link>
                                 </Button>
                                 {p.has_pdf && (
                                    <Button
                                       asChild
                                       className="bg-black text-white hover:bg-black/85"
                                    >
                                       <a
                                          href={`/examinations/${p.id}/files/question?download=1`}
                                       >
                                          Download PDF
                                       </a>
                                    </Button>
                                 )}
                              </div>
                           </div>
                        </article>
                     ))}
                  </PaperRow>
               </>
            )}
         </div>
         {error && items.length > 0 && (
            <p role="alert" className="text-center text-sm text-red-600">
               {error}
            </p>
         )}
         <div className="flex justify-center pt-4">
            {moreLoading ? (
               <div
                  role="status"
                  aria-label={`Loading more ${title} papers`}
                  className="paper-dot-loader"
               >
                  <span />
                  <span />
                  <span />
               </div>
            ) : (
               !loading &&
               items.length > 0 &&
               items.length < total && (
                  <Button
                     variant="outline"
                     onClick={() => load(type, region, String(page + 1), true)}
                  >
                     View more
                  </Button>
               )
            )}
         </div>
         {grid && (
            <div className="text-center">
               <Link href="/examinations" className="text-sm underline">
                  All levels
               </Link>
            </div>
         )}
      </section>
   );
}
