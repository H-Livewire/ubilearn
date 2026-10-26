const covers = [
   ['Unanswered Cries', 'unanswered-cries.jpeg'],
   ['Historia ya Tanzania na Maadili', 'historia-ya-tanzania.jpg'],
   ['Hawa — The Bus Driver', 'hawa.jpeg'],
   ['Mabala — The Farmer', 'mabala.jpeg'],
   ['Book collection', 'book-collection.jpeg'],
];
export const samplePrices = [2000, 4000, 15000, 30000, 10000];

/** Stable negative id per cover, so a sample can sit in the cart and favourites. */
export function sampleId(file: string): number {
   let hash = 0;

   for (const char of file) {
      hash = (hash * 31 + char.charCodeAt(0)) % 100000;
   }

   return -(1000 + hash);
}

/** URL part identifying a sample cover: its file name without extension. */
export const sampleKey = (file: string) => file.replace(/\.[^.]+$/, '');

export const schoolCovers: [title: string, file: string][] = [
   ['Comprehensive Biology — Form Two', 'comprehensive-biology-form-two.jpeg'],
   ['Biology for Secondary Schools — Form Two', 'biology-form-two.jpeg'],
   ['Biology for Secondary Schools — Form One', 'biology-form-one.jpeg'],
];

/** Detail page of a sample book (derived from its thumbnail file). */
export function sampleHref(book: Product): string {
   const file = (book.thumbnail || '').split('/').pop() || '';

   return `/books/sample/${sampleKey(file)}`;
}

/** Looks a sample cover up by its URL key. */
export function findSample(key: string): Product | null {
   const all = [...covers, ...schoolCovers];
   const index = all.findIndex(([, file]) => sampleKey(file) === key);

   if (index < 0) {
      return null;
   }

   const [title, file] = all[index];

   return {
      ...sampleBooks[0],
      id: sampleId(file),
      title,
      slug: `sample-${sampleKey(file)}`,
      price: samplePrices[index % samplePrices.length],
      thumbnail: `/assets/images/book-samples/${file}`,
      is_sample: true,
   };
}
export const sampleBooks: Product[] = covers.map(([title, file], index) => ({
   id: sampleId(covers[index][1]),
   title,
   slug: `sample-${index + 1}`,
   summary: 'Sample book',
   status: 'draft',
   pricing_type: 'paid',
   price: samplePrices[index],
   discount: false,
   thumbnail: `/assets/images/book-samples/${file}`,
   inventory: 0,
   unlimited_inventory: true,
   featured: false,
   views: 0,
   instructor_id: 0,
   product_category_id: 0,
   created_at: '',
   updated_at: '',
   is_sample: true,
}));
const originalPrices = [3000, 6000, 20000, 40000, 15000];
export const sampleOffers: Product[] = sampleBooks.map((book, index) => ({
   ...book,
   price: originalPrices[index],
   discount: true,
   discount_price: samplePrices[index],
}));

/** Keep real books first and fill sparse preview shelves to five cards. */
export function withBookSamples(
   books: Product[],
   examples: Product[] = sampleBooks,
): Product[] {
   return [...books, ...examples.slice(0, Math.max(0, 5 - books.length))];
}
