import TableFooter from '@/components/table/table-footer';
import { Button } from '@/components/ui/button';
import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuRadioGroup,
   DropdownMenuRadioItem,
   DropdownMenuLabel,
   DropdownMenuSeparator,
   DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import LandingLayout from '@/layouts/landing';
import { getQueryParams } from '@/lib/route';
import { cn } from '@/lib/utils';
import { details, shop } from '@/routes/products';
import { Head, Link, router, usePage } from '@inertiajs/react';
import {
   ChevronDown,
   Eye,
   Search,
   ShoppingBag,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { BookPrice, BookShelf, BookTile } from '../../components/book-display';
import BookHeroCarousel from '../../components/book-hero-carousel';
import SampleBooks, {
   FreeOnlineBooks,
   schoolBookSamples,
} from '../../components/sample-books';
import ProductWishlistHandler from '../../components/wishlist-handler';
import {
   sampleBooks,
   sampleHref,
   sampleOffers,
   withBookSamples,
} from '../../lib/sample-books';

const Index = ({
   products,
   wishlists,
   shelves,
   categories,
   category,
}: ProductsIndexProps) => {
   const { url } = usePage();
   const params = getQueryParams(url);
   const [tab, setTab] = useState<'new_arrivals' | 'featured' | 'most_viewed'>(
      'new_arrivals',
   );
   const displayShelves = {
      ...shelves,
      new_arrivals: withBookSamples(shelves.new_arrivals),
      featured: withBookSamples(shelves.featured, [...sampleBooks].reverse()),
      most_viewed: withBookSamples(shelves.most_viewed, [
         ...sampleBooks.slice(2),
         ...sampleBooks.slice(0, 2),
      ]),
      best_sellers: withBookSamples(shelves.best_sellers),
      children: withBookSamples(shelves.children),
   };
   const offers = withBookSamples(shelves.special_offers, sampleOffers);
   const [offerIndex, setOfferIndex] = useState(0);
   const [search, setSearch] = useState(params.products_search || '');
   const [offerPaused, setOfferPaused] = useState(false);
   const offerActive = offers.length ? offerIndex % offers.length : 0;
   const offer = offers[offerActive];
   useEffect(() => {
      const motion = window.matchMedia('(prefers-reduced-motion: reduce)');

      if (
         offerPaused ||
         offers.length < 2 ||
         motion.matches
      ) {
         return;
      }

      const timer = window.setInterval(() => {
         if (!document.hidden) {
            setOfferIndex((index) => (index + 1) % offers.length);
         }
      }, 7000);
      const stop = () => {
         if (motion.matches) {
            window.clearInterval(timer);
         }
      };
      motion.addEventListener('change', stop);

      return () => {
         window.clearInterval(timer);
         motion.removeEventListener('change', stop);
      };
   }, [offerPaused, offers.length]);
   const browsing = params.browse === '1' || Boolean(params.products_search);

   return (
      <>
         <Head title="Books" />
         <div className="container flex flex-wrap items-center justify-between gap-4 border-b py-5">
            <nav
               aria-label="Book categories"
               className="flex items-center gap-3 text-sm"
            >
               <Link href="/">Home</Link>
               <span className="text-muted-foreground">/</span>
               <Link href={shop.url()}>Books</Link>
               <DropdownMenu>
                  <DropdownMenuTrigger
                     className="group flex items-center gap-2 py-2 font-semibold transition-colors outline-none hover:text-emerald-700 focus-visible:ring-2 focus-visible:ring-emerald-700 dark:hover:text-emerald-400"
                     aria-label="Browse book categories"
                  >
                     {category?.title || 'Browse categories'}
                     <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                     align="start"
                     sideOffset={14}
                     className="max-h-80 w-72 overflow-y-auto rounded-xl border-border/70 p-2 shadow-xl"
                  >
                     <DropdownMenuLabel className="px-3 py-2 text-xs tracking-wider text-muted-foreground uppercase">
                        Book collections
                     </DropdownMenuLabel>
                     <DropdownMenuSeparator />
                     <DropdownMenuRadioGroup
                        value={category?.slug || 'all'}
                        onValueChange={(value) =>
                           router.get(shop.url({ category: value }))
                        }
                     >
                        <DropdownMenuRadioItem
                           value="all"
                           className="cursor-pointer rounded-lg py-3"
                        >
                           All books
                        </DropdownMenuRadioItem>
                        {categories
                           .filter((c) => c.slug !== 'default')
                           .map((c) => (
                              <DropdownMenuRadioItem
                                 key={c.id}
                                 value={c.slug}
                                 className="cursor-pointer rounded-lg py-3"
                              >
                                 {c.title}
                              </DropdownMenuRadioItem>
                           ))}
                     </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
               </DropdownMenu>
            </nav>
            <form
               onSubmit={(e) => {
                  e.preventDefault();
                  router.get(shop.url({ category: category?.slug || 'all' }), {
                     products_search: search,
                     browse: 1,
                  });
               }}
               className="flex items-center gap-2 border-b"
            >
               <input
                  aria-label="Search books"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search books"
                  className="w-44 bg-transparent py-2 text-sm outline-none"
               />
               <button aria-label="Search" type="submit" className="p-2">
                  <Search className="h-4 w-4" />
               </button>
            </form>
         </div>
         {!browsing && <BookHeroCarousel />}
         {!browsing && shelves.new_arrivals.length === 0 && <SampleBooks />}
         {browsing ? (
            <section className="container py-12">
               <div className="mb-8 flex items-center justify-between">
                  <h1 className="text-2xl font-bold">
                     {search
                        ? `Results for “${params.products_search}”`
                        : 'All books'}
                  </h1>
                  <Link
                     href={shop.url()}
                     className="text-sm text-emerald-700 dark:text-emerald-400"
                  >
                     Back to books
                  </Link>
               </div>
               <div className="grid grid-cols-1 gap-x-0 gap-y-10 min-[420px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
                  {products.data.map((book) => (
                     <BookTile key={book.id} book={book} />
                  ))}
               </div>
               {!products.data.length && (
                  <p className="py-12 text-center text-muted-foreground">
                     No books found.
                  </p>
               )}
               <TableFooter
                  className="mt-10"
                  routeName="products.shop"
                  paginationInfo={products}
                  paginationKey="products"
               />
            </section>
         ) : (
            <>
               <section className="bg-muted/25 py-10 md:py-14">
                  <div className="container grid items-stretch gap-7 lg:grid-cols-[minmax(240px,1fr)_minmax(0,2fr)]">
                     <aside
                        className="relative overflow-hidden bg-background text-center"
                        onMouseEnter={() => setOfferPaused(true)}
                        onMouseLeave={() => setOfferPaused(false)}
                        onFocusCapture={() => setOfferPaused(true)}
                        onBlurCapture={(event) => {
                           if (
                              !event.currentTarget.contains(event.relatedTarget)
                           ) {
                              setOfferPaused(false);
                           }
                        }}
                     >
                        <h1 className="bg-emerald-700 px-4 py-3 text-2xl font-semibold text-white">
                           Special offer
                        </h1>
                        {offer ? (
                           <div
                              key={offer.id}
                              className="ubi-offer-content px-6 py-7"
                              aria-live={offerPaused ? 'polite' : 'off'}
                           >
                              <p className="mb-3 text-xs text-muted-foreground">
                                 {offer.is_sample
                                    ? 'Sample offer'
                                    : offer.instructor?.user?.name ||
                                      offer.product_category?.title}
                              </p>
                              <Link
                                 href={
                                    offer.is_sample
 ? sampleHref(offer)
 : details({ slug: offer.slug, id: offer.id })
                                 }
                                 className="mb-6 block text-xl font-semibold"
                              >
                                 {offer.title}
                              </Link>
                              <div className="relative mx-auto max-w-64">
                                 <Link
                                    href={
                                       offer.is_sample
 ? sampleHref(offer)
 : details({ slug: offer.slug, id: offer.id })
                                    }
                                 >
                                    <img
                                       src={
                                          offer.thumbnail ||
                                          '/assets/images/blank-image.jpg'
                                       }
                                       alt={offer.title}
                                       className="mx-auto h-80 w-full object-contain md:h-96"
                                    />
                                 </Link>
                                 <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 items-center bg-background shadow-lg">
                                    {!offer.is_sample && (
                                       <Button
                                          asChild
                                          variant="ghost"
                                          size="icon"
                                          aria-label="Buy offer"
                                       >
                                          <Link
                                             href={
                                                offer.is_sample
 ? sampleHref(offer)
 : details({ slug: offer.slug, id: offer.id })
                                             }
                                          >
                                             <ShoppingBag className="h-4 w-4" />
                                          </Link>
                                       </Button>
                                    )}
                                    {!offer.is_sample && (
                                       <ProductWishlistHandler
                                          product={offer}
                                          wishlists={wishlists}
                                       />
                                    )}
                                    <Button
                                       asChild
                                       variant="ghost"
                                       size="icon"
                                       aria-label="View offer"
                                    >
                                       <Link
                                          href={
                                             offer.is_sample
 ? sampleHref(offer)
 : details({ slug: offer.slug, id: offer.id })
                                          }
                                       >
                                          <Eye className="h-4 w-4" />
                                       </Link>
                                    </Button>
                                 </div>
                              </div>
                              <div className="mt-6">
                                 <BookPrice book={offer} />
                              </div>
                              <p className="mx-auto mt-7 max-w-64 border px-4 py-4 text-sm text-muted-foreground">
                                 {offer.is_sample
                                    ? 'Sample price · preview only'
                                    : 'Download after purchase'}
                              </p>
                              <div className="mt-7 flex justify-center gap-2">
                                 {offers.map((book, index) => (
                                    <button
                                       key={book.id}
                                       type="button"
                                       aria-label={`Offer ${index + 1}`}
                                       aria-current={
                                          offerActive === index
                                             ? 'true'
                                             : undefined
                                       }
                                       onClick={() => setOfferIndex(index)}
                                       className={cn(
                                          'h-3 w-3 rounded-full',
                                          offerActive === index
                                             ? 'bg-emerald-700'
                                             : 'bg-muted-foreground/25',
                                       )}
                                    />
                                 ))}
                              </div>
                           </div>
                        ) : (
                           <p className="px-6 py-24 text-sm text-muted-foreground">
                              Special offers will appear here when discounted
                              books are published.
                           </p>
                        )}
                     </aside>
                     <div className="min-w-0 bg-background px-5 py-8 md:px-9">
                        <Tabs
                           value={tab}
                           onValueChange={(value) =>
                              setTab(value as typeof tab)
                           }
                        >
                           <TabsList
                              aria-label="Book collections"
                              className="mx-auto mb-8 flex h-auto max-w-xl rounded-none border bg-transparent p-0"
                           >
                              {(
                                 [
                                    ['new_arrivals', 'New arrivals'],
                                    ['featured', 'Featured books'],
                                    ['most_viewed', 'Most viewed'],
                                 ] as const
                              ).map(([key, label]) => (
                                 <TabsTrigger
                                    key={key}
                                    value={key}
                                    className="flex-1 rounded-none border-b-2 border-transparent px-2 py-4 text-sm font-bold data-[state=active]:bg-transparent data-[state=active]:text-emerald-700 data-[state=active]:shadow-none dark:data-[state=active]:text-emerald-400"
                                 >
                                    {label}
                                 </TabsTrigger>
                              ))}
                           </TabsList>
                           {(
                              [
                                 'new_arrivals',
                                 'featured',
                                 'most_viewed',
                              ] as const
                           ).map((key) => (
                              <TabsContent
                                 key={key}
                                 value={key}
                                 className="grid gap-x-9 sm:grid-cols-2"
                              >
                                 {displayShelves[key]
                                    .slice(0, 8)
                                    .map((book) => (
                                       <BookTile
                                          compact
                                          key={book.id}
                                          book={book}
                                       />
                                    ))}
                              </TabsContent>
                           ))}
                        </Tabs>
                     </div>
                  </div>
               </section>
               <BookShelf
                  title="Best sellers"
                  books={displayShelves.best_sellers}
               />
               <div aria-hidden="true" className="h-10 bg-white md:h-16" />
               <BookShelf
                  title="Children’s books"
                  books={displayShelves.children}
                  background
                  backgroundImage="/assets/images/books-children-reading.jpeg"
               />
               <div aria-hidden="true" className="h-10 bg-white md:h-16" />
               {shelves.school.length > 0 ? (
                  <BookShelf
                     title="School books"
                     books={shelves.school}
                     background
                     backgroundImage="/assets/images/school-books-background.jpeg"
                  />
               ) : (
                  <SampleBooks
                     title="School books"
                     covers={schoolBookSamples}
                     backgroundImage="/assets/images/school-books-background.jpeg"
                  />
               )}

               <div aria-hidden="true" className="h-10 bg-white md:h-16" />
               <FreeOnlineBooks />

               <div aria-hidden="true" className="h-10 bg-white md:h-16" />
               <BookShelf
                  title="Best seller books"
                  books={displayShelves.best_sellers}
                  background
               />
               <div className="container py-8 text-center">
                  <Button asChild variant="outline">
                     <Link
                        href={shop.url(
                           { category: category?.slug || 'all' },
                           { query: { browse: 1 } },
                        )}
                     >
                        Browse all books
                     </Link>
                  </Button>
               </div>
            </>
         )}
      </>
   );
};
Index.layout = (page: ReactNode) => <LandingLayout>{page}</LandingLayout>;
export default Index;
