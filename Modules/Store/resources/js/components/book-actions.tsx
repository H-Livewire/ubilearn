import { Link, router, usePage } from '@inertiajs/react';
import { Eye, Heart, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';
import { addToCart, toggleFavoriteBook, useCart, useFavoriteBooks } from '@/lib/book-cart';
import { cn } from '@/lib/utils';
import productWishlists from '@/routes/product-wishlists';

function bookPrice(book: Product): number {
   if (book.pricing_type === 'free') {
      return 0;
   }

   const useDiscount =
      book.discount &&
      Number(book.discount_price) > 0 &&
      Number(book.discount_price) < Number(book.price);

   return Number(useDiscount ? book.discount_price : book.price) || 0;
}

const circle =
   'flex h-9 w-9 items-center justify-center rounded-full bg-background text-foreground shadow-md transition-colors hover:bg-[#047857] hover:text-white focus-visible:ring-2 focus-visible:ring-[#047857] focus-visible:outline-none';

/** Eye + add-to-cart buttons shown on hover/focus (always visible on touch screens). */
export function BookHoverActions({
   book,
   href,
}: {
   book: Product;
   href: string;
}) {
   const { has } = useCart();
   const inCart = has(book.id);

   return (
      <div className="absolute inset-x-0 bottom-3 flex items-center justify-center gap-2 opacity-0 transition-opacity duration-200 group-focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100">
         <Link href={href} className={circle} aria-label={`View ${book.title}`}>
            <Eye className="h-4 w-4" />
         </Link>
         <button
            type="button"
            className={cn(circle, inCart && 'bg-[#047857] text-white')}
            aria-label={inCart ? 'In cart' : `Add ${book.title} to cart`}
            onClick={() => {
               const added = addToCart({
                  id: book.id,
                  title: book.title,
                  thumbnail: book.thumbnail || null,
                  price: bookPrice(book),
                  href,
               });
               toast[added ? 'success' : 'info'](
                  added ? 'Added to cart' : 'Already in your cart',
               );
            }}
         >
            <ShoppingCart className="h-4 w-4" />
         </button>
      </div>
   );
}

/** Heart button. Real books use the account wishlist; samples use this browser. */
export function BookFavorite({ book }: { book: Product }) {
   const { auth, wishlists } = usePage<
      SharedData & { wishlists?: ProductWishlist[] }
   >().props;
   const localFavorites = useFavoriteBooks();
   const wishlisted = book.is_sample
      ? localFavorites.includes(book.id)
      : wishlists?.find((wishlist) => wishlist.product_id === book.id);

   const toggle = () => {
      if (book.is_sample) {
         const on = toggleFavoriteBook(book.id);
         toast.success(on ? 'Added to favorites' : 'Removed from favorites');

         return;
      }

      if (!auth.user) {
         router.visit('/login');

         return;
      }

      if (wishlisted && typeof wishlisted === 'object') {
         router.delete(productWishlists.destroy(wishlisted.id), {
            showProgress: false,
            preserveScroll: true,
         });
      } else {
         router.post(
            productWishlists.store(),
            { user_id: auth.user.id, product_id: book.id },
            { showProgress: false, preserveScroll: true },
         );
      }
   };

   return (
      <button
         type="button"
         onClick={toggle}
         aria-pressed={Boolean(wishlisted)}
         aria-label={wishlisted ? 'Remove from favorites' : 'Add to favorites'}
         className="absolute top-2 right-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-background/90 shadow transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-[#047857] focus-visible:outline-none"
      >
         <Heart
            className={cn(
               'h-4 w-4',
               wishlisted ? 'fill-red-500 text-red-500' : 'text-foreground',
            )}
         />
      </button>
   );
}
