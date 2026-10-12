import { Head, Link } from '@inertiajs/react';
import { useState  } from 'react';
import type {ReactNode} from 'react';
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
            <Link href="/examinations" className="text-sm underline">
               ← Examinations
            </Link>
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
                     ['question', 'Maswali', true],
                     ['marking', 'Marking scheme', p.has_marking],
                     ['instructions', 'Maelekezo', p.has_instructions],
                  ] as const
               )
                  .filter((item) => item[2])
                  .map(([value, label]) => (
                     <Button
                        key={value}
                        onClick={() => setKind(value)}
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
               <Button asChild variant="outline">
                  <a href={url} target="_blank" rel="noopener noreferrer">
                     Fungua / Print
                  </a>
               </Button>
            </div>
            <iframe
               key={kind}
               title={`${p.title} — ${kind}`}
               src={url}
               className="h-[75vh] w-full rounded-lg border bg-white"
            />
            <p className="text-sm text-muted-foreground">
               Ikiwa simu yako haionyeshi PDF hapa, tumia Fungua / Print.
            </p>
         </main>
      </>
   );
}
PaperDetails.layout = (page: ReactNode) => (
   <LandingLayout children={page} language />
);
