import { Link, usePage } from '@inertiajs/react';
import { DynamicIcon } from 'lucide-react/dynamic';
import AppLogo from '@/components/app-logo';
import { Button } from '@/components/ui/button';
import type { SystemProps } from '@/pages/dashboard/settings/system';

const FIRST_YEAR = 2026;
const SITE_NAME = 'Ubilearn';

const Index = () => {
   const { props } = usePage<SystemProps>();
   const { footer, system } = props;

   const sortedItems = footer.footer_items.toSorted((a, b) => a.sort - b.sort);
   const listItems = sortedItems.filter(
      (item) => item.type === 'list' && item.active,
   );
   const socialMediaItem = sortedItems.find(
      (item) => item.type === 'social_media' && item.active,
   );


   return (
      <div className="overflow-hidden bg-[rgba(255,222,99,0.06)]">
         <div className="container space-y-9 pt-[60px] pb-5">
            <div className="flex flex-col items-start justify-between gap-10 md:flex-row">
               <div className="w-full space-y-5 md:max-w-[300px]">
                  <div>
                     <Link href="/">
                        <AppLogo className="h-7" />
                     </Link>
                  </div>

                  <p className="text-sm text-muted-foreground">
                     {system.fields.description}
                  </p>

                  {socialMediaItem && (
                     <div className="flex flex-wrap gap-3">
                        {socialMediaItem.items &&
                           Array.isArray(socialMediaItem.items) &&
                           socialMediaItem.items.map(
                              (socialItem: any, idx: number) => (
                                 <Button
                                    key={idx}
                                    size="icon"
                                    variant="ghost"
                                    className="rounded-full bg-muted text-muted-foreground transition-colors hover:bg-[#047857] hover:text-white"
                                    asChild
                                 >
                                    <a href={socialItem.url} target="_blank">
                                       <DynamicIcon
                                          name={socialItem.icon}
                                          className="h-5 w-5"
                                       />
                                       <span className="sr-only">
                                          {socialItem.title}
                                       </span>
                                    </a>
                                 </Button>
                              ),
                           )}
                     </div>
                  )}
               </div>

               <div className="flex w-full flex-col justify-between gap-10 md:max-w-[640px] md:flex-row">
                  {listItems.map((section) => (
                     <div key={section.id} className="relative w-full">
                        <p className="mb-3 text-lg font-semibold">
                           {section.title}
                        </p>
                        <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
                           {section.items?.map((item, itemIndex) =>
                              section.slug === 'address' ? (
                                 <li key={`item-${itemIndex}`}>{item.title}</li>
                              ) : (
                                 <li key={`item-${itemIndex}`}>
                                    <Link href={item.url}>{item.title}</Link>
                                 </li>
                              ),
                           )}
                        </ul>
                     </div>
                  ))}
               </div>
            </div>


         </div>

         {/* Copyright Section */}
         <div className="border-t border-border/60">
            <div className="container py-5 text-left">
               <p className="text-sm text-muted-foreground">
                  © Copyright {FIRST_YEAR}-{new Date().getFullYear()} {SITE_NAME}
                  . All rights reserved.
               </p>
            </div>
         </div>
      </div>
   );
};

export default Index;
