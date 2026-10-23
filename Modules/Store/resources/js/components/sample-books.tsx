import { formatBookAmount } from '../lib/book-price';
import { ShelfHeading } from './book-display';

type SampleCover = [title: string, file: string];

export const schoolBookSamples: SampleCover[] = [
   ['Comprehensive Biology — Form Two', 'comprehensive-biology-form-two.jpeg'],
   ['Biology for Secondary Schools — Form Two', 'biology-form-two.jpeg'],
   ['Biology for Secondary Schools — Form One', 'biology-form-one.jpeg'],
];

const samples: SampleCover[] = [
   ['Unanswered Cries', 'unanswered-cries.jpeg'],
   ['Historia ya Tanzania na Maadili', 'historia-ya-tanzania.jpg'],
   ['Hawa — The Bus Driver', 'hawa.jpeg'],
   ['Mabala — The Farmer', 'mabala.jpeg'],
   ['Book collection', 'book-collection.jpeg'],
];

/** Visual samples only: no orders, fabricated prices or database records. */
export default function SampleBooks({
   title = 'Books',
   covers = samples,
   backgroundImage,
}: {
   title?: string;
   covers?: SampleCover[];
   backgroundImage?: string;
}) {
   return (
      <section
         className={
            backgroundImage
               ? 'relative isolate py-14 md:py-20'
               : 'container pt-5 pb-12'
         }
         aria-label={`${title} samples`}
      >
         {backgroundImage && (
            <>
               <img
                  src={backgroundImage}
                  alt=""
                  aria-hidden="true"
                  loading="lazy"
                  className="absolute inset-0 -z-20 h-full w-full object-cover opacity-25 dark:opacity-15"
               />
               <div
                  aria-hidden="true"
                  className="absolute inset-0 -z-10 bg-background/50"
               />
            </>
         )}
         <div className={backgroundImage ? 'container' : undefined}>
            <ShelfHeading title={title} />
            <div
               className={`mx-auto grid grid-cols-1 gap-7 min-[420px]:grid-cols-2 md:grid-cols-3 ${covers.length <= 3 ? 'max-w-4xl lg:grid-cols-3' : 'lg:grid-cols-5'}`}
            >
               {covers.map(([title, file]) => (
                  <article
                     key={file}
                     className="ubi-book-tile border-r px-4 text-center"
                  >
                     <p className="mb-3 text-xs text-muted-foreground">
                        Sample book
                     </p>
                     <div className="mb-5 flex h-64 items-center justify-center">
                        <img
                           src={'/assets/images/book-samples/' + file}
                           alt={title}
                           loading="lazy"
                           className="h-full w-full object-contain"
                        />
                     </div>
                     <h3 className="text-base font-semibold">{title}</h3>
                     <p className="mt-3 text-lg font-bold text-emerald-700 dark:text-emerald-400">
                        {formatBookAmount(null)}
                     </p>
                  </article>
               ))}
            </div>
         </div>
      </section>
   );
}
