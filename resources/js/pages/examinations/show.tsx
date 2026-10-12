import { Head, Link } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import LandingLayout from '@/layouts/landing';
import type { Paper } from './types';
export default function PaperDetails({ paper: p }: { paper: Paper }) {
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
            <div className="flex flex-wrap gap-3">
               {p.pdf_url && (
                  <Button
                     asChild
                     className="bg-black text-white hover:bg-black/85"
                  >
                     <a
                        href={p.pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                     >
                        Fungua PDF / Download
                     </a>
                  </Button>
               )}
               {p.answer_url && (
                  <Button asChild variant="outline">
                     <a
                        href={p.answer_url}
                        target="_blank"
                        rel="noopener noreferrer"
                     >
                        Majibu / Marking scheme
                     </a>
                  </Button>
               )}
               {p.source_url && (
                  <Button asChild variant="outline">
                     <a
                        href={p.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                     >
                        Chanzo: {p.source_name || 'Fungua'} ↗
                     </a>
                  </Button>
               )}
            </div>
            {p.pdf_url ? (
               <>
                  <p className="text-sm text-muted-foreground">
                     Tumia Download au Print ndani ya PDF viewer. Ikiwa viewer
                     haifunguki, tumia “Fungua PDF”.
                  </p>
                  <iframe
                     title={p.title}
                     src={p.pdf_url}
                     className="h-[70vh] w-full rounded-lg border"
                     loading="lazy"
                     referrerPolicy="no-referrer"
                     sandbox="allow-scripts allow-same-origin allow-downloads allow-popups"
                  />
               </>
            ) : (
               <div className="rounded-lg border p-6">
                  <p>Mtihani huu unapatikana kwenye chanzo chake.</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                     Fungua link ya chanzo kuchagua paper na kupata faili
                     zinazopatikana.
                  </p>
               </div>
            )}
         </main>
      </>
   );
}
PaperDetails.layout = (page: ReactNode) => (
   <LandingLayout children={page} language />
);
