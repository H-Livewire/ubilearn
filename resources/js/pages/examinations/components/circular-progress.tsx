export default function CircularProgress({
   value,
   label,
   active = true,
}: {
   value: number;
   label: string;
   active?: boolean;
}) {
   const percent = Math.max(0, Math.min(100, Math.round(value)));

   return (
      <div
         className="flex items-center gap-4"
         role="progressbar"
         aria-valuemin={0}
         aria-valuemax={100}
         aria-valuenow={percent}
         aria-label={label}
      >
         <div className="relative h-20 w-20 shrink-0">
            <svg
               viewBox="0 0 80 80"
               className="h-full w-full -rotate-90"
               aria-hidden="true"
            >
               <circle
                  cx="40"
                  cy="40"
                  r="32"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="5"
                  className="text-emerald-700/10"
               />
               <circle
                  cx="40"
                  cy="40"
                  r="32"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeDasharray={201.06}
                  strokeDashoffset={201.06 * (1 - percent / 100)}
                  className="text-emerald-600 transition-[stroke-dashoffset] duration-300 motion-reduce:transition-none"
               />
            </svg>
            {active && (
               <div
                  aria-hidden="true"
                  className="absolute inset-0 animate-spin rounded-full border border-dashed border-emerald-600/40 motion-reduce:animate-none"
               />
            )}
            <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-emerald-700 dark:text-emerald-400">
               {percent}%
            </span>
         </div>
         <p className="text-sm font-medium">{label}</p>
      </div>
   );
}
