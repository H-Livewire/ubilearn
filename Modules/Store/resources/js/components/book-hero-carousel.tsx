import { shop } from '@/routes/products';
import { Link } from '@inertiajs/react';
import { ArrowLeft, ArrowRight, BookOpen } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';

const slides = [
   {
      id: 'library',
      title: 'Discover your next read',
      thumbnail: '/assets/images/bookglow-library.jpg',
   },
   {
      id: 'stack',
      title: 'A world of books awaits',
      thumbnail: '/assets/images/bookglow-stack.png',
   },
   {
      id: 'reading',
      title: 'Make time for a good book',
      thumbnail: '/assets/images/bookglow-reading.jpeg',
   },
   {
      id: 'photo',
      title: 'Explore the UbiLearn library',
      thumbnail: '/assets/images/bookglow-photo.avif',
   },
   {
      id: 'children',
      title: 'Learning together',
      thumbnail: '/assets/images/books-children-reading.jpeg',
   },
];
export default function BookHeroCarousel() {
   const [activeIndex, setActiveIndex] = useState(0);
   const [paused, setPaused] = useState(false);
   const [autoplay, setAutoplay] = useState(true);
   const active = slides.length ? activeIndex % slides.length : 0;
   const book = slides[active];
   const move = (step: number) =>
      setActiveIndex((index) => (index + step + slides.length) % slides.length);
   useEffect(() => {
      const motion = window.matchMedia('(prefers-reduced-motion: reduce)');

      if (paused || !autoplay || slides.length < 2 || motion.matches) {
         return;
      }

      const timer = window.setInterval(() => {
         if (!document.hidden) {
            setActiveIndex((index) => (index + 1) % slides.length);
         }
      }, 5000);
      const stop = () => {
         if (motion.matches) {
            window.clearInterval(timer);
         }
      };
      motion.addEventListener('change', stop);

      return () => {
         window.clearInterval(timer);
         motion.removeEventListener('change', stop);
      };
   }, [paused, autoplay]);

   return (
      <section
         className="container py-6 md:py-9"
         aria-label="BookGlow Carousel"
         aria-roledescription="carousel"
      >
         <div
            className="bookglow bookglow-photos"
            tabIndex={0}
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onFocusCapture={() => setPaused(true)}
            onBlurCapture={(event) => {
               if (!event.currentTarget.contains(event.relatedTarget)) {
                  setPaused(false);
               }
            }}
            onKeyDown={(event) => {
               if (event.target !== event.currentTarget || slides.length < 2) {
                  return;
               }

               if (event.key === 'ArrowRight') {
                  event.preventDefault();
                  move(1);
               }

               if (event.key === 'ArrowLeft') {
                  event.preventDefault();
                  move(-1);
               }

               if (event.key === 'Home') {
                  event.preventDefault();
                  setActiveIndex(0);
               }

               if (event.key === 'End') {
                  event.preventDefault();
                  setActiveIndex(slides.length - 1);
               }
            }}
         >
            <div className="bookglow-stage">
               {slides.map((slide, index) => {
                  let slot = (index - active + slides.length) % slides.length;

                  if (slot > slides.length / 2) {
                     slot -= slides.length;
                  }

                  return (
                     <Link
                        key={slide.id}
                        href={shop.url(
                           { category: 'all' },
                           { query: { browse: 1 } },
                        )}
                        className={`bookglow-item ${slot === 0 ? 'is-active' : ''}`}
                        style={
                           {
                              '--slot': slot,
                              '--depth': Math.abs(slot),
                              zIndex: 5 - Math.abs(slot),
                           } as CSSProperties
                        }
                        aria-label={`Open ${slide.title}`}
                        aria-current={slot === 0 ? 'true' : undefined}
                     >
                        <img
                           src={slide.thumbnail}
                           alt={slide.title}
                           draggable={false}
                           loading={index === 0 ? 'eager' : 'lazy'}
                        />
                        <span className="bookglow-spine" aria-hidden="true" />
                     </Link>
                  );
               })}
               {!slides.length && (
                  <div className="bookglow-empty">
                     <BookOpen className="h-14 w-14" />
                     <p>Discover books on UbiLearn</p>
                     <Link href={shop.url({}, { query: { browse: 1 } })}>
                        Browse books
                     </Link>
                  </div>
               )}
            </div>
            {book && (
               <div
                  className="bookglow-caption"
                  aria-live={paused ? 'polite' : 'off'}
               >
                  <Link
                     href={shop.url(
                        { category: 'all' },
                        { query: { browse: 1 } },
                     )}
                  >
                     Explore book <ArrowRight className="h-4 w-4" />
                  </Link>
               </div>
            )}
            {slides.length > 1 && (
               <>
                  <button
                     className="bookglow-arrow bookglow-prev"
                     type="button"
                     aria-label="Previous featured book"
                     onClick={() => move(-1)}
                  >
                     <ArrowLeft className="h-5 w-5" />
                  </button>
                  <button
                     className="bookglow-arrow bookglow-next"
                     type="button"
                     aria-label="Next featured book"
                     onClick={() => move(1)}
                  >
                     <ArrowRight className="h-5 w-5" />
                  </button>
                  <div className="bookglow-dots">
                     {slides.map((slide, index) => (
                        <button
                           key={slide.id}
                           type="button"
                           aria-label={`Show ${slide.title}`}
                           aria-current={index === active ? 'true' : undefined}
                           onClick={() => setActiveIndex(index)}
                        >
                           <span />
                        </button>
                     ))}
                  </div>
                  <button
                     type="button"
                     className="sr-only focus:not-sr-only focus:absolute focus:right-4 focus:bottom-4 focus:rounded focus:bg-white focus:p-2 focus:text-emerald-800"
                     aria-label={
                        autoplay ? 'Pause carousel' : 'Resume carousel'
                     }
                     onClick={() => setAutoplay((value) => !value)}
                  >
                     {autoplay ? 'Pause carousel' : 'Resume carousel'}
                  </button>
               </>
            )}
         </div>
      </section>
   );
}
