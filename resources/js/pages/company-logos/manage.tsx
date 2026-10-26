import { Head, router, useForm } from '@inertiajs/react';
import { ImagePlus, LoaderCircle, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import {
   AlertDialog,
   AlertDialogAction,
   AlertDialogCancel,
   AlertDialogContent,
   AlertDialogDescription,
   AlertDialogFooter,
   AlertDialogHeader,
   AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import DashboardLayout from '@/layouts/dashboard/layout';
import { removeLogoBackground } from '@/lib/remove-logo-background';

interface Logo {
   id: number;
   name: string;
   logo: string;
   website: string | null;
   active: boolean;
}

const checker =
   'bg-[linear-gradient(45deg,#e5e7eb_25%,transparent_25%,transparent_75%,#e5e7eb_75%),linear-gradient(45deg,#e5e7eb_25%,transparent_25%,transparent_75%,#e5e7eb_75%)] bg-[length:16px_16px] bg-[position:0_0,8px_8px]';

export default function Manage({ logos }: { logos: Logo[] }) {
   const form = useForm<{ name: string; website: string; logo: File | null }>({
      name: '',
      website: '',
      logo: null,
   });
   const [removeBg, setRemoveBg] = useState(true);
   const [source, setSource] = useState<File | null>(null);
   const [preview, setPreview] = useState<string | null>(null);
   const [processing, setProcessing] = useState(false);
   const [error, setError] = useState<string | null>(null);
   const [removing, setRemoving] = useState<Logo | null>(null);
   const [deleting, setDeleting] = useState(false);
   const input = useRef<HTMLInputElement>(null);

   // Re-process whenever the file or the checkbox changes.
   useEffect(() => {
      let cancelled = false;

      if (!source) {
         form.setData('logo', null);
         setPreview(null);

         return;
      }

      setProcessing(true);
      setError(null);
      (removeBg ? removeLogoBackground(source) : Promise.resolve(source))
         .then((file) => {
            if (cancelled) {
               return;
            }

            form.setData('logo', file);
            setPreview((old) => {
               if (old) {
                  URL.revokeObjectURL(old);
               }

               return URL.createObjectURL(file);
            });
         })
         .catch((reason: Error) => !cancelled && setError(reason.message))
         .finally(() => !cancelled && setProcessing(false));

      return () => {
         cancelled = true;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [source, removeBg]);

   const submit = (event: FormEvent) => {
      event.preventDefault();
      form.post('/dashboard/company-logos', {
         forceFormData: true,
         preserveScroll: true,
         onSuccess: () => {
            form.reset();
            setSource(null);

            if (input.current) {
               input.current.value = '';
            }
         },
      });
   };

   return (
      <>
         <Head title="Company logos" />
         <div className="mx-auto w-full max-w-5xl space-y-8 p-4 md:p-6">
            <div>
               <h1 className="text-2xl font-semibold">Company logos</h1>
               <p className="text-sm text-muted-foreground">
                  Logos shown in the “Trusted by … companies” marquee on the
                  home page. The number shown there is the count of active
                  logos.
               </p>
            </div>

            <form
               onSubmit={submit}
               className="grid gap-4 rounded-xl border p-4 md:grid-cols-[1fr_220px] md:p-6"
            >
               <div className="space-y-4">
                  <div className="space-y-2">
                     <Label htmlFor="company-name">Company name</Label>
                     <Input
                        id="company-name"
                        value={form.data.name}
                        onChange={(e) => form.setData('name', e.target.value)}
                        placeholder="Ubitech Solutions"
                        required
                     />
                     {form.errors.name && (
                        <p className="text-sm text-destructive">
                           {form.errors.name}
                        </p>
                     )}
                  </div>
                  <div className="space-y-2">
                     <Label htmlFor="company-site">Website (optional)</Label>
                     <Input
                        id="company-site"
                        type="url"
                        value={form.data.website}
                        onChange={(e) =>
                           form.setData('website', e.target.value)
                        }
                        placeholder="https://example.com"
                     />
                     {form.errors.website && (
                        <p className="text-sm text-destructive">
                           {form.errors.website}
                        </p>
                     )}
                  </div>
                  <div className="space-y-2">
                     <Label htmlFor="company-logo">Logo image</Label>
                     <Input
                        id="company-logo"
                        ref={input}
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/svg+xml"
                        onChange={(e) =>
                           setSource(e.target.files?.[0] ?? null)
                        }
                     />
                     {(form.errors.logo || error) && (
                        <p className="text-sm text-destructive">
                           {form.errors.logo || error}
                        </p>
                     )}
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                     <Checkbox
                        checked={removeBg}
                        onCheckedChange={(value) => setRemoveBg(value === true)}
                     />
                     Remove the background automatically (white → transparent)
                  </label>
                  <Button
                     type="submit"
                     disabled={
                        form.processing ||
                        processing ||
                        !form.data.logo ||
                        !form.data.name.trim()
                     }
                  >
                     {form.processing ? (
                        <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                     ) : (
                        <ImagePlus className="mr-2 h-4 w-4" />
                     )}
                     Add logo
                  </Button>
               </div>
               <div
                  className={`flex h-40 items-center justify-center rounded-lg border p-3 md:h-full ${checker}`}
               >
                  {processing ? (
                     <LoaderCircle className="h-6 w-6 animate-spin text-muted-foreground" />
                  ) : preview ? (
                     <img
                        src={preview}
                        alt="Logo preview"
                        className="max-h-full max-w-full object-contain"
                     />
                  ) : (
                     <span className="text-xs text-muted-foreground">
                        Preview
                     </span>
                  )}
               </div>
            </form>

            <div>
               <h2 className="mb-3 text-lg font-semibold">
                  Added logos ({logos.length})
               </h2>
               {logos.length === 0 ? (
                  <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                     No logos yet. Add the first company above.
                  </p>
               ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                     {logos.map((logo) => (
                        <div
                           key={logo.id}
                           className="space-y-3 rounded-xl border p-3"
                        >
                           <div
                              className={`flex h-28 items-center justify-center rounded-lg ${checker}`}
                           >
                              <img
                                 src={`/${logo.logo}`}
                                 alt={logo.name}
                                 className="max-h-20 max-w-[80%] object-contain"
                              />
                           </div>
                           <p className="truncate text-sm font-medium">
                              {logo.name}
                           </p>
                           <div className="flex items-center justify-between">
                              <label className="flex items-center gap-2 text-sm">
                                 <Switch
                                    checked={logo.active}
                                    onCheckedChange={(active) =>
                                       router.post(
                                          `/dashboard/company-logos/${logo.id}`,
                                          { active },
                                          { preserveScroll: true },
                                       )
                                    }
                                 />
                                 Visible
                              </label>
                              <Button
                                 type="button"
                                 variant="ghost"
                                 size="icon"
                                 className="text-red-600 hover:text-red-700"
                                 aria-label={`Delete ${logo.name}`}
                                 onClick={() => setRemoving(logo)}
                              >
                                 <Trash2 className="h-4 w-4" />
                              </Button>
                           </div>
                        </div>
                     ))}
                  </div>
               )}
            </div>
         </div>

         <AlertDialog
            open={Boolean(removing)}
            onOpenChange={(open) => !open && !deleting && setRemoving(null)}
         >
            <AlertDialogContent>
               <AlertDialogHeader>
                  <AlertDialogTitle>Delete this logo?</AlertDialogTitle>
                  <AlertDialogDescription>
                     {removing?.name} will be removed from the home page
                     marquee.
                  </AlertDialogDescription>
               </AlertDialogHeader>
               <AlertDialogFooter>
                  <AlertDialogCancel disabled={deleting}>
                     Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                     disabled={deleting}
                     onClick={(event) => {
                        event.preventDefault();

                        if (!removing) {
                           return;
                        }

                        router.delete(`/dashboard/company-logos/${removing.id}`, {
                           preserveScroll: true,
                           onStart: () => setDeleting(true),
                           onFinish: () => {
                              setDeleting(false);
                              setRemoving(null);
                           },
                        });
                     }}
                  >
                     {deleting && (
                        <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                     )}
                     Delete
                  </AlertDialogAction>
               </AlertDialogFooter>
            </AlertDialogContent>
         </AlertDialog>
      </>
   );
}

Manage.layout = (page: ReactNode) => <DashboardLayout children={page} />;
