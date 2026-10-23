import TableFooter from '@/components/table/table-footer';
import { Button } from '@/components/ui/button';
import LandingLayout from '@/layouts/landing';
import { getQueryParams } from '@/lib/route';
import { cn } from '@/lib/utils';
import { details, shop } from '@/routes/products';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { Eye, Search, ShoppingBag } from 'lucide-react';
import { useState  } from 'react';
import type {ReactNode} from 'react';
import { BookPrice, BookShelf, BookTile } from '../../components/book-display';
import ProductWishlistHandler from '../../components/wishlist-handler';

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
   const [offerIndex, setOfferIndex] = useState(0);
   const [search, setSearch] = useState(params.products_search || '');
   const offer = shelves.special_offers[offerIndex];
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
               <select
                  aria-label="Book category"
                  value={category?.slug || 'all'}
                  onChange={(e) =>
                     router.get(shop.url({ category: e.target.value }))
                  }
                  className="max-w-48 rounded border bg-background px-3 py-2"
               >
                  <option value="all">All categories</option>
                  {categories
                     .filter((c) => c.slug !== 'default')
                     .map((c) => (
                        <option key={c.id} value={c.slug}>
                           {c.title}
                        </option>
                     ))}
               </select>
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
                     <aside className="overflow-hidden bg-background text-center">
                        <h1 className="bg-emerald-700 px-4 py-3 text-2xl font-semibold text-white">
                           Special offer
                        </h1>
                        {offer ? (
                           <div className="px-6 py-7">
                              <p className="mb-3 text-xs text-muted-foreground">
                                 {offer.instructor?.user?.name ||
                                    offer.product_category?.title}
                              </p>
                              <Link
                                 href={details({
                                    slug: offer.slug,
                                    id: offer.id,
                                 })}
                                 className="mb-6 block text-xl font-semibold"
                              >
                                 {offer.title}
                              </Link>
                              <div className="relative mx-auto max-w-64">
                                 <Link
                                    href={details({
                                       slug: offer.slug,
                                       id: offer.id,
                                    })}
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
                                    <Button
                                       asChild
                                       variant="ghost"
                                       size="icon"
                                       aria-label="Buy offer"
                                    >
                                       <Link
                                          href={details({
                                             slug: offer.slug,
                                             id: offer.id,
                                          })}
                                       >
                                          <ShoppingBag className="h-4 w-4" />
                                       </Link>
                                    </Button>
                                    <ProductWishlistHandler
                                       product={offer}
                                       wishlists={wishlists}
                                    />
                                    <Button
                                       asChild
                                       variant="ghost"
                                       size="icon"
                                       aria-label="View offer"
                                    >
                                       <Link
                                          href={details({
                                             slug: offer.slug,
                                             id: offer.id,
                                          })}
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
                                 Download after purchase
                              </p>
                              <div className="mt-7 flex justify-center gap-2">
                                 {shelves.special_offers.map((book, index) => (
                                    <button
                                       key={book.id}
                                       type="button"
                                       aria-label={`Offer ${index + 1}`}
                                       aria-current={
                                          offerIndex === index
                                             ? 'true'
                                             : undefined
                                       }
                                       onClick={() => setOfferIndex(index)}
                                       className={cn(
                                          'h-3 w-3 rounded-full',
                                          offerIndex === index
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
                        <div
                           className="mx-auto mb-8 flex max-w-xl border"
                           role="tablist"
                           aria-label="Book collections"
                        >
                           {(
                              [
                                 ['new_arrivals', 'New arrivals'],
                                 ['featured', 'Featured books'],
                                 ['most_viewed', 'Most viewed'],
                              ] as const
                           ).map(([key, label]) => (
                              <button
                                 type="button"
                                 role="tab"
                                 aria-selected={tab === key}
                                 id={`tab-${key}`}
                                 aria-controls="collection-panel"
                                 key={key}
                                 onClick={() => setTab(key)}
                                 className={cn(
                                    'flex-1 border-b-2 px-2 py-4 text-sm font-bold',
                                    tab === key
                                       ? 'border-emerald-700 text-emerald-700 dark:text-emerald-400'
                                       : 'border-transparent text-muted-foreground',
                                 )}
                              >
                                 {label}
                              </button>
                           ))}
                        </div>
                        <div
                           id="collection-panel"
                           role="tabpanel"
                           aria-labelledby={`tab-${tab}`}
                           className="grid gap-x-9 sm:grid-cols-2"
                        >
                           {shelves[tab].slice(0, 8).map((book) => (
                              <BookTile compact key={book.id} book={book} />
                           ))}
                        </div>
                        {!shelves[tab].length && (
                           <p className="py-20 text-center text-sm text-muted-foreground">
                              No books in this collection yet.
                           </p>
                        )}
                     </div>
                  </div>
               </section>
               <BookShelf title="Best sellers" books={shelves.best_sellers} />
               <BookShelf title="Children’s books" books={shelves.children} />
               <BookShelf
                  title="Best seller books"
                  books={shelves.best_sellers}
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
