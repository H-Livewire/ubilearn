import { Renderer } from '@/components/rich-editor';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import LandingLayout from '@/layouts/landing';
import { systemCurrency } from '@/lib/utils';
import payments from '@/routes/payments';
import { store as storeProductOrder } from '@/routes/product-orders';
import { shop } from '@/routes/products';
import productFiles from '@/routes/products/files';
import { Head, Link, router, usePage } from '@inertiajs/react';
import {
   Star,
   Download,
   ShoppingBag,
   Facebook,
   Linkedin,
   MessageCircle,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { BookShelf } from '../../components/book-display';
import ProductWishlistHandler from '../../components/wishlist-handler';
import Reviews from './partials/reviews';

const Show = () => {
   const { props } = usePage<ProductDetailsProps>();
   const { product, order, wishlists, auth, relatedBooks = [] } = props;
   const { amount } = systemCurrency(props.system.fields['selling_currency']);
   const [activeImage, setActiveImage] = useState(
      product.thumbnail || product.images?.[0]?.url,
   );

   const outOfStock =
      !product.unlimited_inventory &&
      typeof product.inventory === 'number' &&
      product.inventory <= 0;

   return (
      <div className="container py-8 md:py-12">
         <Head title={product.title} />
         <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/">Home</Link>
            <span>/</span>
            <Link href={shop.url()}>Books</Link>
            {product.product_category && (
               <>
                  <span>/</span>
                  <span>{product.product_category.title}</span>
               </>
            )}
         </div>

         <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:gap-24">
            <div>
               <div className="relative mx-auto flex h-[420px] max-w-lg items-center justify-center bg-muted/40 p-3 shadow-lg md:h-[620px]">
                  <img
                     src={activeImage || '/assets/images/blank-image.jpg'}
                     alt={product.title}
                     className="h-full max-w-full object-contain drop-shadow-xl"
                  />
               </div>
               {product.images && product.images.length > 0 && (
                  <div className="mt-3 flex gap-2 overflow-x-auto">
                     {[
                        ...(product.thumbnail
                           ? [{ id: 0, url: product.thumbnail }]
                           : []),
                        ...product.images,
                     ].map((image) => (
                        <button
                           key={image.id}
                           type="button"
                           onClick={() => setActiveImage(image.url)}
                           className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border"
                        >
                           <img
                              src={image.url}
                              alt=""
                              className="h-full w-full object-cover"
                           />
                        </button>
                     ))}
                  </div>
               )}
            </div>

            <div className="py-2 md:py-6">
               {product.product_category && (
                  <Link
                     href={shop.url({
                        category: product.product_category.slug,
                     })}
                     className="mb-4 inline-block text-sm font-semibold text-emerald-700 dark:text-emerald-400"
                  >
                     {product.product_category.title}
                  </Link>
               )}
               <h1 className="text-2xl font-bold md:text-3xl">
                  {product.title}
               </h1>

               <dl className="my-6 space-y-2 text-base">
                  {product.specifications?.map((spec) => (
                     <div key={spec.id}>
                        <dt className="inline">{spec.title}: </dt>
                        <dd className="inline text-emerald-700 dark:text-emerald-400">
                           {spec.value}
                        </dd>
                     </div>
                  ))}
                  <div>
                     <dt className="inline">Availability: </dt>
                     <dd className="inline text-emerald-700 dark:text-emerald-400">
                        {outOfStock ? 'Out of stock' : 'In stock'}
                     </dd>
                  </div>
                  <div>
                     <dt className="inline">Delivery: </dt>
                     <dd className="inline text-emerald-700 dark:text-emerald-400">
                        Digital download
                     </dd>
                  </div>
               </dl>
               <div className="mt-4 flex items-center gap-3">
                  {product.pricing_type === 'free' ? (
                     <span className="text-3xl font-bold text-emerald-700 dark:text-emerald-400">
                        Free
                     </span>
                  ) : product.discount ? (
                     <>
                        <span className="text-3xl font-bold text-emerald-700 dark:text-emerald-400">
                           {amount(product.discount_price as number)}
                        </span>
                        <span className="text-lg text-muted-foreground line-through">
                           {amount(product.price as number)}
                        </span>
                     </>
                  ) : (
                     <span className="text-3xl font-bold text-emerald-700 dark:text-emerald-400">
                        {amount(product.price as number)}
                     </span>
                  )}
               </div>

               <div className="my-7 flex items-center gap-1.5 text-sm text-muted-foreground">
                  {[1, 2, 3, 4, 5].map((star) => (
                     <Star
                        key={star}
                        className={
                           star <=
                           Math.round(Number(product.average_rating || 0))
                              ? 'h-4 w-4 fill-emerald-700 text-emerald-700'
                              : 'h-4 w-4'
                        }
                     />
                  ))}
                  <span className="ml-2">
                     ({product.reviews_count || 0} Reviews)
                  </span>
               </div>
               {order ? (
                  <div className="space-y-3">
                     <div className="rounded-lg border border-emerald-600/30 bg-emerald-600/10 px-4 py-2 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                        This book is in your library
                     </div>

                     {product.files && product.files.length > 0 ? (
                        <div className="space-y-2">
                           {product.files.map((file) => (
                              <a
                                 key={file.id}
                                 href={productFiles.download.url({
                                    product: product.id,
                                    media: file.id,
                                 })}
                                 className="flex items-center justify-between rounded-lg border px-4 py-2 hover:bg-muted/50"
                              >
                                 <span className="text-sm font-medium">
                                    {file.name}
                                 </span>
                                 <Download className="h-4 w-4 text-muted-foreground" />
                              </a>
                           ))}
                        </div>
                     ) : (
                        <p className="text-sm text-muted-foreground">
                           The book file is not available yet.
                        </p>
                     )}
                  </div>
               ) : (
                  <div className="flex flex-wrap items-center gap-3">
                     <span className="text-sm text-muted-foreground">Qty</span>
                     <span
                        className="flex h-12 w-12 items-center justify-center rounded-full bg-muted font-semibold"
                        aria-label="One digital copy"
                     >
                        1
                     </span>
                     {auth.user ? (
                        product.pricing_type === 'free' ? (
                           <Button
                              size="lg"
                              disabled={outOfStock}
                              onClick={() =>
                                 router.post(storeProductOrder(), {
                                    product_id: product.id,
                                 })
                              }
                           >
                              <ShoppingBag className="mr-2 h-4 w-4" />
                              {outOfStock ? 'Out of Stock' : 'Get for Free'}
                           </Button>
                        ) : (
                           <Button
                              asChild
                              size="lg"
                              className="bg-black font-bold text-white hover:bg-black/85 dark:border dark:border-white/20"
                              disabled={outOfStock}
                           >
                              <a
                                 aria-disabled={outOfStock}
                                 onClick={(event) => {
                                    if (outOfStock) {
                                       event.preventDefault();
                                    }
                                 }}
                                 href={payments.index.url({
                                    from: 'web',
                                    item: 'product',
                                    id: product.id,
                                 })}
                              >
                                 <ShoppingBag className="mr-2 h-4 w-4" />
                                 {outOfStock ? 'Out of Stock' : 'Buy this book'}
                              </a>
                           </Button>
                        )
                     ) : (
                        <Button asChild size="lg">
                           <Link href="/login">Login to Purchase</Link>
                        </Button>
                     )}

                     <ProductWishlistHandler
                        product={product}
                        wishlists={wishlists}
                     />
                  </div>
               )}
               <div className="mt-7 flex gap-3" aria-label="Share book">
                  <a
                     aria-label="Share on Facebook"
                     target="_blank"
                     rel="noopener noreferrer"
                     href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}`}
                     className="rounded-full bg-emerald-700 p-3 text-white"
                  >
                     <Facebook className="h-5 w-5" />
                  </a>
                  <a
                     aria-label="Share on LinkedIn"
                     target="_blank"
                     rel="noopener noreferrer"
                     href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}`}
                     className="rounded-full bg-emerald-700 p-3 text-white"
                  >
                     <Linkedin className="h-5 w-5" />
                  </a>
                  <a
                     aria-label="Share on WhatsApp"
                     target="_blank"
                     rel="noopener noreferrer"
                     href={`https://wa.me/?text=${encodeURIComponent(product.title + ' ' + (typeof window !== 'undefined' ? window.location.href : ''))}`}
                     className="rounded-full bg-emerald-700 p-3 text-white"
                  >
                     <MessageCircle className="h-5 w-5" />
                  </a>
               </div>
            </div>
         </div>

         <BookShelf title="Related books" books={relatedBooks} />
         <Card className="mt-10 p-4 md:p-6">
            <Tabs defaultValue="description">
               <TabsList className="w-full justify-start overflow-x-auto">
                  <TabsTrigger value="description" className="cursor-pointer">
                     Description
                  </TabsTrigger>
                  <TabsTrigger
                     value="specifications"
                     className="cursor-pointer"
                  >
                     Specifications
                  </TabsTrigger>
                  <TabsTrigger value="faq" className="cursor-pointer">
                     FAQ
                  </TabsTrigger>
                  <TabsTrigger value="reviews" className="cursor-pointer">
                     Reviews
                  </TabsTrigger>
                  <TabsTrigger value="seller" className="cursor-pointer">
                     Seller
                  </TabsTrigger>
               </TabsList>

               <TabsContent value="description" className="pt-6">
                  {product.description ? (
                     <Renderer value={product.description} />
                  ) : (
                     <p className="text-muted-foreground">
                        No description provided.
                     </p>
                  )}
               </TabsContent>

               <TabsContent value="specifications" className="pt-6">
                  {product.specifications &&
                  product.specifications.length > 0 ? (
                     <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {product.specifications.map((spec) => (
                           <div
                              key={spec.id}
                              className="flex justify-between rounded-lg border px-4 py-2"
                           >
                              <span className="text-muted-foreground">
                                 {spec.title}
                              </span>
                              <span className="font-medium">{spec.value}</span>
                           </div>
                        ))}
                     </div>
                  ) : (
                     <p className="text-muted-foreground">
                        No specifications provided.
                     </p>
                  )}
               </TabsContent>

               <TabsContent value="faq" className="pt-6">
                  {product.faqs && product.faqs.length > 0 ? (
                     <div className="space-y-4">
                        {product.faqs.map((faq) => (
                           <div key={faq.id}>
                              <p className="font-medium">{faq.question}</p>
                              <p className="mt-1 text-sm text-muted-foreground">
                                 {faq.answer}
                              </p>
                           </div>
                        ))}
                     </div>
                  ) : (
                     <p className="text-muted-foreground">No FAQs added yet.</p>
                  )}
               </TabsContent>

               <TabsContent value="reviews" className="pt-6">
                  <Reviews />
               </TabsContent>

               <TabsContent value="seller" className="pt-6">
                  <div className="flex items-center gap-4">
                     <img
                        src={
                           product.instructor?.user?.photo ||
                           '/assets/images/blank-image.jpg'
                        }
                        alt={product.instructor?.user?.name}
                        className="h-16 w-16 rounded-full object-cover"
                     />
                     <div>
                        <p className="text-lg font-semibold">
                           {product.instructor?.user?.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                           {product.instructor?.user?.email}
                        </p>
                     </div>
                  </div>
               </TabsContent>
            </Tabs>
         </Card>
      </div>
   );
};

Show.layout = (page: ReactNode) => <LandingLayout>{page}</LandingLayout>;

export default Show;
