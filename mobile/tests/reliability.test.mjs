import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mapMobileError } from '../src/api/errorPolicy.ts';
import { manageRealtime, expectedDisconnect } from '../src/realtime/lifecycle.ts';

test('API errors never expose internal messages or unsafe correlation data', () => {
  assert.equal(mapMobileError({ status: 500, message: 'password=secret; Server=db' }).key, 'errors.unexpected');
  assert.equal(mapMobileError({ status: 409, code: 'TEAM_CHAIR_CONFLICT' }).key, 'errors.chair');
  assert.equal(mapMobileError({ status: 400, code: 'MEDIA_TOO_LARGE' }).key, 'errors.mediaSize');
  assert.equal(mapMobileError({ status: 500, correlationId: '<secret>' }).correlationId, undefined);
  assert.equal(mapMobileError({ status: 500, correlationId: 'req-123' }).correlationId, 'req-123');
  for (const status of [400, 401, 403, 404, 409, 422, 429, 500]) assert.ok(mapMobileError({ status }).key);
  assert.equal(mapMobileError(new TypeError('Network request failed')).key, 'errors.offline');
});

class FakeConnection {
  state = 'Disconnected';
  reconnecting = () => {};
  reconnected = () => {};
  closed = () => {};
  starts = 0; stops = 0;
  async start() { this.starts++; this.state = 'Connected'; }
  async stop() { this.stops++; this.state = 'Disconnected'; this.closed(); }
  onreconnecting(callback) { this.reconnecting = callback; }
  onreconnected(callback) { this.reconnected = callback; }
  onclose(callback) { this.closed = callback; }
}

test('foreground, reconnect and background produce truthful states and snapshot recovery', async () => {
  const connection = new FakeConnection(); const states = []; let syncs = 0;
  const lifecycle = manageRealtime(connection, state => states.push(state), () => syncs++, () => {});
  await lifecycle.setActive(true);
  assert.equal(states.at(-1), 'Connected'); assert.equal(syncs, 1);
  connection.reconnecting(new Error('Server timeout elapsed without receiving a message from the server.'));
  assert.equal(states.at(-1), 'Reconnecting');
  connection.reconnected(); assert.equal(syncs, 2);
  await lifecycle.setActive(false); assert.equal(states.at(-1), 'Offline');
  await lifecycle.setActive(true); assert.equal(connection.starts, 2); assert.equal(syncs, 3);
  await lifecycle.dispose();
  connection.reconnected(); assert.equal(syncs, 3);
});

test('unexpected failures remain diagnosable, expected timeout is not a crash', async () => {
  const connection = new FakeConnection(); const errors = [];
  const lifecycle = manageRealtime(connection, () => {}, () => {}, error => errors.push(error));
  await lifecycle.setActive(true);
  connection.reconnecting(new Error('Server timeout elapsed without receiving a message from the server.'));
  assert.equal(errors.length, 0);
  connection.reconnecting(new Error('Invalid hub protocol'));
  assert.equal(errors.length, 1);
  assert.equal(expectedDisconnect('Invalid hub protocol'), false);
  await lifecycle.dispose();
});

import { suggestChair } from '../src/team/chairSuggestion.ts';
test('chair suggestion tracks loaded data and does not reuse inactive assignments', () => {
  assert.equal(suggestChair([]), 1);
  assert.equal(suggestChair([{ chairNumber: 1 }, { chairNumber: 2 }]), 3);
  assert.equal(suggestChair([{ chairNumber: 1 }, { chairNumber: 3 }]), 4);
});

import { rebookParams } from '../src/turnRequests/rebook.ts';
import { singleFlight } from '../src/auth/singleFlight.ts';
import { commonCopy } from '../src/i18n/features/common.ts';
import { reliabilityCopy } from '../src/i18n/features/reliability.ts';
import { teamCopy } from '../src/i18n/features/team.ts';
import { marketplaceCopy } from '../src/i18n/features/marketplace.ts';
import { operationsCopy } from '../src/i18n/features/operations.ts';
test('rebook retains resources but never copies a past slot or capability', () => {
 assert.deepEqual(rebookParams({ slug: 'shop', barberId: 'barber', serviceId: 'service', startsAt: '2020-01-01', lookupToken: 'private' }), { slug: 'shop', barberId: 'barber', serviceId: 'service' });
});
test('concurrent refresh consumers share one rotation and failures permit retry', async () => {
 let count = 0; let resolve;
 const run = singleFlight(() => { count++; return new Promise(r => { resolve = r; }); });
 const first = run(); const second = run(); assert.equal(count, 1); assert.equal(first, second);
 resolve('renewed'); assert.equal(await second, 'renewed');
 const third = run(); assert.equal(count, 2); resolve('next'); await third;
 let failures = 0; const fail = singleFlight(async () => { failures++; throw new Error('offline'); });
 await assert.rejects(fail); await assert.rejects(fail); assert.equal(failures, 2);
});
test('new namespaces have complete Spanish/English parity and documented fallback', () => {
 for (const getCopy of [commonCopy, reliabilityCopy, teamCopy, marketplaceCopy, operationsCopy]) {
   assert.deepEqual(Object.keys(getCopy('es-419')).sort(), Object.keys(getCopy('en')).sort());
   assert.ok(Object.values(getCopy('es-419')).every(value => value.trim().length));
   assert.deepEqual(getCopy('fr'), getCopy('en'));
 }
});

import { resolveEasProjectId, safeNotificationPath } from '../src/notifications/pushPolicy.ts';
test('push configuration uses an actual UUID source and rejects missing/invalid IDs', () => {
 const fixture = '11111111-1111-4111-8111-111111111111';
 assert.equal(resolveEasProjectId('', fixture), fixture);
 assert.equal(resolveEasProjectId(undefined, undefined, fixture), fixture);
 assert.equal(resolveEasProjectId('not-configured'), undefined);
 assert.equal(resolveEasProjectId(), undefined);
});
test('notification navigation accepts only known internal routes', () => {
 assert.equal(safeNotificationPath('https://attacker.test'), null);
 assert.equal(safeNotificationPath('/(app)/team'), null);
 assert.equal(safeNotificationPath('/(app)/turn-requests'), '/(app)/turn-requests');
 assert.equal(safeNotificationPath('/request-status/shop/11111111-1111-4111-8111-111111111111'), '/request-status/shop/11111111-1111-4111-8111-111111111111');
 assert.equal(safeNotificationPath('/request-status/shop/11111111-1111-4111-8111-111111111111?token=private'), null);
});

import { navigationForRole } from '../src/ui/navigationPolicy.ts';
test('role navigation exposes only permitted destinations and denies unknown roles', () => {
 for (const role of ['Owner', 'Administrator']) assert.ok(navigationForRole(role).some(item => item.id === 'team'));
 for (const role of ['Barber', 'Receptionist', 'Client', undefined, 'Display']) assert.ok(navigationForRole(role).every(item => item.id !== 'team'));
 assert.deepEqual(navigationForRole('Client').map(item => item.id), ['discover', 'history', 'settings']);
 assert.deepEqual(navigationForRole().map(item => item.id), ['discover']);
});

import { sortShops } from '../src/discovery/sortShops.ts';
test('Discovery sorts available results without changing the cached order', () => {
 const shops = [{ name: 'A', availableBarbers: 0, estimatedWaitMinutes: null }, { name: 'B', availableBarbers: 2, estimatedWaitMinutes: 10 }, { name: 'C', availableBarbers: 1, estimatedWaitMinutes: 0 }];
 assert.deepEqual(sortShops(shops, 'wait').map(s => s.name), ['C','B','A']);
 assert.deepEqual(sortShops(shops, 'availability').map(s => s.name), ['B','C','A']);
 assert.deepEqual(shops.map(s => s.name), ['A','B','C']);
});
