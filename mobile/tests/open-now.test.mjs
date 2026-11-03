import assert from 'node:assert/strict';
import test from 'node:test';
import { filterOpenNow, isOpenNow } from '../src/discovery/openNow.ts';

const shops = [
  { id: 'a', availableBarbers: 2 },
  { id: 'b', availableBarbers: 0 },
  { id: 'c', availableBarbers: 1 },
];

test('a shop is open now only when at least one barber is available', () => {
  assert.equal(isOpenNow(shops[0]), true);
  assert.equal(isOpenNow(shops[1]), false);
});

test('the open-now filter keeps order and leaves the list untouched when off', () => {
  assert.deepEqual(filterOpenNow(shops, true).map(x => x.id), ['a', 'c']);
  const all = filterOpenNow(shops, false);
  assert.deepEqual(all.map(x => x.id), ['a', 'b', 'c']);
  assert.notEqual(all, shops);
});
