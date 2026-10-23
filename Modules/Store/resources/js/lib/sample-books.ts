const covers = [
   ['Unanswered Cries', 'unanswered-cries.jpeg'],
   ['Historia ya Tanzania na Maadili', 'historia-ya-tanzania.jpg'],
   ['Hawa — The Bus Driver', 'hawa.jpeg'],
   ['Mabala — The Farmer', 'mabala.jpeg'],
   ['Book collection', 'book-collection.jpeg'],
];
export const samplePrices = [2000, 4000, 15000, 30000, 10000];
export const sampleBooks: Product[] = covers.map(([title, file], index) => ({
   id: -(index + 1),
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
