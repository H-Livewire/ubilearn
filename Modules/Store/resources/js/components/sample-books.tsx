import { toast } from 'sonner';
import { toggleWantToRead, useWantToRead } from '@/lib/book-cart';
import { cn } from '@/lib/utils';
import { formatBookAmount } from '../lib/book-price';
import {
   sampleBooks,
   sampleId,
   sampleKey,
   samplePrices,
   schoolCovers,
} from '../lib/sample-books';
import { BookFavorite, BookHoverActions } from './book-actions';
import { ShelfHeading } from './book-display';

function sampleProduct(
   title: string,
   file: string,
   price: number,
): Product {
   return {
      ...sampleBooks[0],
      id: sampleId(file),
      title,
      slug: `sample-${sampleKey(file)}`,
      price,
      thumbnail: `/assets/images/book-samples/${file}`,
      is_sample: true,
   };
}


type SampleCover = [title: string, file: string];

export const schoolBookSamples: SampleCover[] = schoolCovers;

const samples: SampleCover[] = [
   ['Unanswered Cries', 'unanswered-cries.jpeg'],
   ['Historia ya Tanzania na Maadili', 'historia-ya-tanzania.jpg'],
   ['Hawa — The Bus Driver', 'hawa.jpeg'],
   ['Mabala — The Farmer', 'mabala.jpeg'],
   ['Book collection', 'book-collection.jpeg'],
];

/** Illustrative samples only; never purchasable and never stored as products. */
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
               {covers.map(([title, file], index) => (
                  <article
                     key={file}
                     className="ubi-book-tile border-r px-4 text-center dark:border-white/40"
                  >
                     <p className="mb-3 text-xs text-muted-foreground">
                        Sample book
                     </p>
                     <div className="group relative mb-5 flex h-64 items-center justify-center">
                        <img
                           src={'/assets/images/book-samples/' + file}
                           alt={title}
                           loading="lazy"
                           className="h-full w-full object-contain"
                        />
                        <BookFavorite
                           book={sampleProduct(
                              title,
                              file,
                              samplePrices[index % samplePrices.length],
                           )}
                        />
                        <BookHoverActions
                           book={sampleProduct(
                              title,
                              file,
                              samplePrices[index % samplePrices.length],
                           )}
                           href={`/books/sample/${sampleKey(file)}`}
                        />
                     </div>
                     <h3 className="text-base font-semibold">{title}</h3>
                     <p className="mt-3 text-lg font-bold text-emerald-700 dark:text-emerald-400">
                        {formatBookAmount(
                           samplePrices[index % samplePrices.length],
                        )}
                     </p>
                  </article>
               ))}
            </div>
         </div>
      </section>
   );
}

const FREE_BACKGROUND = '/assets/images/free-online-books.jpg';
const FREE_BACKGROUND_FALLBACK = '/assets/images/bookglow-library.jpg';

/** Free online books preview with a "Want to Read" list kept in this browser. */
export function FreeOnlineBooks() {
   const wanted = useWantToRead();

   return (
      <section
         className="relative isolate py-14 md:py-20"
         aria-label="Free online books"
      >
         <img
            src={FREE_BACKGROUND}
            alt=""
            aria-hidden="true"
            loading="lazy"
            onError={(event) => {
               if (!event.currentTarget.src.endsWith(FREE_BACKGROUND_FALLBACK)) {
                  event.currentTarget.src = FREE_BACKGROUND_FALLBACK;
               }
            }}
            className="absolute inset-0 -z-20 h-full w-full object-cover"
         />
         <div
            aria-hidden="true"
            className="absolute inset-0 -z-10 bg-background/85 dark:bg-background/90"
         />
         <div className="container">
            <ShelfHeading title="Free online books" />
            <div className="mx-auto grid grid-cols-1 gap-7 min-[420px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
               {samples.map(([title, file]) => {
                  const book = sampleProduct(title, file, 0);
                  const isWanted = wanted.includes(book.id);

                  return (
                     <article
                        key={file}
                        className="ubi-book-tile px-4 text-center"
                     >
                        <p className="mb-3 text-xs text-muted-foreground">
                           Free book
                        </p>
                        <div className="relative mb-5 flex h-64 items-center justify-center">
                           <img
                              src={'/assets/images/book-samples/' + file}
                              alt={title}
                              loading="lazy"
                              className="h-full w-full object-contain"
                           />
                        </div>
                        <h3 className="mb-4 line-clamp-2 min-h-12 text-base font-semibold">
                           {title}
                        </h3>
                        <button
                           type="button"
                           aria-pressed={isWanted}
                           onClick={() => {
                              const on = toggleWantToRead(book.id);
                              toast.success(
                                 on
                                    ? 'Added to your reading list'
                                    : 'Removed from your reading list',
                              );
                           }}
                           className={cn(
                              'w-full rounded-full border border-[#047857] px-4 py-2 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-[#047857] focus-visible:ring-offset-2 focus-visible:outline-none',
                              isWanted
                                 ? 'bg-[#047857] text-white'
                                 : 'bg-background/80 text-[#047857] hover:bg-[#047857] hover:text-white',
                           )}
                        >
                           {isWanted ? '✓ Want to Read' : 'Want to Read'}
                        </button>
                     </article>
                  );
               })}
            </div>
         </div>
      </section>
   );
}
