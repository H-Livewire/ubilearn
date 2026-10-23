import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
   Tooltip,
   TooltipContent,
   TooltipProvider,
   TooltipTrigger,
} from '@/components/ui/tooltip';
import { useIsMobile } from '@/hooks/use-mobile';
import { getQueryParams } from '@/lib/route';
import { shop } from '@/routes/products';
import { router, usePage } from '@inertiajs/react';
import { BookOpen, Grid, List, ListFilter } from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import ProductFilter from './partials/product-filter';

const Layout = ({ children }: { children: ReactNode }) => {
   const { url, props } = usePage<ProductsIndexProps>();
   const { category } = props;
   const [open, setOpen] = useState(false);
   const urlParams = getQueryParams(url);
   const viewType = urlParams['view'] ?? 'grid';
   const isMobile = useIsMobile();

   const gridListHandler = (view: string) => {
      const updatedParams = { ...urlParams, view };
      router.get(
         shop.url({ category: category?.slug || '' }, { query: updatedParams }),
         {},
         { preserveScroll: true },
      );
   };

   return (
      <div className="container py-8 md:py-12">
         <div className="mb-8 flex items-center gap-5 rounded-2xl border border-emerald-700/15 bg-emerald-700/5 p-6 md:p-8">
            <div className="hidden rounded-2xl bg-emerald-700/10 p-5 text-emerald-700 sm:block dark:text-emerald-400">
               <BookOpen className="h-9 w-9" />
            </div>
            <div>
               <p className="mb-1 text-xs font-bold tracking-widest text-emerald-700 uppercase dark:text-emerald-400">
                  UbiLearn Books
               </p>
               <h1 className="text-3xl font-bold md:text-4xl">
                  Your next read starts here.
               </h1>
               <p className="mt-2 text-muted-foreground">
                  Browse books, find your favourite and build your library.
               </p>
            </div>
         </div>
         <div className="flex items-start gap-6">
            {!isMobile && (
               <Card className="sticky top-24 w-64 shrink-0 p-5">
                  <ProductFilter />
               </Card>
            )}

            {/* Main Content */}
            <div className="min-w-0 flex-1">
               <div className="mb-6 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                     {isMobile && (
                        <Sheet open={open} onOpenChange={setOpen}>
                           <SheetTrigger asChild>
                              <Button size="icon" variant="outline">
                                 <ListFilter className="h-5 w-5" />
                              </Button>
                           </SheetTrigger>

                           <SheetContent
                              side="left"
                              className="w-[220px] border-border"
                           >
                              <ScrollArea className="h-full p-4">
                                 <ProductFilter setOpen={setOpen} />
                              </ScrollArea>
                           </SheetContent>
                        </Sheet>
                     )}

                     <div>
                        <h2 className="text-lg font-semibold capitalize md:text-2xl md:font-bold">
                           {category ? category.title : 'All'} Books
                        </h2>
                        {category?.description && (
                           <p className="mt-1 text-sm text-muted-foreground">
                              {category.description}
                           </p>
                        )}
                     </div>
                  </div>
                  <div className="flex gap-2">
                     <TooltipProvider delayDuration={0}>
                        <Tooltip>
                           <TooltipTrigger asChild>
                              <Button
                                 size="icon"
                                 variant={
                                    viewType === 'grid' ? 'default' : 'outline'
                                 }
                                 onClick={() => gridListHandler('grid')}
                              >
                                 <Grid className="h-4 w-4" />
                              </Button>
                           </TooltipTrigger>
                           <TooltipContent>
                              <p>Grid View</p>
                           </TooltipContent>
                        </Tooltip>
                     </TooltipProvider>

                     <TooltipProvider delayDuration={0}>
                        <Tooltip>
                           <TooltipTrigger asChild>
                              <Button
                                 size="icon"
                                 variant={
                                    viewType === 'list' ? 'default' : 'outline'
                                 }
                                 onClick={() => gridListHandler('list')}
                              >
                                 <List className="h-4 w-4" />
                              </Button>
                           </TooltipTrigger>
                           <TooltipContent>
                              <p>List View</p>
                           </TooltipContent>
                        </Tooltip>
                     </TooltipProvider>
                  </div>
               </div>

               {/* Product Grid */}
               {children}
            </div>
         </div>
      </div>
   );
};

export default Layout;
