import { LoaderCircle } from 'lucide-react';
import { forwardRef } from 'react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import type { ButtonProps } from './ui/button';
import { Button } from './ui/button';

interface LoadingButtonProps extends ButtonProps {
   loading: boolean;
   iconClass?: string;
   children: ReactNode;
}

const LoadingButton = forwardRef<HTMLButtonElement, LoadingButtonProps>(
   (buttonProps, ref) => {
      const { loading, children, iconClass, className, ...props } = buttonProps;

      return (
         <Button
            ref={ref}
            type={props.type || 'submit'}
            className={cn('relative', className)}
            aria-busy={loading}
            disabled={loading}
            {...props}
         >
            {loading && (
               <LoaderCircle
                  className={cn('absolute h-4 w-4 animate-spin', iconClass)}
               />
            )}
            <div
               className={cn(
                  'opacity-100',
                  loading ? 'opacity-0' : 'opacity-100',
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
