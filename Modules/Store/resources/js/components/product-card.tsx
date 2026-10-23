import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn, systemCurrency } from '@/lib/utils';
import { details } from '@/routes/products';
import { Link, usePage } from '@inertiajs/react';
import { ArrowUpRight, Star } from 'lucide-react';
import ProductWishlistHandler from './wishlist-handler';

interface Props {
   product: Product;
   className?: string;
   wishlists?: ProductWishlist[];
}

const ProductCard = ({ product, className, wishlists }: Props) => {
   const { props } = usePage<SharedData>();
   const { amount } = systemCurrency(props.system.fields['selling_currency']);
   const href = details({ slug: product.slug, id: product.id });
   const saving =
      product.discount && Number(product.price) > Number(product.discount_price)
         ? Math.round(
              (1 - Number(product.discount_price) / Number(product.price)) *
                 100,
           )
         : 0;

   return (
      <Card
         className={cn(
            'group flex h-full flex-col gap-0 overflow-hidden p-0 transition-shadow hover:shadow-lg',
            className,
         )}
      >
         <div className="relative bg-muted/40 p-5 sm:p-6">
            <Link
               href={href}
               aria-label={`View ${product.title}`}
               className="block"
            >
               <img
                  src={product.thumbnail || '/assets/images/blank-image.jpg'}
                  alt={product.title}
                  loading="lazy"
                  className="mx-auto h-64 max-w-full object-contain drop-shadow-lg transition-transform duration-300 group-hover:-translate-y-1 motion-reduce:transform-none"
               />
            </Link>
            {saving > 0 && (
               <span className="absolute top-3 left-3 rounded-full bg-emerald-700 px-2.5 py-1 text-xs font-bold text-white">
                  Save {saving}%
               </span>
            )}
            <ProductWishlistHandler
               product={product}
               wishlists={wishlists}
               className="absolute top-3 right-3"
            />
         </div>
         <div className="flex flex-1 flex-col p-5">
            <p className="mb-2 truncate text-xs font-medium text-emerald-700 dark:text-emerald-400">
               {product.product_category?.title || 'Digital book'}
            </p>
            <Link
               href={href}
               className="line-clamp-2 text-lg leading-snug font-bold hover:text-emerald-700 dark:hover:text-emerald-400"
            >
               {product.title}
            </Link>
            {product.instructor?.user?.name && (
               <p className="mt-2 truncate text-sm text-muted-foreground">
                  {product.instructor.user.name}
               </p>
            )}
            <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
               <Star className="h-3.5 w-3.5 fill-emerald-600 text-emerald-600" />
               {Number(product.average_rating || 0).toFixed(1)} (
               {product.reviews_count || 0})
            </p>
            <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-5">
               <div>
                  <p className="font-bold text-emerald-700 dark:text-emerald-400">
                     {product.pricing_type === 'free'
                        ? 'Free'
                        : amount(
                             Number(
                                product.discount
                                   ? product.discount_price
                                   : product.price,
                             ),
                          )}
                  </p>
                  {saving > 0 && (
                     <p className="text-xs text-muted-foreground line-through">
                        {amount(Number(product.price))}
                     </p>
                  )}
               </div>
               <Button asChild size="sm" variant="outline">
                  <Link href={href}>
                     View book
                     <ArrowUpRight className="ml-1 h-4 w-4" />
                  </Link>
               </Button>
            </div>
         </div>
      </Card>
   );
};
export default ProductCard;
