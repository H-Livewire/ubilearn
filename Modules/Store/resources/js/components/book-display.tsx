import {
   Carousel,
   CarouselContent,
   CarouselItem,
} from '@/components/ui/carousel';
import type { CarouselApi } from '@/components/ui/carousel';
import { cn } from '@/lib/utils';
import { details, shop } from '@/routes/products';
import { Link } from '@inertiajs/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { formatBookAmount } from '../lib/book-price';

export function BookPrice({ book }: { book: Product }) {
   const amount = formatBookAmount;
   const saving =
      book.pricing_type === 'paid' &&
      book.discount &&
      Number(book.price) > Number(book.discount_price)
         ? Math.round(
              (1 - Number(book.discount_price) / Number(book.price)) * 100,
           )
         : 0;

   return (
      <div className="flex flex-wrap items-center justify-center gap-1.5 text-sm">
         <span className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
            {book.pricing_type === 'free'
               ? 'TSh 0'
               : amount(saving ? book.discount_price : book.price)}
         </span>
         {saving > 0 && (
            <>
               <span className="text-xs text-muted-foreground line-through">
                  {amount(book.price)}
               </span>
               <span className="rounded-sm bg-emerald-800 px-1.5 py-0.5 font-bold text-white">
                  -{saving}%
               </span>
            </>
         )}
      </div>
   );
}

export function BookTile({
   book,
   compact = false,
}: {
   book: Product;
   compact?: boolean;
}) {
   const href = book.is_sample
      ? shop.url({ category: 'all' }, { query: { browse: 1 } })
      : details({ slug: book.slug, id: book.id });

   if (compact) {
      return (
         <article className="ubi-book-tile flex min-w-0 items-center gap-5 py-5 md:gap-7">
            <Link href={href} className="w-24 shrink-0 sm:w-28">
               <img
                  src={book.thumbnail || '/assets/images/blank-image.jpg'}
                  alt={book.title}
                  loading="lazy"
                  className="h-40 w-full object-contain"
               />
            </Link>
            <div className="min-w-0">
               <p className="mb-2 text-xs text-muted-foreground">
                  {book.is_sample
                     ? 'Sample book'
                     : book.instructor?.user?.name ||
                       book.product_category?.title}
               </p>
               <Link
                  href={href}
                  className="mb-4 block text-base font-medium hover:text-emerald-700 dark:hover:text-emerald-400"
               >
                  {book.title}
               </Link>
               <BookPrice book={book} />
            </div>
         </article>
      );
   }

   return (
      <article className="ubi-book-tile h-full px-4 text-center sm:px-6">
         <p className="mb-3 truncate text-xs text-muted-foreground">
            {book.is_sample
               ? 'Sample book'
               : book.instructor?.user?.name ||
                 book.product_category?.title ||
                 'UbiLearn'}
         </p>
         <Link href={href} className="mb-5 block">
            <img
               src={book.thumbnail || '/assets/images/blank-image.jpg'}
               alt={book.title}
               loading="lazy"
               className="mx-auto h-56 w-full object-contain transition-transform duration-300 hover:-translate-y-1 motion-reduce:transform-none md:h-64"
            />
         </Link>
         <Link
            href={href}
            className="mb-3 line-clamp-2 flex h-12 items-center justify-center text-sm font-medium hover:text-emerald-700 dark:hover:text-emerald-400"
         >
            {book.title}
         </Link>
         <BookPrice book={book} />
      </article>
   );
}

export function ShelfHeading({ title }: { title: string }) {
   return (
      <div className="relative mb-12 border-b pb-7 text-center">
         <h2 className="text-xl font-bold uppercase">{title}</h2>
         <span className="absolute -bottom-px left-1/2 h-0.5 w-36 -translate-x-1/2 bg-emerald-700 dark:bg-emerald-400" />
      </div>
   );
}

export function BookShelf({
   title,
   books,
   background = false,
   backgroundImage = '/assets/images/books-reading-background.png',
}: {
   title: string;
   books: Product[];
   background?: boolean;
   backgroundImage?: string;
}) {
   const [api, setApi] = useState<CarouselApi>();
   const [selected, setSelected] = useState(0);
   const [snaps, setSnaps] = useState<number[]>([]);
   useEffect(() => {
      if (!api) {
         return;
      }

      const update = () => {
         setSnaps(api.scrollSnapList());
         setSelected(api.selectedScrollSnap());
      };
      update();
      api.on('select', update);
      api.on('reInit', update);

      return () => {
         api.off('select', update);
         api.off('reInit', update);
      };
   }, [api]);

   return (
      <section
         className={cn('relative py-14 md:py-20', background && 'bg-muted/30')}
      >
         {background && (
            <>
               <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-cover bg-center opacity-25 dark:opacity-10"
                  style={{
                     backgroundImage: `url("${backgroundImage}")`,
                  }}
               />
               <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-background/45"
               />
            </>
         )}
         <div className="relative container">
            <ShelfHeading title={title} />
            {books.length ? (
               <Carousel
                  setApi={setApi}
                  opts={{ align: 'start', slidesToScroll: 'auto' }}
               >
                  <CarouselContent className="ml-0">
                     {books.map((book) => (
                        <CarouselItem
                           key={book.id}
                           className="basis-full border-r pl-0 min-[420px]:basis-1/2 md:basis-1/3 lg:basis-1/5"
                        >
                           <BookTile book={book} />
                        </CarouselItem>
                     ))}
                  </CarouselContent>
                  <div className="mt-10 flex items-center justify-center gap-3">
                     {snaps.length > 1 && (
                        <button
                           type="button"
                           aria-label={`Previous ${title}`}
                           onClick={() => api?.scrollPrev()}
                           disabled={!api?.canScrollPrev()}
                           className="p-2 text-muted-foreground disabled:opacity-25"
                        >
                           <ChevronLeft className="h-4 w-4" />
                        </button>
                     )}
                     {snaps.map((_, index) => (
                        <button
                           type="button"
                           key={index}
                           aria-label={`${title} page ${index + 1}`}
                           aria-current={
                              selected === index ? 'true' : undefined
                           }
                           onClick={() => api?.scrollTo(index)}
                           className={cn(
                              'h-3 w-3 rounded-full',
                              selected === index
                                 ? 'bg-emerald-700 dark:bg-emerald-400'
                                 : 'bg-muted-foreground/25',
                           )}
                        />
                     ))}
                     {snaps.length > 1 && (
                        <button
                           type="button"
                           aria-label={`Next ${title}`}
                           onClick={() => api?.scrollNext()}
                           disabled={!api?.canScrollNext()}
                           className="p-2 text-muted-foreground disabled:opacity-25"
                        >
                           <ChevronRight className="h-4 w-4" />
                        </button>
                     )}
                  </div>
               </Carousel>
            ) : (
               <p className="py-12 text-center text-sm text-muted-foreground">
                  No {title.toLowerCase()} available yet.
               </p>
            )}
         </div>
      </section>
   );
}
