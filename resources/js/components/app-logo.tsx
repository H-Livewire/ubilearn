import { usePage } from '@inertiajs/react';
import { cn } from '@/lib/utils';

const FULL_LOGO = '/assets/icons/ubi-learn-logo-v2.png';
const TRIMMED_LOGO = '/assets/icons/ubi-learn-logo-trim.png';

const AppLogo = ({
   className,
   theme,
   trimmedClassName,
}: {
   theme?: 'light' | 'dark';
   className?: string;
   /**
    * Navbar mode: swaps the Ubilearn logo for its tightly cropped copy and
    * applies these classes so the wordmark lines up with the nav titles.
    */
   trimmedClassName?: string;
}) => {
   const { system } = usePage<SharedData>().props;
   const pick = (src: string) =>
      trimmedClassName !== undefined && src === FULL_LOGO ? TRIMMED_LOGO : src;
   const logoDark = pick(system?.fields?.logo_dark || '');
   const logoLight = pick(system?.fields?.logo_light || '');
   const siteName = system?.fields?.name;
   const nudge = (src: string) =>
      src === TRIMMED_LOGO ? trimmedClassName : undefined;

   if (theme && theme === 'dark') {
      return (
         <img
            src={logoDark}
            alt={siteName}
            className={cn('block h-6 w-auto', className, nudge(logoDark))}
         />
      );
   }

   if (theme && theme === 'light') {
      return (
         <img
            src={logoLight}
            alt={siteName}
            className={cn('block h-6 w-auto', className, nudge(logoLight))}
         />
      );
   }

   return (
      <>
         <img
            id="app-logo"
            src={logoDark}
            alt={siteName}
            className={cn(
               'block h-6 w-auto dark:hidden',
               className,
               nudge(logoDark),
            )}
         />
         <img
            id="app-logo"
            src={logoLight}
            alt={siteName}
            className={cn(
               'hidden h-6 w-auto dark:block',
               className,
               nudge(logoLight),
            )}
         />
      </>
   );
};

export default AppLogo;
