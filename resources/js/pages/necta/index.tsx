import { Head } from '@inertiajs/react';
import { ExternalLink, LoaderCircle } from 'lucide-react';
import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import LandingLayout from '@/layouts/landing';

function Necta({ levels }: { levels: Record<string, string> }) {
   const [level, setLevel] = useState('csee');
   const [year, setYear] = useState('2025');
   const [school, setSchool] = useState('');
   const [busy, setBusy] = useState(false);
   const [error, setError] = useState('');
   async function openNecta(event: FormEvent) {
      event.preventDefault();

      if (busy) {
         return;
      }

      setBusy(true);
      setError('');

      try {
         const params = new URLSearchParams({
            level,
            year,
            school: school.trim(),
         });
         const response = await fetch(`/necta-result/school?${params}`, {
            headers: { Accept: 'application/json' },
         });
         const data = await response.json();

         if (!response.ok) {
            throw new Error(
               (Object.values(data.errors || {}).flat()[0] as string) ||
                  data.message ||
                  'Tafadhali jaribu tena.',
            );
         }

         const target = new URL(data.url);

         if (
            target.protocol !== 'https:' ||
            ![
               'necta.go.tz',
               'www.necta.go.tz',
               'onlinesys.necta.go.tz',
               'matokeo.necta.go.tz',
               'results.necta.go.tz',
            ].includes(target.hostname) ||
            target.port ||
            target.username ||
            target.password
         ) {
            throw new Error('Link ya NECTA haijathibitishwa.');
         }

         window.location.assign(target.href);
      } catch (e) {
         setError(e instanceof Error ? e.message : 'Tafadhali jaribu tena.');
         setBusy(false);
      }
   }

   return (
      <>
         <Head title="NECTA result" />
         <main className="container mx-auto max-w-4xl space-y-6 px-4 py-10">
            <div>
               <h1 className="text-3xl font-bold">NECTA result</h1>
               <p className="mt-2 text-sm text-muted-foreground">
                  Weka mwaka, namba ya shule na kiwango cha elimu. Ukurasa wa
                  shule utafunguka kwenye NECTA, kisha uangalie namba yako ya
                  mtihani.
               </p>
            </div>
            <Card className="p-5 sm:p-6">
               <form onSubmit={openNecta} className="space-y-5">
                  <div className="grid gap-4 sm:grid-cols-3">
                     <div className="space-y-2">
                        <Label htmlFor="year">Mwaka</Label>
                        <select
                           id="year"
                           required
                           value={year}
                           disabled={busy}
                           onChange={(event) => setYear(event.target.value)}
                           className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
                        >
                           <option value="2023">2023</option>
                           <option value="2024">2024</option>
                           <option value="2025">2025</option>
                           <option value="2026" disabled>
                              2026 (soon)
                           </option>
                        </select>
                     </div>
                     <div className="space-y-2">
                        <Label htmlFor="school">Namba ya shule</Label>
                        <Input
                           id="school"
                           aria-describedby="school-format"
                           required
                           maxLength={16}
                           placeholder={
                              ['psle', 'sfna'].includes(level)
                                 ? 'Mfano: PS0101001'
                                 : 'Mfano: S0156'
                           }
                           value={school}
                           disabled={busy}
                           onChange={(event) =>
                              setSchool(event.target.value.toUpperCase())
                           }
                        />
                        <p
                           id="school-format"
                           className="text-xs text-muted-foreground"
                        >
                           Primary: PS0101001 · Secondary: S0156
                        </p>
                     </div>
                     <div className="space-y-2">
                        <Label htmlFor="level">Kiwango cha elimu</Label>
                        <select
                           id="level"
                           className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
                           value={level}
                           disabled={busy}
                           onChange={(event) => {
                              setLevel(event.target.value);
                              setSchool('');
                              setError('');
                           }}
                        >
                           {Object.entries(levels).map(([key, label]) => (
                              <option key={key} value={key}>
                                 {label}
                              </option>
                           ))}
                        </select>
                     </div>
                  </div>
                  {error && (
                     <p role="alert" className="text-sm text-destructive">
                        {error}
                     </p>
                  )}
                  <Button
                     type="submit"
                     disabled={busy}
                     className="bg-black font-semibold text-white hover:bg-black/85"
                  >
                     {busy ? (
                        <LoaderCircle className="h-4 w-4 animate-spin motion-reduce:animate-none" />
                     ) : (
                        <ExternalLink className="h-4 w-4" />
                     )}
                     {busy ? 'Inafungua…' : 'Open NECTA'}
                  </Button>
               </form>
            </Card>
         </main>
      </>
   );
}
Necta.layout = (page: ReactNode) => <LandingLayout children={page} language />;
export default Necta;
