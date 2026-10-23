import assert from 'node:assert/strict';
import { formatBookAmount } from '../Modules/Store/resources/js/lib/book-price.ts';
assert.equal(formatBookAmount(15000), 'TSh 15,000');
assert.equal(formatBookAmount('7500'), 'TSh 7,500');
assert.equal(formatBookAmount(0), 'TSh 0');
assert.equal(formatBookAmount(null), 'Bei itawekwa (TSh)');
assert.equal(formatBookAmount(undefined), 'Bei itawekwa (TSh)');
assert.equal(formatBookAmount(NaN), 'Bei itawekwa (TSh)');
console.log('PASS: TSh prices, thousands separators, zero and unspecified amounts.');
