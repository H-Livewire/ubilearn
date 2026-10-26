import { Head, Link, usePage } from '@inertiajs/react';
import { Facebook, Heart, Linkedin, MessageCircle, Star } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
   addToCart,
   toggleFavoriteBook,
   useCart,
   useFavoriteBooks,
} from '@/lib/book-cart';
import { cn } from '@/lib/utils';
import LandingLayout from '@/layouts/landing';
import { BookShelf } from '../../components/book-display';
import { formatBookAmount } from '../../lib/book-price';
import { findSample, sampleBooks, sampleHref } from '../../lib/sample-books';

interface SampleReview {
   name: string;
   rating: number;
   text: string;
   at: string;
}

const REVIEWS_KEY = 'ubilearn_sample_reviews';

function readReviews(key: string): SampleReview[] {
   try {
      const all = JSON.parse(window.localStorage.getItem(REVIEWS_KEY) || '{}');

      return Array.isArray(all[key]) ? all[key] : [];
   } catch {
      return [];
   }
}

function writeReviews(key: string, reviews: SampleReview[]): void {
   try {
      const all = JSON.parse(window.localStorage.getItem(REVIEWS_KEY) || '{}');
      all[key] = reviews;
      window.localStorage.setItem(REVIEWS_KEY, JSON.stringify(all));
   } catch {
      // Storage unavailable: the review stays on screen only.
   }
}

const Sample = () => {
   const { props } = usePage<SharedData & { sampleKey: string }>();
   const { auth } = props;
   const slug = props.sampleKey;
   const book = findSample(slug);
   const { has } = useCart();
   const favorites = useFavoriteBooks();
   const [reviews, setReviews] = useState<SampleReview[]>([]);
   const [rating, setRating] = useState(5);
   const [text, setText] = useState('');

   useEffect(() => {
      setReviews(readReviews(slug));
   }, [slug]);

   if (!book) {
      return (
         <div className="container py-24 text-center">
            <Head title="Book not found" />
            <p className="mb-4 text-lg">Kitabu hakikupatikana.</p>
            <Link href="/products" className="text-emerald-700 underline">
               Rudi kwenye vitabu
            </Link>
         </div>
      );
   }

   const href = typeof window !== 'undefined' ? window.location.href : '';
   const inCart = has(book.id);
   const favorite = favorites.includes(book.id);
   const average = reviews.length
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
      : 0;
   const others = sampleBooks.filter((item) => item.id !== book.id);

   const submitReview = () => {
      const value = text.trim();

      if (!value || !auth.user) {
         return;
      }

      const next = [
         {
            name: auth.user.name,
            rating,
            text: value,
            at: new Date().toISOString(),
         },
         ...reviews,
      ];
      setReviews(next);
      writeReviews(slug, next);
      setText('');
      toast.success('Asante kwa maoni yako');
   };

   return (
      <div className="container py-8 md:py-12">
         <Head title={book.title} />
         <nav className="mb-8 flex items-center gap-2 text-sm">
            <Link href="/">Home</Link>
            <span className="text-muted-foreground">›</span>
            <span>Product details</span>
         </nav>

         <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:gap-24">
            <div className="mx-auto flex h-[420px] w-full max-w-lg items-center justify-center rounded-md bg-muted/40 p-4 shadow-lg md:h-[600px]">
               <img
                  src={book.thumbnail || '/assets/images/blank-image.jpg'}
                  alt={book.title}
                  className="h-full max-w-full rounded object-contain drop-shadow-xl"
               />
            </div>

            <div className="py-2 md:py-6">
               <p className="mb-3 text-sm">
                  Categories:{' '}
                  <span className="text-emerald-700 dark:text-emerald-400">
                     Sample
                  </span>
               </p>
               <h1 className="text-2xl font-bold md:text-3xl">{book.title}</h1>
               <dl className="my-6 space-y-2">
                  <div>
                     <dt className="inline">Availability: </dt>
                     <dd className="inline text-emerald-700 dark:text-emerald-400">
                        In stock
                     </dd>
                  </div>
                  <div>
                     <dt className="inline">Delivery: </dt>
                     <dd className="inline text-emerald-700 dark:text-emerald-400">
                        Digital download
                     </dd>
                  </div>
               </dl>
               <p className="mt-6 text-3xl font-bold text-emerald-700 dark:text-emerald-400">
                  {formatBookAmount(book.price)}
               </p>

               <div className="my-7 flex items-center gap-1.5 text-sm text-muted-foreground">
                  {[1, 2, 3, 4, 5].map((star) => (
                     <Star
                        key={star}
                        className={cn(
                           'h-4 w-4',
                           star <= Math.round(average) &&
                              'fill-emerald-700 text-emerald-700',
                        )}
                     />
                  ))}
                  <span className="ml-2">({reviews.length} Reviews)</span>
               </div>

               <div className="flex flex-wrap items-center gap-4">
                  <span className="text-sm">Qty</span>
                  <span
                     className="flex h-12 w-12 items-center justify-center rounded-full bg-muted font-semibold"
                     aria-label="One digital copy"
                  >
                     1
                  </span>
                  <Button
                     type="button"
                     variant="outline"
                     size="lg"
                     className="h-14 min-w-56 rounded-none border-2 border-[#047857] font-semibold tracking-wide text-[#047857] uppercase hover:bg-[#047857] hover:text-white"
                     onClick={() => {
                        const added = addToCart({
                           id: book.id,
                           title: book.title,
                           thumbnail: book.thumbnail || null,
                           price: Number(book.price) || 0,
                           href: sampleHref(book),
                        });
                        toast[added ? 'success' : 'info'](
                           added ? 'Added to cart' : 'Already in your cart',
                        );
                     }}
                  >
                     {inCart ? '✓ In cart' : '+ Add to cart'}
                  </Button>
               </div>

               <button
                  type="button"
                  onClick={() =>
                     toast.success(
                        toggleFavoriteBook(book.id)
                           ? 'Added to favorites'
                           : 'Removed from favorites',
                     )
                  }
                  className="mt-6 flex items-center gap-2 hover:text-emerald-700"
               >
                  <Heart
                     className={cn(
                        'h-5 w-5',
                        favorite && 'fill-red-500 text-red-500',
                     )}
                  />
                  {favorite ? 'In your wish list' : 'Add to wish list'}
               </button>

               <div className="mt-7 flex gap-3" aria-label="Share book">
                  {[
                     [
                        'Facebook',
                        `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(href)}`,
                        Facebook,
                     ],
                     [
                        'LinkedIn',
                        `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(href)}`,
                        Linkedin,
                     ],
                     [
                        'WhatsApp',
                        `https://wa.me/?text=${encodeURIComponent(`${book.title} ${href}`)}`,
                        MessageCircle,
                     ],
                  ].map(([label, url, Icon]) => {
                     const Glyph = Icon as typeof Facebook;

                     return (
                        <a
                           key={label as string}
                           aria-label={`Share on ${label as string}`}
                           href={url as string}
                           target="_blank"
                           rel="noopener noreferrer"
                           className="rounded-full bg-[#047857] p-3 text-white transition-colors hover:bg-emerald-900"
                        >
                           <Glyph className="h-5 w-5" />
                        </a>
                     );
                  })}
               </div>
            </div>
         </div>

         <section className="mt-16">
            <h2 className="relative border-b pb-4 text-center text-2xl font-bold uppercase">
               Reviews ({reviews.length})
               <span className="absolute bottom-0 left-1/2 h-0.5 w-32 -translate-x-1/2 bg-[#047857]" />
            </h2>
            <div className="mx-auto mt-8 max-w-3xl space-y-8">
               {auth.user ? (
                  <div className="space-y-3">
                     <div className="flex gap-1" role="radiogroup">
                        {[1, 2, 3, 4, 5].map((star) => (
                           <button
                              key={star}
                              type="button"
                              aria-label={`${star} stars`}
                              onClick={() => setRating(star)}
                           >
                              <Star
                                 className={cn(
                                    'h-6 w-6',
                                    star <= rating
                                       ? 'fill-amber-400 text-amber-400'
                                       : 'text-gray-300',
                                 )}
                              />
                           </button>
                        ))}
                     </div>
                     <textarea
                        value={text}
                        onChange={(event) => setText(event.target.value)}
                        maxLength={1000}
                        placeholder="Share your experience with this book"
                        className="min-h-24 w-full rounded-md border bg-background p-3 text-sm outline-none focus:border-[#047857] focus:ring-2 focus:ring-[#047857]/20"
                     />
                     <Button
                        type="button"
                        onClick={submitReview}
                        disabled={!text.trim()}
                        className="bg-[#047857] hover:bg-emerald-900"
                     >
                        Submit Review
                     </Button>
                  </div>
               ) : (
                  <p className="text-center text-sm">
                     <a
                        href={`/auth/continue?to=${encodeURIComponent(
                           typeof window !== 'undefined'
                              ? window.location.pathname
                              : '/',
                        )}`}
                        className="font-semibold text-[#047857] underline"
                     >
                        Login
                     </a>{' '}
                     to write a review.
                  </p>
               )}

               {reviews.length === 0 ? (
                  <p className="text-center text-muted-foreground">
                     No reviews yet.
                  </p>
               ) : (
                  reviews.map((review, index) => (
                     <div key={index} className="flex gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#047857] text-sm font-semibold text-white">
                           {review.name.charAt(0).toUpperCase()}
                        </span>
                        <div>
                           <p className="font-semibold">{review.name}</p>
                           <div className="flex items-center gap-2">
                              <div className="flex gap-0.5">
                                 {[1, 2, 3, 4, 5].map((star) => (
                                    <Star
                                       key={star}
                                       className={cn(
                                          'h-4 w-4',
                                          star <= review.rating
                                             ? 'fill-amber-400 text-amber-400'
                                             : 'text-gray-300',
                                       )}
                                    />
                                 ))}
                              </div>
                              <span className="text-xs text-muted-foreground">
                                 {new Date(review.at).toLocaleDateString()}
                              </span>
                           </div>
                           <p className="mt-2 text-sm [overflow-wrap:anywhere] whitespace-pre-wrap">
                              {review.text}
                           </p>
                        </div>
                     </div>
                  ))
               )}
            </div>
         </section>

         <div className="mt-16">
            <BookShelf title="Related products" books={others} />
         </div>
      </div>
   );
};

Sample.layout = (page: ReactNode) => <LandingLayout>{page}</LandingLayout>;

export default Sample;
