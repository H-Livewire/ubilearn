import { Link } from '@inertiajs/react';
import { ShoppingCart, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
   Popover,
   PopoverContent,
   PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { clearCart, removeFromCart, useCart } from '@/lib/book-cart';

const money = new Intl.NumberFormat('en-TZ', { maximumFractionDigits: 0 });

const CartButton = () => {
   const { items, count, total } = useCart();

   return (
      <Popover>
         <PopoverTrigger asChild>
            <Button
               size="icon"
               variant="ghost"
               className="relative h-9 w-9 rounded-full p-0"
               aria-label={`Cart, ${count} item${count === 1 ? '' : 's'}`}
            >
               <ShoppingCart className="!h-5 !w-5" />
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
               <h4 className="font-semibold">Cart ({count})</h4>
               {count > 0 && (
                  <button
                     type="button"
                     onClick={clearCart}
                     className="text-xs text-muted-foreground hover:text-foreground"
                  >
                     Clear
                  </button>
               )}
            </div>
            {count === 0 ? (
               <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                  Your cart is empty.
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
                              <button
                                 type="button"
                                 aria-label={`Remove ${item.title}`}
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
                     <span className="text-muted-foreground">Total</span>
                     <span className="font-semibold">
                        TSh {money.format(total)}
                     </span>
                  </div>
               </>
            )}
         </PopoverContent>
      </Popover>
   );
};

export default CartButton;
