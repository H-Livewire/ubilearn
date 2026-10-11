import { DotLottieReact, setWasmUrl } from '@lottiefiles/dotlottie-react';
import { useSyncExternalStore } from 'react';

setWasmUrl('/animations/dotlottie-player.wasm');
const subscribe = (callback: () => void) => {
   const query = window.matchMedia('(prefers-reduced-motion: reduce)');
   query.addEventListener('change', callback);

   return () => query.removeEventListener('change', callback);
};

export default function AuthButtonAnimation() {
   const reduced = useSyncExternalStore(
      subscribe,
      () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      () => true,
   );

   return (
      <span
         aria-hidden="true"
         className="inline-flex h-6 w-11 shrink-0 items-center justify-center rounded-full bg-white"
      >
         {reduced ? (
            <span className="text-sm font-bold text-emerald-700">•••</span>
         ) : (
            <DotLottieReact
               src="/animations/ubi-auth-loader.lottie"
               autoplay
               loop
               style={{ width: 44, height: 24 }}
            />
         )}
      </span>
   );
}
