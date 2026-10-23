import TableFooter from '@/components/table/table-footer';
import { Card } from '@/components/ui/card';
import LandingLayout from '@/layouts/landing';
import { getQueryParams } from '@/lib/route';
import { cn } from '@/lib/utils';
import { shop } from '@/routes/products';
import { Head, router, usePage } from '@inertiajs/react';
import type { ReactNode } from 'react';
import ProductCard from '../../components/product-card';
import Layout from './layout';

const Index = (props: ProductsIndexProps) => {
   const { products, wishlists } = props;
   const { url } = usePage();
   const urlParams = getQueryParams(url);

   return (
      <>
         <Head title="Books" />
         <div
            className="mb-6 flex gap-1 overflow-x-auto border-b"
            aria-label="Browse books"
         >
            {[
               ['newest', 'New arrivals'],
               ['featured', 'Featured'],
               ['bestsellers', 'Best sellers'],
               ['most_viewed', 'Most viewed'],
            ].map(([value, label]) => {
               const active =
                  urlParams.featured === '1'
                     ? 'featured'
                     : urlParams.sort || 'newest';

               return (
                  <button
                     key={value}
                     type="button"
                     aria-pressed={active === value}
                     onClick={() =>
                        router.get(
                           shop.url({
                              category: props.category?.slug || 'all',
                           }),
                           {
                              ...urlParams,
                              sort: value === 'featured' ? 'newest' : value,
                              featured: value === 'featured' ? '1' : '',
                              products_page: 1,
                           },
                           { preserveScroll: true },
                        )
                     }
                     className={cn(
                        'shrink-0 border-b-2 px-4 py-3 text-sm font-semibold transition-colors',
                        active === value
                           ? 'border-emerald-700 text-emerald-700 dark:border-emerald-400 dark:text-emerald-400'
                           : 'border-transparent text-muted-foreground hover:text-foreground',
                     )}
                  >
                     {label}
                  </button>
               );
            })}
         </div>
         {products.data.length > 0 ? (
            <div
               className={cn(
                  urlParams['view'] && urlParams['view'] === 'list'
                     ? 'space-y-7'
                     : 'grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3',
               )}
            >
               {products.data.map((product) => (
                  <ProductCard
                     key={product.id}
                     product={product}
                     wishlists={wishlists}
                  />
               ))}
            </div>
         ) : (
            <Card className="p-10 text-center text-muted-foreground">
               No books found
            </Card>
         )}

         <TableFooter
            className="mt-6 p-5 sm:p-7"
            routeName="products.shop"
            paginationInfo={products}
            paginationKey="products"
         />
      </>
   );
};

Index.layout = (page: ReactNode) => (
   <LandingLayout>
      <Layout>{page}</Layout>
   </LandingLayout>
);

export default Index;
