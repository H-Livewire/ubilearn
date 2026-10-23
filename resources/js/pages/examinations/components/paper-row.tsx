import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';

export default function PaperRow({
   title,
   grid,
   children,
   compact = false,
   noun = 'papers',
}: {
   title: string;
   grid: boolean;
   children: ReactNode;
   compact?: boolean;
   noun?: string;
}) {
   const row = useRef<HTMLDivElement>(null);
   const id = useId();
   const [edges, setEdges] = useState({ start: true, end: true });
   useEffect(() => {
      const node = row.current;

      if (!node || grid) {
         return;
      }

      const update = () =>
         setEdges({
            start: node.scrollLeft <= 2,
            end: node.scrollLeft + node.clientWidth >= node.scrollWidth - 2,
         });
      update();
      const observer = new ResizeObserver(update);
      observer.observe(node);
      Array.from(node.children).forEach((child) => observer.observe(child));
      node.addEventListener('scroll', update, { passive: true });

      return () => {
         observer.disconnect();
         node.removeEventListener('scroll', update);
      };
   }, [grid, children]);
   function move(direction: number) {
      const node = row.current;

      if (node) {
         node.scrollBy({
            left: direction * node.clientWidth * 0.85,
            behavior: window.matchMedia('(prefers-reduced-motion: reduce)')
               .matches
               ? 'instant'
               : 'smooth',
         });
      }
   }

   return (
      <div className={grid ? undefined : 'relative px-10'}>
         {!grid && (
            <div className="pointer-events-none absolute inset-0 z-10">
               {([-1, 1] as const).map((direction) => (
                  <Button
                     key={direction}
                     type="button"
                     size="icon"
                     variant="outline"
                     aria-label={`${direction === -1 ? 'Previous' : 'Next'} ${title} ${noun}`}
                     aria-controls={id}
                     disabled={direction === -1 ? edges.start : edges.end}
                     onClick={() => move(direction)}
                     className={`pointer-events-auto absolute top-1/2 -translate-y-1/2 rounded-full border-emerald-700 bg-background text-emerald-700 shadow-sm transition-colors hover:bg-emerald-700 hover:text-white disabled:opacity-30 ${direction === -1 ? 'left-0' : 'right-0'}`}
                  >
                     {direction === -1 ? (
                        <ChevronLeft size={18} />
                     ) : (
                        <ChevronRight size={18} />
                     )}
                  </Button>
               ))}
            </div>
         )}
         <div
            id={id}
            ref={row}
            role={grid ? undefined : 'region'}
            aria-label={`${title} ${noun}`}
            tabIndex={grid ? undefined : 0}
            onKeyDown={(event) => {
               if (
                  event.target === event.currentTarget &&
                  ['ArrowLeft', 'ArrowRight'].includes(event.key)
               ) {
                  event.preventDefault();
                  move(event.key === 'ArrowLeft' ? -1 : 1);
               }
            }}
            className={
               grid
                  ? 'grid gap-8 sm:grid-cols-2 lg:grid-cols-3'
                  : `flex snap-x snap-mandatory overflow-x-auto focus-visible:outline-emerald-700 ${compact ? 'items-center gap-6 py-2' : 'gap-8 pb-5'}`
            }
         >
            {children}
         </div>
      </div>
   );
}
