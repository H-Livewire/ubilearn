import { Link, usePage } from '@inertiajs/react';

interface TeamMember {
   id: number;
   name: string;
   photo: string | null;
   designation: string | null;
}

export default function TeamInstructors() {
   const { teamInstructors = [] } = usePage<{ teamInstructors: TeamMember[] }>().props;

   return (
      <section className="container py-16">
         <h1 className="mb-10 text-center text-3xl font-bold">Our Team</h1>
         <div className="grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-4">
            {teamInstructors.map((instructor) => (
               <Link key={instructor.id} href={`/instructors/${instructor.id}`} className="overflow-hidden rounded-2xl border bg-card p-3">
                  <img src={instructor.photo || '/assets/images/blank-image.jpg'} alt={instructor.name} className="h-64 w-full rounded-lg object-cover object-top" />
                  <h2 className="mt-4 text-center text-lg font-semibold">{instructor.name}</h2>
                  <p className="mb-3 text-center text-sm text-muted-foreground">{instructor.designation || 'Instructor'}</p>
               </Link>
            ))}
         </div>
         {teamInstructors.length === 0 && <p className="text-center text-muted-foreground">No instructors published yet.</p>}
      </section>
   );
}
