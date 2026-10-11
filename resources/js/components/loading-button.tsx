import { LoaderCircle } from 'lucide-react';
import { forwardRef, lazy, Suspense } from 'react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import type { ButtonProps } from './ui/button';
import { Button } from './ui/button';

const AuthButtonAnimation = lazy(() => import('./auth-button-animation'));

interface LoadingButtonProps extends ButtonProps {
   loading: boolean;
   brandAnimation?: boolean;
   iconClass?: string;
   children: ReactNode;
}

const LoadingButton = forwardRef<HTMLButtonElement, LoadingButtonProps>(
   (buttonProps, ref) => {
      const {
         loading,
         children,
         iconClass,
         className,
         brandAnimation = false,
         ...props
      } = buttonProps;

      return (
         <Button
            ref={ref}
            type={props.type || 'submit'}
            className={cn('relative', className)}
            aria-busy={loading}
            disabled={loading}
            {...props}
         >
            {loading && !brandAnimation && (
               <LoaderCircle
                  className={cn('absolute h-4 w-4 animate-spin', iconClass)}
               />
            )}
            {loading && brandAnimation && (
               <Suspense
                  fallback={
                     <LoaderCircle
                        aria-hidden="true"
                        className="h-5 w-5 animate-spin text-emerald-500"
                     />
                  }
               >
                  <AuthButtonAnimation />
               </Suspense>
            )}
            <div
               className={cn(
                  'opacity-100',
                  loading && !brandAnimation ? 'opacity-0' : 'opacity-100',
               )}
            >
               {children}
            </div>
            {loading && (
               <span role="status" className="sr-only">
                  Inachakatwa…
               </span>
            )}
         </Button>
      );
   },
);

LoadingButton.displayName = 'LoadingButton';

export default LoadingButton;
