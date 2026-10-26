import { usePage } from '@inertiajs/react';
import {
   ChevronDown,
   Heart,
   LoaderCircle,
   Lock,
   MessageSquare,
   Reply,
   Send,
   Share2,
   Trash2,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface CommentUser {
   id: number | null;
   name: string;
   role: string | null;
   photo: string | null;
}

interface Comment {
   id: number;
   parent_id: number | null;
   body: string;
   created_at: string | null;
   likes: number;
   liked: boolean;
   user: CommentUser;
}

const POLL_MS = 20000;

/** Sends a guest to log in and brings them back to the comment section afterwards. */
function goLogin(): void {
   const to = `${window.location.pathname}${window.location.search}#paper-comments`;
   window.location.href = `/auth/continue?to=${encodeURIComponent(to)}`;
}

function xsrf(): string {
   const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/);

   return match ? decodeURIComponent(match[1]) : '';
}

async function api<T>(url: string, method: string, body?: unknown): Promise<T> {
   const response = await fetch(url, {
      method,
      credentials: 'same-origin',
      headers: {
         Accept: 'application/json',
         'Content-Type': 'application/json',
         'X-Requested-With': 'XMLHttpRequest',
         'X-XSRF-TOKEN': xsrf(),
      },
      body: body ? JSON.stringify(body) : undefined,
   });

   if (!response.ok) {
      const data = await response.json().catch(() => null);
      const message =
         data?.errors?.body?.[0] ||
         data?.message ||
         'Imeshindikana. Tafadhali jaribu tena.';
      throw new Error(message);
   }

   return response.json();
}

function timeAgo(iso: string | null): string {
   if (!iso) {
      return '';
   }

   const seconds = Math.max(
      0,
      Math.round((Date.now() - new Date(iso).getTime()) / 1000),
   );

   if (seconds < 45) {
      return 'sasa hivi';
   }

   const minutes = Math.round(seconds / 60);

   if (minutes < 60) {
      return `dakika ${minutes} zilizopita`;
   }

   const hours = Math.round(minutes / 60);

   if (hours < 24) {
      return `saa ${hours} zilizopita`;
   }

   const days = Math.round(hours / 24);

   if (days < 30) {
      return `siku ${days} zilizopita`;
   }

   return new Date(iso).toLocaleDateString('sw-TZ', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
   });
}

const palette = [
   'bg-emerald-600',
   'bg-teal-600',
   'bg-sky-600',
   'bg-amber-600',
   'bg-rose-600',
   'bg-violet-600',
];

function Avatar({
   user,
   size = 'md',
}: {
   user: Pick<CommentUser, 'name' | 'photo' | 'id'>;
   size?: 'sm' | 'md';
}) {
   const [failed, setFailed] = useState(false);
   const initials =
      user.name
         .split(/\s+/)
         .filter(Boolean)
         .slice(0, 2)
         .map((part) => part[0]?.toUpperCase())
         .join('') || '?';
   const dimension = size === 'sm' ? 'h-8 w-8 text-xs' : 'h-10 w-10 text-sm';

   return (
      <div
         className={cn(
            'flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold text-white ring-2 ring-background',
            dimension,
            palette[(user.id ?? 0) % palette.length],
         )}
      >
         {user.photo && !failed ? (
            <img
               src={user.photo}
               alt={user.name}
               loading="lazy"
               className="h-full w-full object-cover"
               onError={() => setFailed(true)}
            />
         ) : (
            initials
         )}
      </div>
   );
}

function Composer({
   me,
   placeholder,
   autoFocus,
   submitting,
   onSubmit,
   onCancel,
   compact,
}: {
   me: CommentUser;
   placeholder: string;
   autoFocus?: boolean;
   submitting: boolean;
   onSubmit: (text: string) => Promise<boolean>;
   onCancel?: () => void;
   compact?: boolean;
}) {
   const [text, setText] = useState('');
   const area = useRef<HTMLTextAreaElement>(null);

   const grow = () => {
      if (area.current) {
         area.current.style.height = 'auto';
         area.current.style.height = `${Math.min(area.current.scrollHeight, 200)}px`;
      }
   };

   const send = async () => {
      const value = text.trim();

      if (!value || submitting) {
         return;
      }

      if (await onSubmit(value)) {
         setText('');
         requestAnimationFrame(grow);
      }
   };

   return (
      <div className="flex items-start gap-3">
         <Avatar user={me} size={compact ? 'sm' : 'md'} />
         <div className="min-w-0 flex-1">
            <div className="flex items-end gap-2 rounded-3xl border bg-muted/40 py-1.5 pr-1.5 pl-4 transition-colors focus-within:border-emerald-700 focus-within:bg-background focus-within:ring-2 focus-within:ring-emerald-700/20">
               <textarea
                  ref={area}
                  rows={1}
                  value={text}
                  autoFocus={autoFocus}
                  maxLength={2000}
                  placeholder={placeholder}
                  aria-label={placeholder}
                  onChange={(event) => {
                     setText(event.target.value);
                     grow();
                  }}
                  onKeyDown={(event) => {
                     if (
                        event.key === 'Enter' &&
                        (event.ctrlKey || event.metaKey)
                     ) {
                        event.preventDefault();
                        void send();
                     }
                  }}
                  className="max-h-48 min-h-9 w-full resize-none bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground"
               />
               <button
                  type="button"
                  onClick={() => void send()}
                  disabled={!text.trim() || submitting}
                  aria-label="Tuma"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#047857] text-white transition-colors hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-40"
               >
                  {submitting ? (
                     <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                     <Send className="h-4 w-4" />
                  )}
               </button>
            </div>
            {onCancel && (
               <button
                  type="button"
                  onClick={onCancel}
                  className="mt-1 ml-3 text-xs text-muted-foreground hover:text-foreground"
               >
                  Ghairi
               </button>
            )}
         </div>
      </div>
   );
}

export default function PaperComments({ paperId }: { paperId: number }) {
   const { auth } = usePage<SharedData>().props;
   const user = auth?.user as
      | { id: number; name: string; photo?: string | null; role?: string }
      | undefined;
   const me: CommentUser | null = user
      ? {
           id: user.id,
           name: user.name,
           role: user.role ?? null,
           photo: user.photo
              ? /^https?:\/\//i.test(user.photo)
                 ? user.photo
                 : `/${user.photo.replace(/^\/+/, '')}`
              : null,
        }
      : null;

   const [comments, setComments] = useState<Comment[]>([]);
   const [loading, setLoading] = useState(true);
   const [failed, setFailed] = useState(false);
   const [submitting, setSubmitting] = useState(false);
   const [replyTo, setReplyTo] = useState<number | null>(null);
   const [collapsed, setCollapsed] = useState<Set<number>>(new Set());
   const [removing, setRemoving] = useState<number | null>(null);
   const busy = useRef(false);

   const load = useCallback(async () => {
      try {
         const data = await api<{ comments: Comment[] }>(
            `/examinations/${paperId}/comments`,
            'GET',
         );
         setComments(data.comments);
         setFailed(false);
      } catch {
         setFailed(true);
      } finally {
         setLoading(false);
      }
   }, [paperId]);

   useEffect(() => {
      void load();
      const timer = window.setInterval(() => {
         if (document.visibilityState === 'visible' && !busy.current) {
            void load();
         }
      }, POLL_MS);

      return () => window.clearInterval(timer);
   }, [load]);

   // Jump to a shared comment (#comment-123) once the list has loaded.
   const jumped = useRef(false);
   useEffect(() => {
      if (jumped.current || comments.length === 0) {
         return;
      }

      const match = window.location.hash.match(/^#comment-(\d+)$/);

      if (match) {
         jumped.current = true;
         document
            .getElementById(`comment-${match[1]}`)
            ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
   }, [comments]);

   const children = useMemo(() => {
      const map = new Map<number | null, Comment[]>();

      for (const comment of comments) {
         const list = map.get(comment.parent_id) ?? [];
         list.push(comment);
         map.set(comment.parent_id, list);
      }

      return map;
   }, [comments]);

   // Newest top-level comments first; replies read oldest to newest.
   const roots = useMemo(
      () => [...(children.get(null) ?? [])].reverse(),
      [children],
   );

   const post = async (text: string, parentId: number | null) => {
      busy.current = true;
      setSubmitting(true);

      try {
         const created = await api<Comment>(
            `/examinations/${paperId}/comments`,
            'POST',
            { body: text, parent_id: parentId },
         );
         setComments((current) => [...current, created]);
         setReplyTo(null);

         if (parentId) {
            setCollapsed((current) => {
               const next = new Set(current);
               next.delete(parentId);

               return next;
            });
         }

         return true;
      } catch (error) {
         toast.error((error as Error).message);

         return false;
      } finally {
         busy.current = false;
         setSubmitting(false);
      }
   };

   const like = async (comment: Comment) => {
      if (!me) {
         goLogin();

         return;
      }

      // Optimistic, then settle on the server's number.
      setComments((current) =>
         current.map((item) =>
            item.id === comment.id
               ? {
                    ...item,
                    liked: !item.liked,
                    likes: item.likes + (item.liked ? -1 : 1),
                 }
               : item,
         ),
      );

      try {
         const result = await api<{ liked: boolean; likes: number }>(
            `/examination-comments/${comment.id}/like`,
            'POST',
         );
         setComments((current) =>
            current.map((item) =>
               item.id === comment.id ? { ...item, ...result } : item,
            ),
         );
      } catch (error) {
         toast.error((error as Error).message);
         void load();
      }
   };

   const remove = async (comment: Comment) => {
      if (!window.confirm('Futa maoni haya pamoja na majibu yake?')) {
         return;
      }

      setRemoving(comment.id);

      try {
         await api(`/examination-comments/${comment.id}`, 'DELETE');
         await load();
      } catch (error) {
         toast.error((error as Error).message);
      } finally {
         setRemoving(null);
      }
   };

   const share = async (comment: Comment) => {
      const url = `${window.location.origin}${window.location.pathname}#comment-${comment.id}`;

      try {
         await navigator.clipboard.writeText(url);
         toast.success('Kiungo kimenakiliwa');
      } catch {
         toast.error('Imeshindwa kunakili kiungo');
      }
   };

   const renderNode = (comment: Comment, depth: number) => {
      const replies = children.get(comment.id) ?? [];
      const isCollapsed = collapsed.has(comment.id);
      const canDelete =
         me !== null && (me.id === comment.user.id || me.role === 'admin');
      return (
         <li
            key={comment.id}
            id={`comment-${comment.id}`}
            className={cn(
               'scroll-mt-28 animate-in fade-in slide-in-from-bottom-1 duration-300 motion-reduce:animate-none',
               removing === comment.id && 'opacity-50',
            )}
         >
            <div className="flex gap-3">
               <div className="flex flex-col items-center">
                  <Avatar user={comment.user} size={depth ? 'sm' : 'md'} />
                  {replies.length > 0 && !isCollapsed && (
                     <button
                        type="button"
                        aria-label="Ficha majibu"
                        onClick={() =>
                           setCollapsed((current) =>
                              new Set(current).add(comment.id),
                           )
                        }
                        className="group mt-1 flex w-6 flex-1 justify-center"
                     >
                        <span className="w-0.5 rounded bg-emerald-700/20 transition-colors group-hover:bg-emerald-700" />
                     </button>
                  )}
               </div>
               <div className="min-w-0 flex-1 pb-4">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
                     <span className="font-semibold">{comment.user.name}</span>
                     <span className="text-xs text-muted-foreground">
                        · {timeAgo(comment.created_at)}
                     </span>
                  </div>
                  <p className="mt-1 text-sm leading-relaxed [overflow-wrap:anywhere] whitespace-pre-wrap">
                     {comment.body}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                     <button
                        type="button"
                        onClick={() => void like(comment)}
                        aria-pressed={comment.liked}
                        className={cn(
                           'flex items-center gap-1.5 rounded-full px-2.5 py-1.5 transition-colors hover:bg-muted hover:text-foreground',
                           comment.liked && 'text-rose-600 hover:text-rose-600',
                        )}
                     >
                        <Heart
                           className={cn(
                              'h-4 w-4',
                              comment.liked && 'fill-rose-600',
                           )}
                        />
                        {comment.likes > 0 ? comment.likes : 'Penda'}
                     </button>
                     <button
                        type="button"
                        onClick={() => {
                           if (!me) {
                              goLogin();

                              return;
                           }

                           setReplyTo((current) =>
                              current === comment.id ? null : comment.id,
                           );
                        }}
                        className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5 transition-colors hover:bg-muted hover:text-foreground"
                     >
                        <Reply className="h-4 w-4" />
                        Jibu
                     </button>
                     <button
                        type="button"
                        onClick={() => void share(comment)}
                        className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5 transition-colors hover:bg-muted hover:text-foreground"
                     >
                        <Share2 className="h-4 w-4" />
                        Shiriki
                     </button>
                     {canDelete && (
                        <button
                           type="button"
                           onClick={() => void remove(comment)}
                           aria-label="Futa maoni"
                           className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
                        >
                           <Trash2 className="h-4 w-4" />
                        </button>
                     )}
                  </div>

                  {replyTo === comment.id && me && (
                     <div className="mt-3">
                        <Composer
                           me={me}
                           compact
                           autoFocus
                           submitting={submitting}
                           placeholder={`Jibu ${comment.user.name}…`}
                           onSubmit={(text) => post(text, comment.id)}
                           onCancel={() => setReplyTo(null)}
                        />
                     </div>
                  )}

                  {replies.length > 0 &&
                     (isCollapsed ? (
                        <button
                           type="button"
                           onClick={() =>
                              setCollapsed((current) => {
                                 const next = new Set(current);
                                 next.delete(comment.id);

                                 return next;
                              })
                           }
                           className="mt-2 flex items-center gap-1 text-xs font-medium text-emerald-700 hover:underline dark:text-emerald-400"
                        >
                           <ChevronDown className="h-3.5 w-3.5" />
                           Onyesha majibu {replies.length}
                        </button>
                     ) : (
                        <ul className="mt-4 space-y-0">
                           {replies.map((reply) =>
                              renderNode(reply, depth + 1),
                           )}
                        </ul>
                     ))}
               </div>
            </div>
         </li>
      );
   };

   return (
      <section
         id="paper-comments"
         aria-labelledby="paper-comments-title"
         className="rounded-2xl border bg-card p-4 shadow-sm md:p-6"
      >
         <div className="mb-6 flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#047857] text-white">
               <MessageSquare className="h-5 w-5" />
            </span>
            <div>
               <h2
                  id="paper-comments-title"
                  className="flex items-center gap-2 text-xl font-bold"
               >
                  Comments
                  <span className="rounded-full bg-emerald-700/10 px-2.5 py-0.5 text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                     {comments.length}
                  </span>
               </h2>
            </div>
         </div>

         {me ? (
            <Composer
               me={me}
               submitting={submitting && replyTo === null}
               placeholder="Andika maoni au uliza swali…"
               onSubmit={(text) => post(text, null)}
            />
         ) : (
            <button
               type="button"
               onClick={goLogin}
               className="flex w-full items-center gap-3 text-left"
            >
               <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <Lock className="h-4 w-4" />
               </span>
               <span className="flex-1 rounded-3xl border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                  Andika maoni au uliza swali…
               </span>
            </button>
         )}

         <div className="mt-8">
            {loading ? (
               <div className="flex justify-center py-8" role="status">
                  <LoaderCircle className="h-6 w-6 animate-spin text-emerald-700" />
               </div>
            ) : failed && comments.length === 0 ? (
               <p className="py-8 text-center text-sm text-muted-foreground">
                  Maoni hayajapakia.{' '}
                  <button
                     type="button"
                     onClick={() => void load()}
                     className="font-medium text-emerald-700 underline"
                  >
                     Jaribu tena
                  </button>
               </p>
            ) : roots.length === 0 ? (
               <p className="py-8 text-center text-sm text-muted-foreground">
                  Bado hakuna maoni. Kuwa wa kwanza kuuliza au kutoa maelezo!
               </p>
            ) : (
               <ul className="space-y-1">
                  {roots.map((comment) => renderNode(comment, 0))}
               </ul>
            )}
         </div>
      </section>
   );
}
