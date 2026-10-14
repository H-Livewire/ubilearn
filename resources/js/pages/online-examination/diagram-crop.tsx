import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
type Point = { x: number; y: number };
export default function DiagramCrop({
   src,
   disabled,
   onCrop,
   logo = false,
}: {
   src: string;
   disabled: boolean;
   onCrop: (value: string) => void;
   logo?: boolean;
}) {
   const image = useRef<HTMLImageElement>(null);
   const [start, setStart] = useState<Point | null>(null);
   const [end, setEnd] = useState<Point | null>(null);
   const [branding, setBranding] = useState(false);
   const [brandError, setBrandError] = useState('');
   const [dragging, setDragging] = useState(false);
   const rect =
      start && end
         ? {
              x: Math.min(start.x, end.x),
              y: Math.min(start.y, end.y),
              width: Math.abs(start.x - end.x),
              height: Math.abs(start.y - end.y),
           }
         : null;
   function point(event: React.PointerEvent) {
      const bounds = image.current!.getBoundingClientRect();

      return {
         x: Math.max(
            0,
            Math.min(1, (event.clientX - bounds.left) / bounds.width),
         ),
         y: Math.max(
            0,
            Math.min(1, (event.clientY - bounds.top) / bounds.height),
         ),
      };
   }
   function crop() {
      if (!image.current || !rect) {
         return;
      }

      const canvas = document.createElement('canvas');
      canvas.width = Math.max(
         1,
         Math.round(rect.width * image.current.naturalWidth),
      );
      canvas.height = Math.max(
         1,
         Math.round(rect.height * image.current.naturalHeight),
      );
      canvas
         .getContext('2d')!
         .drawImage(
            image.current,
            rect.x * image.current.naturalWidth,
            rect.y * image.current.naturalHeight,
            canvas.width,
            canvas.height,
            0,
            0,
            canvas.width,
            canvas.height,
         );
      onCrop(canvas.toDataURL('image/jpeg', 0.9));
      setStart(null);
      setEnd(null);
   }

   async function replaceLogo() {
      if (!image.current || !rect) {
         return;
      }

      setBranding(true);
      setBrandError('');

      try {
         const brand = new Image();
         await new Promise<void>((resolve, reject) => {
            brand.onload = () => resolve();
            brand.onerror = () =>
               reject(new Error('UbiLearn logo could not load.'));
            brand.src = '/assets/icons/ubi-learn-logo-v2.png';
         });
         const canvas = document.createElement('canvas');
         canvas.width = image.current.naturalWidth;
         canvas.height = image.current.naturalHeight;
         const context = canvas.getContext('2d')!;
         context.drawImage(image.current, 0, 0);
         const x = rect.x * canvas.width,
            y = rect.y * canvas.height,
            w = rect.width * canvas.width,
            h = rect.height * canvas.height;
         context.fillStyle = '#ffffff';
         context.fillRect(x, y, w, h);
         const scale = Math.min(
            w / brand.naturalWidth,
            h / brand.naturalHeight,
         );
         context.drawImage(
            brand,
            x + (w - brand.naturalWidth * scale) / 2,
            y + (h - brand.naturalHeight * scale) / 2,
            brand.naturalWidth * scale,
            brand.naturalHeight * scale,
         );
         onCrop(canvas.toDataURL('image/jpeg', 0.9));
         setStart(null);
         setEnd(null);
      } catch (error) {
         setBrandError(
            error instanceof Error ? error.message : 'Logo replacement failed.',
         );
      } finally {
         setBranding(false);
      }
   }

   return (
      <div className="space-y-2">
         <p className="text-xs text-muted-foreground">
            {logo
               ? 'Drag kuchagua eneo la logo ya zamani tu, kisha Replace with UbiLearn.'
               : 'Drag kuchagua diagram au equation tu, kisha Crop.'}
         </p>
         <div
            className="relative inline-block max-w-full touch-none"
            onPointerDown={(event) => {
               if (disabled) {
                  return;
               }

               event.preventDefault();
               event.currentTarget.setPointerCapture(event.pointerId);
               const p = point(event);
               setStart(p);
               setEnd(p);
               setDragging(true);
            }}
            onPointerMove={(event) => {
               if (dragging) {
                  setEnd(point(event));
               }
            }}
            onPointerUp={() => setDragging(false)}
            onPointerCancel={() => setDragging(false)}
         >
            <img
               ref={image}
               src={src}
               draggable={false}
               alt="Diagram crop preview"
               className="block max-h-96 max-w-full rounded border"
            />
            {rect && (
               <div
                  className="pointer-events-none absolute border-2 border-emerald-600 bg-emerald-500/15"
                  style={{
                     left: `${rect.x * 100}%`,
                     top: `${rect.y * 100}%`,
                     width: `${rect.width * 100}%`,
                     height: `${rect.height * 100}%`,
                  }}
               />
            )}
         </div>
         <div>
            <Button
               variant="outline"
               disabled={
                  disabled ||
                  branding ||
                  !rect ||
                  rect.width < 0.01 ||
                  rect.height < 0.01
               }
               onClick={logo ? replaceLogo : crop}
            >
               {branding
                  ? 'Logo import…'
                  : logo
                    ? 'Replace with UbiLearn'
                    : 'Crop diagram'}
            </Button>
         </div>
         {brandError && (
            <p role="alert" className="text-sm text-destructive">
               {brandError}
            </p>
         )}
      </div>
   );
}
