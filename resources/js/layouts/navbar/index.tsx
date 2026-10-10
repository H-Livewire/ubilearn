import { Link, usePage } from '@inertiajs/react';
import { ChevronDown, Menu } from 'lucide-react';
import { Fragment, useEffect, useState } from 'react';
import AppLogo from '@/components/app-logo';
import { Button } from '@/components/ui/button';
import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/use-auth';
import useScreen from '@/hooks/use-screen';
import { cn } from '@/lib/utils';
import Actions from './partials/actions';
import MobileMenuDrawer from './partials/mobile-menu-drawer';

interface NavbarProps {
   language?: boolean;
   heightCover?: boolean;
   customizable?: boolean;
}

const Navbar = ({
   language = false,
   heightCover = true,
   customizable = true,
}: NavbarProps) => {
   const { props } = usePage<SharedData>();
   const { navbar } = props;
   const { isAdmin } = useAuth();
   const [isSticky, setIsSticky] = useState(false);
   const [isMenuOpen, setIsMenuOpen] = useState(false);
   const { screen } = useScreen();

   useEffect(() => {
      const handleScroll = () => {
         const scrollPosition = window.scrollY;

         if (scrollPosition > 100) {
            setIsSticky(true);
         } else {
            setIsSticky(false);
         }
      };

      window.addEventListener('scroll', handleScroll, { passive: true });

      return () => {
         window.removeEventListener('scroll', handleScroll);
      };
   }, []);

   const renderNavItems = (item: NavbarItem) => {
      if (item.active) {
         switch (item.type) {
            case 'url':
               return (
                  <Link
                     key={item.id}
                     href={item.value || ''}
                     className="text-sm font-normal"
                  >
                     {item.title}
                  </Link>
               );

            case 'dropdown':
               return (
                  <DropdownMenu key={item.id}>
                     <DropdownMenuTrigger className="flex cursor-pointer items-center gap-1 text-sm">
                        {item.title}
                        <ChevronDown className="ml-1 h-4 w-4" />
                     </DropdownMenuTrigger>
                     <DropdownMenuContent align="start" className="min-w-20">
                        {item.items &&
                           Array.isArray(item.items) &&
                           item.items.map((subItem: any, idx: number) => (
                              <DropdownMenuItem
                                 key={idx}
                                 asChild
                                 className="cursor-pointer px-5"
                              >
                                 <Link href={subItem.url || ''}>
                                    {subItem.title}
                                 </Link>
                              </DropdownMenuItem>
                           ))}
                     </DropdownMenuContent>
                  </DropdownMenu>
               );

            default:
               return null;
         }
      }
   };

   const sortedItems = navbar.navbar_items.toSorted((a, b) => a.sort - b.sort);
   const customizeLink = props.customize ? '/' : '?customize=true';

   return (
      <>
         <div className="fixed top-0 z-30 w-full">
            <div
               className={cn(
                  'ubi-navbar container mx-auto mt-0 flex h-[104px] items-center justify-between gap-4 !px-4 transition-all duration-200 md:gap-6 md:!px-6',
                  isSticky &&
                     'mt-4 w-full rounded-2xl bg-background shadow-card xl:!max-w-6xl',
                  screen < 768 && 'mt-0 h-[88px] rounded-none',
               )}
            >
               <Link
                  href="/"
                  className="flex shrink-0 items-center justify-center leading-none"
               >
                  <AppLogo />
               </Link>

               <div className="hidden min-w-0 flex-1 items-center justify-center gap-5 whitespace-nowrap xl:flex">
                  {sortedItems.map((item) => (
                     <Fragment key={item.id}>{renderNavItems(item)}</Fragment>
                  ))}
               </div>

               <div className="flex shrink-0 items-center gap-3">
                  {customizable && isAdmin && (
                     <Button
                        asChild
                        variant="outline"
                        className="hidden text-sm font-normal sm:block"
                     >
                        <Link href={customizeLink}>
                           {props.customize ? 'Back' : 'Customize'}
                        </Link>
                     </Button>
                  )}

                  <Actions language={language} />

                  <Button
                     size="icon"
                     variant="secondary"
                     className="xl:hidden"
                     onClick={() => setIsMenuOpen(true)}
                     aria-label="Open menu"
                  >
                     <Menu className="h-6 w-6" />
                  </Button>
               </div>
            </div>
         </div>

         <MobileMenuDrawer
            open={isMenuOpen}
            onOpenChange={setIsMenuOpen}
            language={language}
            customizable={customizable}
            customizeLink={customizeLink}
         />

         {heightCover && (
            <div className="relative z-20 h-[88px] bg-transparent md:h-[104px]" />
         )}
      </>
   );
};

export default Navbar;
