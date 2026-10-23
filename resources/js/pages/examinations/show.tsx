import { Head, Link } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import LandingLayout from '@/layouts/landing';
import type { Paper } from './types';
export default function PaperDetails({ paper: p }: { paper: Paper }) {
   const [kind, setKind] = useState('question');
   const url = `/examinations/${p.id}/files/${kind}`;

   return (
      <>
         <Head title={p.title} />
         <main className="container mx-auto max-w-5xl space-y-5 px-4 py-10">
            <Button
               asChild
               variant="outline"
               className="group rounded-full border-emerald-700/20 bg-emerald-50/50 px-5 text-emerald-800 shadow-sm transition-colors hover:border-emerald-700 hover:bg-emerald-700 hover:text-white dark:bg-emerald-950/30 dark:text-emerald-300"
            >
               <Link href="/examinations">
                  <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1 motion-reduce:transform-none" />
                  Previous
               </Link>
            </Button>
            <h1 className="text-2xl font-bold">{p.title}</h1>
            <p className="text-sm text-muted-foreground">
               {[
                  p.region,
                  p.class_name,
                  p.subject,
                  p.year,
                  p.exam_type,
                  p.organizer,
               ]
                  .filter(Boolean)
                  .join(' · ')}
            </p>
            <div className="flex flex-wrap items-center gap-3">
               {(
                  [
                     ['question', 'Question Paper', true],
                     ['marking', 'Marking Scheme', true],
                  ] as const
               )
                  .filter((item) => item[2])
                  .map(([value, label]) => (
                     <Button
                        key={value}
                        onClick={() => setKind(value)}
                        disabled={value === 'marking' && !p.has_marking}
                        variant="outline"
                        aria-pressed={kind === value}
                        className={
                           kind === value
                              ? 'border-primary bg-primary/10 text-primary'
                              : ''
                        }
                     >
                        {label}
                     </Button>
                  ))}
               <Button
                  asChild
                  className="bg-black text-white hover:bg-black/85"
               >
                  <a href={`${url}?download=1`}>Download PDF</a>
               </Button>
            </div>
            {!p.has_marking && (
               <p className="text-sm text-muted-foreground">
                  Marking scheme bado haijawekwa.
               </p>
            )}
            <iframe
               key={kind}
               title={`${p.title} — ${kind}`}
               src={url}
               className="h-[75vh] w-full rounded-lg border bg-white"
            />
            <p className="text-sm text-muted-foreground">
               Ikiwa simu yako haionyeshi PDF hapa, tumia Download PDF.
            </p>
         </main>
      </>
   );
}
PaperDetails.layout = (page: ReactNode) => (
   <LandingLayout children={page} language />
);
