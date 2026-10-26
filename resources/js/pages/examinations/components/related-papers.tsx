import { Link } from '@inertiajs/react';
import { useT } from '@/lib/i18n';
import Autoplay from 'embla-carousel-autoplay';
import { useRef } from 'react';
import {
   Carousel,
   CarouselContent,
   CarouselItem,
   CarouselNext,
   CarouselPrevious,
} from '@/components/ui/carousel';
import PdfCover from './pdf-cover';

export interface RelatedPaper {
   id: number;
   title: string;
   class_name: string | null;
   subject: string | null;
   year: number | null;
   exam_type: string | null;
   region: string | null;
   cover_v?: string | null;
}

/** Auto-scrolling strip of papers close to the one being viewed. */
export default function RelatedPapers({ papers }: { papers: RelatedPaper[] }) {
   const t = useT();
   const autoplay = useRef(
      Autoplay({ delay: 2600, stopOnInteraction: false, stopOnMouseEnter: true }),
   );

   if (!papers.length) {
      return null;
   }

   return (
      <section aria-labelledby="related-papers-title" className="space-y-5">
         <div className="relative border-b pb-4 text-center">
            <h2
               id="related-papers-title"
               className="text-xl font-bold text-emerald-700 dark:text-emerald-400"
            >
               {t('Related papers')}
            </h2>
            <span
               aria-hidden="true"
               className="absolute bottom-0 left-1/2 h-0.5 w-24 -translate-x-1/2 bg-emerald-700"
            />
         </div>
         <Carousel
            opts={{ align: 'start', loop: papers.length > 4 }}
            plugins={[autoplay.current]}
            className="px-0 sm:px-10"
         >
            <CarouselContent className="-ml-4">
               {papers.map((paper) => (
                  <CarouselItem
                     key={paper.id}
                     className="basis-1/2 pl-4 md:basis-1/3 lg:basis-1/4"
                  >
                     <article className="group flex h-full flex-col text-center">
                        <div className="relative mx-auto h-56 w-full max-w-44 overflow-hidden bg-white shadow-sm transition-transform duration-300 group-hover:-translate-y-1 group-hover:shadow-lg motion-reduce:transform-none">
                           <PdfCover
                              id={paper.id}
                              title={paper.title}
                              coverV={paper.cover_v}
                           />
                           <Link
                              href={`/examinations/${paper.id}`}
                              className="absolute inset-0 focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-inset"
                              aria-label={`View ${paper.title}`}
                           />
                        </div>
                        <h3 className="mt-3 line-clamp-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                           <Link
                              href={`/examinations/${paper.id}`}
                              className="hover:underline"
                           >
                              {paper.title}
                           </Link>
                        </h3>
                        <p className="mt-1 text-xs text-muted-foreground">
                           {[paper.class_name, paper.subject, paper.year]
                              .filter(Boolean)
                              .join(' · ')}
                        </p>
                     </article>
                  </CarouselItem>
               ))}
            </CarouselContent>
            <CarouselPrevious className="hidden sm:flex" />
            <CarouselNext className="hidden sm:flex" />
         </Carousel>
      </section>
   );
}
