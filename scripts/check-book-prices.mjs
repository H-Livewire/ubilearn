import assert from 'node:assert/strict';
import { formatBookAmount } from '../Modules/Store/resources/js/lib/book-price.ts';
assert.equal(formatBookAmount(15000), 'TSh 15,000');
assert.equal(formatBookAmount('7500'), 'TSh 7,500');
assert.equal(formatBookAmount(0), 'TSh 0');
assert.equal(formatBookAmount(null), 'TSh —');
assert.equal(formatBookAmount(undefined), 'TSh —');
assert.equal(formatBookAmount(NaN), 'TSh —');
console.log('PASS: TSh prices, thousands separators, zero and unspecified amounts.');

const { sampleBooks, sampleOffers, samplePrices, withBookSamples } = await import('../Modules/Store/resources/js/lib/sample-books.ts');
assert.deepEqual(samplePrices, [2000,4000,15000,30000,10000]);
assert.equal(sampleBooks.length,5);
assert.ok(sampleBooks.every(book=>book.is_sample && book.id<0 && book.status==='draft'));
assert.ok(sampleOffers.every(book=>book.is_sample && book.price>book.discount_price));
assert.equal(withBookSamples([]).length,5);
assert.equal(withBookSamples([{id:42}])[0].id,42);
assert.equal(withBookSamples([{id:42}]).length,5);
console.log('PASS: five illustrative cards, supplied prices, valid discounts and real-book priority.');
