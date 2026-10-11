import { Head } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import LandingLayout from '@/layouts/landing';

interface Choice {
   label: string;
   key: string;
}
interface Year {
   year: number;
   key: string;
   url: string;
}
interface Candidate {
   index: string;
   cells: string[];
   grades: Record<string, string>;
}
interface Programme {
   institution: string;
   title: string;
   code: string;
   requirements: string;
   source: string;
   page: number;
   website: string;
   assessment: string;
   careers: string[];
}
interface Browse {
   source: string;
   children: Choice[];
   candidates: Candidate[];
}
const selectClass =
   'h-11 w-full rounded-md border border-input bg-background px-3 text-sm';
async function read<T>(url: string): Promise<T> {
   const response = await fetch(url, {
      headers: { Accept: 'application/json' },
   });
   const data = await response.json();

   if (!response.ok) {
      throw new Error(data.message || 'Imeshindikana kupata taarifa.');
   }

   return data;
}

function Necta({ levels }: { levels: Record<string, string> }) {
   const [level, setLevel] = useState('csee');
   const [years, setYears] = useState<Year[]>([]);
   const [year, setYear] = useState('');
   const [browse, setBrowse] = useState<Browse | null>(null);
   const [schoolSearch, setSchoolSearch] = useState('');
   const [search, setSearch] = useState('');
   const [selected, setSelected] = useState<Candidate | null>(null);
   const [busy, setBusy] = useState(true);
   const [error, setError] = useState('');
   const [programmes, setProgrammes] = useState<Programme[]>([]);
   const [programme, setProgramme] = useState('');
   const [school, setSchool] = useState('');
   const [guidance, setGuidance] = useState<{
      schools: { name: string; url: string }[];
      combinations: { code: string; careers: string[]; assessment: string }[];
      links: { title: string; url: string }[];
      message: string;
   } | null>(null);

   function changeLevel(value: string) {
      setLevel(value);
      setYears([]);
      setYear('');
      setBrowse(null);
      setSelected(null);
      setGuidance(null);
      setProgrammes([]);
      setError('');
      setBusy(true);
   }

   useEffect(() => {
      const controller = new AbortController();
      fetch(`/necta-result/years?level=${level}`, {
         signal: controller.signal,
         headers: { Accept: 'application/json' },
      })
         .then(async (response) => {
            const data = await response.json();

            if (!response.ok) {
               throw new Error(data.message);
            }

            return data;
         })
         .then(setYears)
         .catch((e) => {
            if (e.name !== 'AbortError') {
               setError(e.message);
            }
         })
         .finally(() => {
            if (!controller.signal.aborted) {
               setBusy(false);
            }
         });

      return () => controller.abort();
   }, [level]);

   async function open(key: string) {
      if (!key) {
         return;
      }

      setBusy(true);
      setError('');
      setSelected(null);
      setGuidance(null);
      setProgrammes([]);
      setSearch('');
      setSchoolSearch('');

      try {
         setBrowse(await read<Browse>(`/necta-result/browse?key=${key}`));
      } catch (e) {
         setError(e instanceof Error ? e.message : 'Jaribu tena.');
      } finally {
         setBusy(false);
      }
   }

   async function choose(candidate: Candidate) {
      setSelected(candidate);
      setGuidance(null);
      setProgrammes([]);
      setProgramme('');
      setBusy(true);
      setError('');

      try {
         const response = await fetch('/necta-result/guidance', {
            method: 'POST',
            headers: {
               'Content-Type': 'application/json',
               Accept: 'application/json',
               'X-XSRF-TOKEN': decodeURIComponent(
                  document.cookie
                     .split('; ')
                     .find((v) => v.startsWith('XSRF-TOKEN='))
                     ?.split('=')
                     .slice(1)
                     .join('=') || '',
               ),
            },
            body: JSON.stringify({
               level,
               year: Number(year),
               grades: candidate.grades,
            }),
         });
         const data = await response.json();

         if (!response.ok) {
            throw new Error(data.message);
         }

         setGuidance(data);
         setProgrammes(data.programmes || []);
      } catch (e) {
         setError(e instanceof Error ? e.message : 'Jaribu tena.');
      } finally {
         setBusy(false);
      }
   }

   const matches =
      browse?.candidates.filter((c) =>
         c.cells.join(' ').toLowerCase().includes(search.toLowerCase()),
      ) || [];
   const choice = programmes.find((p) => p.code === programme);

   return (
      <>
         <Head title="NECTA result" />
         <main className="container mx-auto max-w-4xl space-y-6 px-4 py-10">
            <div>
               <h1 className="text-3xl font-bold">NECTA result</h1>
               <p className="mt-2 text-sm text-muted-foreground">
                  Chagua mwaka, kiwango cha elimu na shule/kituo.
               </p>
            </div>
            <Card className="space-y-5 p-5 sm:p-6">
               <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                     <Label htmlFor="level">Kiwango cha elimu</Label>
                     <select
                        disabled={busy}
                        id="level"
                        className={selectClass}
                        value={level}
                        onChange={(e) => changeLevel(e.target.value)}
                     >
                        {Object.entries(levels).map(([key, name]) => (
                           <option key={key} value={key}>
                              {name}
                           </option>
                        ))}
                        <option disabled>
                           Darasa la 2 — chanzo hakijathibitishwa
                        </option>
                     </select>
                  </div>
                  <div className="space-y-2">
                     <Label htmlFor="year">Mwaka</Label>
                     <select
                        id="year"
                        className={selectClass}
                        disabled={busy}
                        value={year}
                        onChange={(e) => {
                           setYear(e.target.value);
                           const item = years.find(
                              (y) => y.year.toString() === e.target.value,
                           );

                           if (item) {
                              void open(item.key);
                           }
                        }}
                     >
                        <option value="">Chagua mwaka</option>
                        {years.map((y) => (
                           <option key={y.year} value={y.year}>
                              {y.year}
                           </option>
                        ))}
                     </select>
                  </div>
               </div>
               {!!browse?.children.length && (
                  <div className="space-y-3">
                     <Label htmlFor="school-search">
                        Herufi / jina la shule au eneo
                     </Label>
                     <Input
                        id="school-search"
                        value={schoolSearch}
                        onChange={(e) => setSchoolSearch(e.target.value)}
                        placeholder="Mfano: K"
                     />
                     <select
                        aria-label="Shule au eneo"
                        className={selectClass}
                        disabled={busy}
                        value=""
                        onChange={(e) => void open(e.target.value)}
                     >
                        <option value="">Chagua shule / eneo</option>
                        {browse.children
                           .filter((c) =>
                              c.label
                                 .toLowerCase()
                                 .includes(schoolSearch.toLowerCase()),
                           )
                           .map((c) => (
                              <option key={c.key} value={c.key}>
                                 {c.label}
                              </option>
                           ))}
                     </select>
                  </div>
               )}
               {!!browse?.candidates.length && (
                  <div className="space-y-3">
                     <Label htmlFor="candidate-search">
                        Jina au namba ya mtahiniwa
                     </Label>
                     <Input
                        id="candidate-search"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Mfano: S0000/0001"
                     />
                     <select
                        aria-label="Mtahiniwa"
                        className={selectClass}
                        disabled={busy}
                        value={selected?.index || ''}
                        onChange={(e) => {
                           const candidate = matches.find(
                              (c) => c.index === e.target.value,
                           );

                           if (candidate) {
                              void choose(candidate);
                           }
                        }}
                     >
                        <option value="">
                           Chagua mtahiniwa ({matches.length})
                        </option>
                        {matches.map((c) => (
                           <option key={c.index} value={c.index}>
                              {c.cells.slice(0, 4).join(' · ')}
                           </option>
                        ))}
                     </select>
                  </div>
               )}
               {busy && (
                  <p role="status" className="text-sm text-muted-foreground">
                     Inatafuta…
                  </p>
               )}
               {error && (
                  <p role="alert" className="text-sm text-destructive">
                     {error}
                  </p>
               )}
               {!busy &&
                  year &&
                  browse &&
                  !browse.candidates.length &&
                  !browse.children.length && (
                     <p className="text-sm text-muted-foreground">
                        Muundo huu wa matokeo haujasomwa. Fungua matokeo rasmi
                        hapa chini.
                     </p>
                  )}
               {year && browse && (
                  <Button
                     variant="outline"
                     disabled={busy}
                     onClick={() => {
                        const item = years.find(
                           (y) => y.year.toString() === year,
                        );

                        if (item) {
                           void open(item.key);
                        }
                     }}
                  >
                     Chagua shule nyingine
                  </Button>
               )}
               <Button asChild variant="outline">
                  <a
                     href={
                        browse?.source ||
                        `https://www.necta.go.tz/results/view/${level}`
                     }
                     target="_blank"
                     rel="noopener noreferrer"
                  >
                     Fungua NECTA ↗
                  </a>
               </Button>
            </Card>
            {selected && (
               <Card className="space-y-4 p-5 sm:p-6">
                  <h2 className="text-xl font-bold">
                     Matokeo: {selected.index}
                  </h2>
                  <p className="text-sm break-words">
                     {selected.cells.join(' · ')}
                  </p>
                  {Object.keys(selected.grades).length > 0 && (
                     <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                           <thead>
                              <tr className="border-b text-left">
                                 <th className="py-2">Somo</th>
                                 <th>Alama</th>
                              </tr>
                           </thead>
                           <tbody>
                              {Object.entries(selected.grades).map(
                                 ([subject, grade]) => (
                                    <tr key={subject} className="border-b">
                                       <td className="py-2">{subject}</td>
                                       <td className="font-semibold">
                                          {grade}
                                       </td>
                                    </tr>
                                 ),
                              )}
                           </tbody>
                        </table>
                     </div>
                  )}
               </Card>
            )}
            {guidance && (
               <Card className="space-y-4 p-5 sm:p-6">
                  <h2 className="text-xl font-bold">Hatua inayofuata</h2>
                  <p className="text-sm text-muted-foreground">
                     {guidance.message}
                  </p>
                  {guidance.combinations.length > 0 && (
                     <details className="rounded-md border p-3">
                        <summary className="cursor-pointer font-semibold">
                           Combination na kazi zinazohusiana
                        </summary>
                        <div className="mt-3 space-y-3">
                           {guidance.combinations.map((c) => (
                              <details
                                 key={c.code}
                                 className="rounded-md border p-3"
                              >
                                 <summary className="cursor-pointer">
                                    {c.code}
                                 </summary>
                                 <p className="mt-2 text-sm">{c.assessment}</p>
                                 <p className="mt-2 text-sm text-muted-foreground">
                                    Mwelekeo wa kazi: {c.careers.join(', ')}.
                                    Mafunzo ya juu yanahitajika.
                                 </p>
                              </details>
                           ))}
                        </div>
                     </details>
                  )}
                  {!!guidance.schools?.length && (
                     <details className="rounded-md border p-3">
                        <summary className="cursor-pointer font-semibold">
                           Shule / vituo vya A-level
                        </summary>
                        <p className="mt-2 text-sm text-muted-foreground">
                           Orodha ya vituo vya NECTA 2026; hakiki combination na
                           nafasi kupitia TAMISEMI au shule.
                        </p>
                        <select
                           aria-label="Shule ya A-level"
                           className={`${selectClass} mt-3`}
                           value={school}
                           onChange={(e) => setSchool(e.target.value)}
                        >
                           <option value="">Chagua shule</option>
                           {guidance.schools.map((s) => (
                              <option key={s.url} value={s.url}>
                                 {s.name}
                              </option>
                           ))}
                        </select>
                        {school &&
                           guidance.schools.some((s) => s.url === school) && (
                              <a
                                 className="mt-3 block text-sm underline"
                                 href={school}
                                 target="_blank"
                                 rel="noopener noreferrer"
                              >
                                 Matokeo rasmi ya shule ↗
                              </a>
                           )}
                     </details>
                  )}
                  {programmes.length > 0 && (
                     <details className="rounded-md border p-3">
                        <summary className="cursor-pointer font-semibold">
                           Vyuo / kozi — {level === 'acsee' ? 'TCU' : 'NACTVET'}{' '}
                           2026/2027 ({programmes.length})
                        </summary>
                        <select
                           aria-label="Chagua chuo na kozi"
                           className={`${selectClass} mt-3`}
                           value={programme}
                           onChange={(e) => setProgramme(e.target.value)}
                        >
                           <option value="">Chagua chuo na kozi</option>
                           {programmes.map((p) => (
                              <option key={p.code} value={p.code}>
                                 {p.institution} — {p.title} ({p.assessment})
                              </option>
                           ))}
                        </select>
                        {choice && (
                           <div className="mt-3 space-y-2 text-sm">
                              <p>{choice.requirements}</p>
                              {choice.careers.length > 0 && (
                                 <p>
                                    Kazi zinazohusiana:{' '}
                                    {choice.careers.join(', ')}; qualification
                                    na usajili wa taaluma hutegemea kozi.
                                 </p>
                              )}
                              <a
                                 className="block underline"
                                 href={`${choice.source}#page=${choice.page}`}
                                 target="_blank"
                                 rel="noopener noreferrer"
                              >
                                 Vigezo rasmi ↗
                              </a>
                              {choice.website && (
                                 <a
                                    className="block underline"
                                    href={choice.website}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                 >
                                    Orodha rasmi ya vyuo ↗
                                 </a>
                              )}
                           </div>
                        )}
                     </details>
                  )}
                  <details className="rounded-md border p-3">
                     <summary className="cursor-pointer font-semibold">
                        Shule / vyuo na vyanzo rasmi
                     </summary>
                     <div className="mt-3 flex flex-col gap-3 text-sm">
                        {guidance.links.map((link) => (
                           <a
                              key={link.url}
                              className="underline"
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                           >
                              {link.title} ↗
                           </a>
                        ))}
                     </div>
                  </details>
               </Card>
            )}
         </main>
      </>
   );
}
Necta.layout = (page: ReactNode) => <LandingLayout children={page} language />;
export default Necta;
