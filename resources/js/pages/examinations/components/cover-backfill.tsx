import { useEffect, useRef, useState } from 'react';
import { makeCover } from '../lib/make-cover';

/** Quietly creates fast cover images for papers that do not have one yet. */
export default function CoverBackfill({ ids }: { ids: number[] }) {
   const [done, setDone] = useState(0);
   const [running, setRunning] = useState(false);
   const started = useRef(false);

   useEffect(() => {
      if (!ids.length || started.current) {
         return;
      }

      started.current = true;
      let cancelled = false;
      const token =
         document
            .querySelector('meta[name="csrf-token"]')
            ?.getAttribute('content') ?? '';
      void (async () => {
         setRunning(true);

         for (const id of ids) {
            if (cancelled) {
               break;
            }

            try {
               const blob = await makeCover(`/examinations/${id}/files/question`);
               const form = new FormData();
               form.append(
                  'cover',
                  new File([blob], 'cover.webp', {
                     type: blob.type || 'image/webp',
                  }),
               );
               const response = await fetch(
                  `/dashboard/examination-papers/${id}/cover`,
                  {
                     method: 'POST',
                     body: form,
                     credentials: 'same-origin',
                     headers: {
                        'X-CSRF-TOKEN': token,
                        Accept: 'application/json',
                     },
                  },
               );

               if (response.ok) {
                  setDone((value) => value + 1);
               }
            } catch {
               // Skip this paper; it keeps the slower fallback cover.
            }
         }

         setRunning(false);
      })();

      return () => {
         cancelled = true;
      };
   }, [ids]);

   if (!running) {
      return null;
   }

   return (
      <p role="status" className="text-xs text-muted-foreground">
         Inatengeneza covers za haraka… {done}/{ids.length}
      </p>
   );
}
