import { Star } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface Proof {
   counts: { users: number; instructors: number; courses: number };
   avatars: { id: number; name: string; photo: string | null }[];
}

const LINES = [
   { key: 'users', before: 'Trusted by', after: 'learners' },
   { key: 'instructors', before: 'Guided by', after: 'instructors' },
   { key: 'courses', before: 'Learning across', after: 'courses' },
] as const;

const POLL_MS = 8000;

/** Smoothly counts from the previous number to the new one. */
function useCountUp(value: number) {
   const [shown, setShown] = useState(value);
   const from = useRef(value);

   useEffect(() => {
      const start = from.current;

      if (start === value) {
         return;
      }

      const began = performance.now();
      let frame = 0;
      const step = (now: number) => {
         const t = Math.min(1, (now - began) / 700);
         const next = Math.round(start + (value - start) * t);
         setShown(next);
         from.current = next;

         if (t < 1) {
            frame = requestAnimationFrame(step);
         }
      };
      frame = requestAnimationFrame(step);

      return () => cancelAnimationFrame(frame);
   }, [value]);

   return shown;
}

const initials = (name: string) =>
   name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || '?';

/**
 * Real member photos + live counts (learners, instructors, courses).
 * Polls the server, so a new member appears without reloading the page.
 */
const CommunityProof = ({ data }: { data?: Proof | null }) => {
   const [proof, setProof] = useState<Proof | null>(data ?? null);
   const [line, setLine] = useState(0);
   const [fresh, setFresh] = useState<number[]>([]);
   const known = useRef<Set<number>>(new Set());

   useEffect(() => {
      let stopped = false;
      let timer: ReturnType<typeof setTimeout>;
      const load = async () => {
         if (document.visibilityState === 'visible') {
            try {
               const response = await fetch('/api/community-proof', {
                  headers: { Accept: 'application/json' },
               });

               if (response.ok && !stopped) {
                  setProof(await response.json());
               }
            } catch {
               // Keep showing the last numbers.
            }
         }

         if (!stopped) {
            timer = setTimeout(load, POLL_MS);
         }
      };
      void load();

      return () => {
         stopped = true;
         clearTimeout(timer);
      };
   }, []);

   useEffect(() => {
      if (!proof) {
         return;
      }

      const ids = proof.avatars.map((avatar) => avatar.id);

      if (known.current.size === 0) {
         ids.forEach((id) => known.current.add(id));

         return;
      }

      const added = ids.filter((id) => !known.current.has(id));

      if (added.length) {
         added.forEach((id) => known.current.add(id));
         setFresh(added);
         const timer = setTimeout(() => setFresh([]), 1500);

         return () => clearTimeout(timer);
      }
   }, [proof]);

   useEffect(() => {
      const timer = setInterval(() => setLine((value) => (value + 1) % LINES.length), 2600);

      return () => clearInterval(timer);
   }, []);

   const current = LINES[line];
   const count = useCountUp(proof?.counts[current.key] ?? 0);

   if (!proof) {
      return <div className="h-14" aria-hidden="true" />;
   }

   return (
      <div className="flex items-center gap-3">
         <div className="flex -space-x-3">
            {proof.avatars.map((avatar) => (
               <div
                  key={avatar.id}
                  title={avatar.name}
                  className={`flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/15 text-sm font-semibold text-primary ring-2 ring-background ${
                     fresh.includes(avatar.id)
                        ? 'animate-in fade-in zoom-in-50 slide-in-from-left-4 duration-700'
                        : ''
                  }`}
               >
                  {avatar.photo ? (
                     <img
                        src={avatar.photo}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover"
                     />
                  ) : (
                     initials(avatar.name)
                  )}
               </div>
            ))}
         </div>
         <div>
            <div className="flex items-center gap-1" aria-hidden="true">
               {[0, 1, 2, 3, 4].map((star) => (
                  <Star
                     key={star}
                     className="h-4 w-4 fill-yellow-500 text-yellow-500"
                  />
               ))}
            </div>
            <p className="sr-only">
               Trusted by {proof.counts.users.toLocaleString()} learners,{' '}
               {proof.counts.instructors.toLocaleString()} instructors and{' '}
               {proof.counts.courses.toLocaleString()} courses.
            </p>
            <p
               className="relative h-6 overflow-hidden text-sm font-medium whitespace-nowrap opacity-80"
               aria-hidden="true"
            >
               <span
                  key={line}
                  className="inline-block animate-in fade-in slide-in-from-bottom-2 duration-500 motion-reduce:animate-none"
               >
                  {current.before} {count.toLocaleString()}{' '}
                  <span className="font-semibold">{current.after}</span>
               </span>
            </p>
         </div>
      </div>
   );
};

export default CommunityProof;
