import * as TabsPrimitive from '@radix-ui/react-tabs';
import * as React from 'react';
import { cn } from '@/lib/utils';

const TransitionContext = React.createContext({ selected: '', displayed: '' });

const Tabs = React.forwardRef<React.ElementRef<typeof TabsPrimitive.Root>, React.ComponentPropsWithoutRef<typeof TabsPrimitive.Root>>(
   ({ value, defaultValue, onValueChange, children, ...props }, ref) => {
      const [internal, setInternal] = React.useState(defaultValue ?? '');
      const selected = value ?? internal;
      const [displayed, setDisplayed] = React.useState(selected);
      React.useEffect(() => {
         const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
         const timer = window.setTimeout(() => setDisplayed(selected), reduced ? 0 : 100);
         return () => window.clearTimeout(timer);
      }, [selected]);
      return (
         <TransitionContext.Provider value={{ selected, displayed }}>
            <TabsPrimitive.Root {...props} ref={ref} value={selected} onValueChange={(next) => { setInternal(next); onValueChange?.(next); }}>
               {children}
            </TabsPrimitive.Root>
         </TransitionContext.Provider>
      );
   },
);
Tabs.displayName = 'Tabs';

const TabsList = React.forwardRef<React.ElementRef<typeof TabsPrimitive.List>, React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>>(
   ({ className, children, ...props }, ref) => {
      const list = React.useRef<HTMLDivElement>(null);
      const { selected } = React.useContext(TransitionContext);
      const [indicator, setIndicator] = React.useState<React.CSSProperties>({ opacity: 0 });
      React.useLayoutEffect(() => {
         const node = list.current;
         if (!node) { return; }
         const update = () => {
            const active = node.querySelector<HTMLElement>('[role="tab"][data-state="active"]');
            if (active) { setIndicator({ width: active.offsetWidth, height: 2, transform: `translateX(${active.offsetLeft}px)`, opacity: 1 }); }
         };
         update();
         const observer = new ResizeObserver(update);
         observer.observe(node);
         node.querySelectorAll('[role="tab"]').forEach((tab) => observer.observe(tab));
         return () => observer.disconnect();
      }, [selected]);
      return (
         <TabsPrimitive.List {...props} ref={(node) => { list.current = node; if (typeof ref === 'function') { ref(node); } else if (ref) { ref.current = node; } }} className={cn('premium-tabs-list relative inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground', className)}>
            {children}
            <span aria-hidden="true" className="premium-tabs-indicator" style={indicator} />
         </TabsPrimitive.List>
      );
   },
);
TabsList.displayName = 'TabsList';

const TabsTrigger = React.forwardRef<React.ElementRef<typeof TabsPrimitive.Trigger>, React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>>(
   ({ className, ...props }, ref) => <TabsPrimitive.Trigger ref={ref} className={cn('inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow', className)} {...props} />,
);
TabsTrigger.displayName = 'TabsTrigger';

const TabsContent = React.forwardRef<React.ElementRef<typeof TabsPrimitive.Content>, React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>>(
   ({ className, value, children, forceMount, ...props }, ref) => {
      const { selected, displayed } = React.useContext(TransitionContext);
      const visited = React.useRef(false);
      const visible = displayed === value;
      if (visible) { visited.current = true; }
      if (!visited.current && !forceMount) { return null; }
      return (
         <TabsPrimitive.Content {...props} ref={ref} value={value} forceMount hidden={!visible} inert={selected !== value || !visible} aria-hidden={selected !== value || !visible} data-transition={selected !== displayed ? 'exit' : 'enter'} className={cn('premium-tab-content mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2', className)}>
            {children}
         </TabsPrimitive.Content>
      );
   },
);
TabsContent.displayName = 'TabsContent';
export { Tabs, TabsList, TabsTrigger, TabsContent };
