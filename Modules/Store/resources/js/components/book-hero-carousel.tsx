import { details, shop } from '@/routes/products';
import { Link } from '@inertiajs/react';
import { ArrowLeft, ArrowRight, BookOpen, Pause, Play } from 'lucide-react';
import { useEffect, useState  } from 'react';
import type {CSSProperties} from 'react';

const backgrounds = [
   '/assets/images/bookglow-library.jpg',
   '/assets/images/bookglow-stack.png',
   '/assets/images/bookglow-reading.jpeg',
];
export default function BookHeroCarousel({ books }: { books: Product[] }) {
   const slides = books.filter((book) => book.thumbnail).slice(0, 5);
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
      }, 6000);
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
   }, [paused, autoplay, slides.length]);

   return (
      <section
         className="container py-6 md:py-9"
         aria-label="BookGlow Carousel"
         aria-roledescription="carousel"
      >
         <div
            className="bookglow"
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
            {backgrounds.map((src, index) => (
               <img
                  key={src}
                  src={src}
                  alt=""
                  aria-hidden="true"
                  className="bookglow-background"
                  style={{
                     opacity: active % backgrounds.length === index ? 0.32 : 0,
                  }}
               />
            ))}
            <div aria-hidden="true" className="bookglow-shade" />
            <div className="bookglow-heading">
               <span>UbiLearn presents</span>
               <h1>
                  BookGlow <span>Carousel</span>
               </h1>
               <p>Find a story. Discover a new perspective.</p>
            </div>
            <div className="bookglow-stage">
               {slides.map((slide, index) => {
                  let slot = (index - active + slides.length) % slides.length;

                  if (slot > slides.length / 2) {
slot -= slides.length;
}

                  return (
                     <Link
                        key={slide.id}
                        href={details({ slug: slide.slug, id: slide.id })}
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
                  <p>{book.title}</p>
                  <Link href={details({ slug: book.slug, id: book.id })}>
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
                     className="bookglow-pause"
                     aria-label={autoplay ? 'Pause carousel' : 'Play carousel'}
                     onClick={() => setAutoplay((value) => !value)}
                  >
                     {autoplay ? (
                        <Pause className="h-4 w-4" />
                     ) : (
                        <Play className="h-4 w-4" />
                     )}
                  </button>
               </>
            )}
         </div>
      </section>
   );
}
