import { useEffect, useState } from 'react';

interface Company {
   id: number;
   name: string;
   logo: string;
   website: string | null;
}

interface Payload {
   count: number;
   logos: Company[];
}

/**
 * "Trusted by N leading companies worldwide" with the real number of active
 * company logos (managed under Dashboard → Company Logos) in a smooth marquee.
 */
const PartnerMarquee = () => {
   const [data, setData] = useState<Payload | null>(null);

   useEffect(() => {
      let stopped = false;

      fetch('/api/company-logos', { headers: { Accept: 'application/json' } })
         .then((response) => (response.ok ? response.json() : null))
         .then((payload: Payload | null) => !stopped && setData(payload))
         .catch(() => undefined);

      return () => {
         stopped = true;
      };
   }, []);

   if (!data || data.count === 0) {
      return null;
   }

   // Repeat the set so one half of the track always fills the screen.
   const repeats = Math.max(1, Math.ceil(8 / data.logos.length));
   const half = Array.from({ length: repeats }, () => data.logos).flat();
   const seconds = Math.max(18, half.length * 3);

   const logo = (company: Company, key: string, hidden: boolean) => {
      const image = (
         <img
            src={company.logo}
            alt={hidden ? '' : company.name}
            loading="lazy"
            draggable={false}
            className="h-12 w-auto max-w-[170px] object-contain opacity-80 transition-opacity duration-200 hover:opacity-100 md:h-14"
         />
      );

      return (
         <li key={key} className="shrink-0 px-8 md:px-12" aria-hidden={hidden}>
            {company.website ? (
               <a
                  href={company.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  tabIndex={hidden ? -1 : undefined}
                  aria-label={hidden ? undefined : company.name}
               >
                  {image}
               </a>
            ) : (
               image
            )}
         </li>
      );
   };

   return (
      <div className="container">
         <p className="mb-8 text-center text-muted-foreground">
            Trusted by{' '}
            <span className="font-semibold text-foreground">{data.count}</span>{' '}
            leading {data.count === 1 ? 'company' : 'companies'} worldwide
         </p>
         <div className="ubi-marquee overflow-hidden">
            <ul
               className="ubi-marquee-track flex w-max items-center"
               style={{ animationDuration: `${seconds}s` }}
            >
               {half.map((company, index) =>
                  logo(company, `a-${index}`, false),
               )}
               {half.map((company, index) => logo(company, `b-${index}`, true))}
            </ul>
         </div>
      </div>
   );
};

export default PartnerMarquee;
