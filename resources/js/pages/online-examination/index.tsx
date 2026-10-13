import { Head, Link } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import LandingLayout from '@/layouts/landing';
import type { Page } from '../examinations/types';
type OnlineExam = {
   id: number;
   slug: string;
   title: string;
   total_questions: number;
   duration_hours: number;
   duration_minutes: number;
   total_marks: number;
};
export default function OnlineExamination({
   exams,
}: {
   exams: Page<OnlineExam>;
}) {
   return (
      <>
         <Head title="Online examination" />
         <main className="container mx-auto max-w-6xl space-y-6 px-4 py-10">
            <div>
               <h1 className="text-3xl font-bold">Online examination</h1>
               <p className="mt-2 text-muted-foreground">
                  Chagua mtihani, soma maelekezo na ujibu maswali online.
               </p>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
               {exams.data.map((exam) => (
                  <article
                     key={exam.id}
                     className="flex flex-col rounded-xl border bg-card p-5"
                  >
                     <span className="mb-3 text-sm font-semibold text-primary">
                        Online exam
                     </span>
                     <h2 className="mb-3 text-lg font-bold">{exam.title}</h2>
                     <p className="mb-5 text-sm text-muted-foreground">
                        {exam.total_questions} maswali · {exam.total_marks}{' '}
                        marks ·{' '}
                        {exam.duration_hours * 60 + exam.duration_minutes} min
                     </p>
                     <Button
                        asChild
                        className="mt-auto bg-black text-white hover:bg-black/85"
                     >
                        <Link href={`/exams/details/${exam.slug}/${exam.id}`}>
                           Ona maelekezo
                        </Link>
                     </Button>
                  </article>
               ))}
            </div>
            {!exams.data.length && (
               <p className="rounded-xl border p-8 text-center text-muted-foreground">
                  Hakuna mtihani uliochapishwa bado.
               </p>
            )}
            <nav aria-label="Kurasa" className="flex flex-wrap gap-2">
               {exams.links.map((link, i) =>
                  link.url ? (
                     <Link
                        key={i}
                        href={link.url}
                        className={`rounded-md border px-3 py-2 ${link.active ? 'bg-black text-white' : ''}`}
                     >
                        {link.label.includes('Previous')
                           ? '←'
                           : link.label.includes('Next')
                             ? '→'
                             : link.label}
                     </Link>
                  ) : null,
               )}
            </nav>
         </main>
      </>
   );
}
OnlineExamination.layout = (page: ReactNode) => (
   <LandingLayout children={page} language />
);
