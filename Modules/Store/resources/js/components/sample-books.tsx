import { formatBookAmount } from '../lib/book-price';
import { ShelfHeading } from './book-display';

const samples = [
   ['Unanswered Cries', 'unanswered-cries.jpeg'],
   ['Historia ya Tanzania na Maadili', 'historia-ya-tanzania.jpg'],
   ['Hawa — The Bus Driver', 'hawa.jpeg'],
   ['Mabala — The Farmer', 'mabala.jpeg'],
   ['Book collection', 'book-collection.jpeg'],
];

/** Visual samples only: no orders, fabricated prices or database records. */
export default function SampleBooks() {
   return (
      <section className="container pt-5 pb-12" aria-label="Sample books">
         <ShelfHeading title="Books" />
         <div className="grid grid-cols-1 gap-7 min-[420px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
            {samples.map(([title, file]) => (
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
      </section>
   );
}
