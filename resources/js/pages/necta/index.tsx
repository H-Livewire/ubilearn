import { Head } from '@inertiajs/react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import LandingLayout from '@/layouts/landing';

interface Candidate {
   index: string;
   cells: string[];
   grades: Record<string, string>;
   summary: {
      division: string | null;
      points: number | null;
      status: 'Passed' | 'Failed' | 'Absent' | 'Withheld' | 'Not available';
   };
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
const selectClass =
   'h-11 w-full rounded-md border border-input bg-background px-3 text-sm';
function Necta({ levels }: { levels: Record<string, string> }) {
   const [level, setLevel] = useState('csee');
   const [year, setYear] = useState(String(new Date().getFullYear() - 1));
   const [index, setIndex] = useState('');
   const [source, setSource] = useState('');
   const [selected, setSelected] = useState<Candidate | null>(null);
   const [busy, setBusy] = useState(false);
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

   async function lookup(event: React.FormEvent) {
      event.preventDefault();

      if (busy) {
         return;
      }

      setBusy(true);
      setError('');
      setSelected(null);
      setGuidance(null);
      setProgrammes([]);
      setProgramme('');
      setSource('');

      try {
         const query = new URLSearchParams({
            level,
            year,
            index: index.trim(),
         });
         const response = await fetch(`/necta-result/lookup?${query}`, {
            headers: { Accept: 'application/json' },
         });
         const data = await response.json().catch(() => ({
            message: 'Seva haijarudisha taarifa. Jaribu tena.',
         }));

         if (!response.ok) {
            throw new Error(
               (Object.values(data.errors || {}).flat()[0] as string) ||
                  data.message,
            );
         }

         setSource(data.source);
         setSelected(data.candidate);
         setBusy(false);
         await choose(data.candidate);
      } catch (e) {
         setError(e instanceof Error ? e.message : 'Jaribu tena.');
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

   const choice = programmes.find((p) => p.code === programme);

   return (
      <>
         <Head title="NECTA result" />
         <main className="container mx-auto max-w-4xl space-y-6 px-4 py-10">
            <div>
               <h1 className="text-3xl font-bold">NECTA result</h1>
               <p className="mt-2 text-sm text-muted-foreground">
                  Weka mwaka, namba ya mtihani na kiwango cha elimu.
               </p>
            </div>
            <Card className="p-5 sm:p-6">
               <form onSubmit={lookup} className="space-y-5">
                  <div className="grid gap-4 sm:grid-cols-3">
                     <div className="space-y-2">
                        <Label htmlFor="year">Mwaka</Label>
                        <Input
                           id="year"
                           type="number"
                           min="2000"
                           max={new Date().getFullYear()}
                           required
                           value={year}
                           disabled={busy}
                           onChange={(e) => setYear(e.target.value)}
                        />
                     </div>
                     <div className="space-y-2">
                        <Label htmlFor="index">Namba ya mtihani</Label>
                        <Input
                           id="index"
                           required
                           maxLength={40}
                           placeholder="S0156/0001"
                           value={index}
                           disabled={busy}
                           onChange={(e) => setIndex(e.target.value)}
                        />
                     </div>
                     <div className="space-y-2">
                        <Label htmlFor="level">Kiwango cha elimu</Label>
                        <select
                           id="level"
                           className={selectClass}
                           value={level}
                           disabled={busy}
                           onChange={(e) => setLevel(e.target.value)}
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
                  </div>
                  {error && (
                     <p role="alert" className="text-sm text-destructive">
                        {error}
                     </p>
                  )}
                  <div className="flex flex-wrap gap-3">
                     <Button
                        type="submit"
                        disabled={busy}
                        className="border-black bg-black font-semibold text-white hover:bg-black/85"
                     >
                        {busy ? 'Inatafuta…' : 'Tafuta matokeo'}
                     </Button>
                     <Button asChild variant="outline">
                        <a
                           href={
                              source ||
                              `https://www.necta.go.tz/results/view/${level}`
                           }
                           target="_blank"
                           rel="noopener noreferrer"
                        >
                           Fungua NECTA ↗
                        </a>
                     </Button>
                  </div>
               </form>
            </Card>
            {selected && (
               <Card className="space-y-4 p-5 sm:p-6">
                  <h2 className="text-xl font-bold">
                     Matokeo: {selected.index}
                  </h2>
                  {selected.summary && (
                     <dl className="grid grid-cols-3 gap-3 rounded-md border bg-muted/30 p-4">
                        <div>
                           <dt className="text-sm text-muted-foreground">
                              Division
                           </dt>
                           <dd className="mt-1 text-xl font-bold">
                              {selected.summary.division ?? '—'}
                           </dd>
                        </div>
                        <div>
                           <dt className="text-sm text-muted-foreground">
                              Points
                           </dt>
                           <dd className="mt-1 text-xl font-bold">
                              {selected.summary.points ?? '—'}
                           </dd>
                        </div>
                        <div>
                           <dt className="text-sm text-muted-foreground">
                              Status
                           </dt>
                           <dd
                              className={`mt-1 font-bold ${selected.summary.status === 'Failed' ? 'text-red-600 dark:text-red-400' : selected.summary.status === 'Passed' ? 'text-emerald-700 dark:text-emerald-400' : 'text-muted-foreground'}`}
                           >
                              {selected.summary.status}
                           </dd>
                        </div>
                     </dl>
                  )}
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
