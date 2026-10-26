import { usePage } from '@inertiajs/react';
import Appearance from '@/components/appearance';
import CartButton from '@/components/cart-button';
import Language from '@/components/language';
import Notification from '@/components/notification';
import ProfileToggle from '@/components/profile-toggle';
import { useAuth } from '@/hooks/use-auth';
import LoginDrawer from './login-drawer';

const Actions = ({ language }: { language: boolean }) => {
   const { props } = usePage<SharedData>();
   const { navbar, system } = props;
   const { isLoggedIn } = useAuth();
   const sortedItems = navbar.navbar_items.toSorted((a, b) => a.sort - b.sort);

   const actionElements = () =>
      sortedItems.map((item) => {
         if (item.slug === 'theme') {
            return <Appearance key={item.id} />;
         } else if (
            system.fields.language_selector &&
            language &&
            item.slug === 'language'
         ) {
            return <Language key={item.id} />;
         } else if (isLoggedIn && item.slug === 'notification') {
            return <Notification key={item.id} />;
         } else {
            return null;
         }
      });

   return (
      <div className="flex items-center gap-2">
         <div className="hidden items-center gap-2 md:flex">
            {actionElements()}
         </div>

         <CartButton />

         {isLoggedIn ? (
            sortedItems.map((item) => {
               if (item.slug === 'profile') {
                  return <ProfileToggle key={item.id} />;
               } else {
                  return null;
               }
            })
         ) : (
            <LoginDrawer />
         )}
      </div>
   );
};

export default Actions;
