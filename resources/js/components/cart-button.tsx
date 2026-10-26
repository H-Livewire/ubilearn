import { Link } from '@inertiajs/react';
import { toast } from 'sonner';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
   Popover,
   PopoverContent,
   PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useT } from '@/lib/i18n';
import { clearCart, removeFromCart, useCart } from '@/lib/book-cart';
import payments from '@/routes/payments';

const money = new Intl.NumberFormat('en-TZ', { maximumFractionDigits: 0 });

/** Payment page of a real book (sample books have none). */
const payUrl = (id: number) =>
   payments.index.url({ from: 'web', item: 'product', id });

const CartButton = () => {
   const t = useT();
   const { items, count, total } = useCart();
   const payable = items.filter((item) => item.id > 0);

   const checkout = () => {
      if (payable.length === 0) {
         toast.info(t('Sample books cannot be bought. Add a real book to pay.'));

         return;
      }

      window.location.href = payUrl(payable[0].id);
   };

   return (
      <Popover>
         <PopoverTrigger asChild>
            <Button
               size="icon"
               variant="ghost"
               className="relative h-9 w-9 rounded-full p-0"
               aria-label={`${t('Cart')}, ${count}`}
            >
               <img
                  src="/assets/icons/cart-icon.png"
                  alt=""
                  aria-hidden="true"
                  className="h-5 w-5 object-contain dark:invert"
               />
               <span
                  data-testid="cart-badge"
                  className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#047857] px-1 text-[10px] leading-none font-semibold text-white"
               >
                  {count}
               </span>
            </Button>
         </PopoverTrigger>
         <PopoverContent align="end" className="w-80 p-0">
            <div className="flex items-center justify-between border-b px-4 py-3">
               <h4 className="font-semibold">{t('Cart')} ({count})</h4>
               {count > 0 && (
                  <button
                     type="button"
                     onClick={clearCart}
                     className="text-xs text-muted-foreground hover:text-foreground"
                  >
                     {t('Clear')}
                  </button>
               )}
            </div>
            {count === 0 ? (
               <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                  {t('Your cart is empty.')}
               </p>
            ) : (
               <>
                  <ScrollArea className="max-h-72">
                     <ul className="divide-y">
                        {items.map((item) => (
                           <li
                              key={item.id}
                              className="flex items-center gap-3 px-4 py-3"
                           >
                              <img
                                 src={
                                    item.thumbnail ||
                                    '/assets/images/blank-image.jpg'
                                 }
                                 alt=""
                                 className="h-14 w-10 shrink-0 object-contain"
                              />
                              <div className="min-w-0 flex-1">
                                 <Link
                                    href={item.href}
                                    className="line-clamp-2 text-sm font-medium hover:text-[#047857]"
                                 >
                                    {item.title}
                                 </Link>
                                 <p className="text-xs text-muted-foreground">
                                    TSh {money.format(item.price)}
                                 </p>
                              </div>
                              {item.id > 0 && (
                                 <a
                                    href={payUrl(item.id)}
                                    className="rounded-full border border-[#047857] px-2.5 py-1 text-xs font-semibold text-[#047857] transition-colors hover:bg-[#047857] hover:text-white"
                                 >
                                    {t('Pay')}
                                 </a>
                              )}
                              <button
                                 type="button"
                                 aria-label={`${t('Remove from cart')}: ${item.title}`}
                                 onClick={() => removeFromCart(item.id)}
                                 className="rounded p-1 text-muted-foreground hover:text-foreground"
                              >
                                 <X className="h-4 w-4" />
                              </button>
                           </li>
                        ))}
                     </ul>
                  </ScrollArea>
                  <div className="flex items-center justify-between border-t px-4 py-3 text-sm">
                     <span className="text-muted-foreground">{t('Total')}</span>
                     <span className="font-semibold">
                        TSh {money.format(total)}
                     </span>
                  </div>
                  <div className="space-y-2 border-t p-4">
                     <button
                        type="button"
                        onClick={checkout}
                        className="w-full rounded-full bg-[#047857] py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-800"
                     >
                        {t('Checkout')}
                     </button>
                     {payable.length > 1 && (
                        <p className="text-center text-xs text-muted-foreground">
                           {t('Books are paid for one at a time. Use Pay on each book.')}
                        </p>
                     )}
                  </div>
               </>
            )}
         </PopoverContent>
      </Popover>
   );
};

export default CartButton;
