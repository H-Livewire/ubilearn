import { createRoot } from 'react-dom/client';
import { createInertiaApp } from '@inertiajs/react';
import Hero from '../../Modules/Store/resources/js/components/book-hero-carousel';
import SampleBooks from '../../Modules/Store/resources/js/components/sample-books';
import '../../resources/css/app.css';
createInertiaApp({
   page: {
      component: 'Books',
      props: {},
      url: '/previews/books/index.html',
      version: 'preview',
   },
   resolve: () => ({
      default: () => (
         <>
            <div className="container flex justify-between border-b py-5 text-sm">
               <span>Home / Books &nbsp; Browse categories⌄</span>
               <span>Search books</span>
            </div>
            <Hero />
            <SampleBooks />
         </>
      ),
   }),
   setup: ({ el, App, props }) => createRoot(el).render(<App {...props} />),
});
