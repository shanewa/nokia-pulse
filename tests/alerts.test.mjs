import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { createAlert, evaluateAlert, arm } = require('../extension/lib/alerts.js');

const make = (type, target, frequency, price) =>
  createAlert({ symbol: 'NOKIA.HE', type, target, frequency }, price, 1);

function run(alert, prices) {
  const fires = [];
  let cur = alert;
  prices.forEach((p, i) => {
    const r = evaluateAlert(cur, p, i + 10);
    if (r.fired) fires.push(i);
    cur = r.alert;
  });
  return { fires, alert: cur };
}

test('above/once pauses after firing once', () => {
  const { fires, alert } = run(make('above', 5, 'once', 4.8), [4.9, 5.0, 5.2, 5.3]);
  assert.deepEqual(fires, [1]);
  assert.equal(alert.enabled, false);
});

test('above/once fires on the first check if the condition is already met at creation', () => {
  const { fires } = run(make('above', 5, 'once', 5.5), [5.5]);
  assert.deepEqual(fires, [0]);
});

test('above/every does not repeat above the target and fires only after falling back and crossing again', () => {
  const { fires } = run(make('above', 5, 'every', 4.8), [5.1, 5.2, 5.3, 4.9, 4.95, 5.1]);
  assert.deepEqual(fires, [0, 5]);
});

test('above/every waits for a fallback if the condition is already met at creation', () => {
  const { fires } = run(make('above', 5, 'every', 5.5), [5.6, 5.7, 4.9, 5.1]);
  assert.deepEqual(fires, [3]);
});

test('below/every behaves symmetrically', () => {
  const { fires } = run(make('below', 4, 'every', 4.5), [4.2, 3.9, 3.8, 4.1, 3.9]);
  assert.deepEqual(fires, [1, 4]);
});

test('cross fires when crossing in either direction', () => {
  const { fires } = run(make('cross', 5, 'every', 4.8), [4.9, 5.1, 5.2, 4.9, 4.7]);
  assert.deepEqual(fires, [1, 3]);
});

test('cross does not fire at the exact target and retains the previous side', () => {
  const { fires } = run(make('cross', 5, 'every', 4.8), [5.0, 4.9, 5.0, 5.1]);
  assert.deepEqual(fires, [3]);
});

test('cross/once pauses after firing', () => {
  const { fires, alert } = run(make('cross', 5, 'once', 4.8), [5.1, 4.9]);
  assert.deepEqual(fires, [0]);
  assert.equal(alert.enabled, false);
});

test('paused alerts and invalid prices do not fire', () => {
  const a = Object.assign(make('above', 5, 'once', 4), { enabled: false });
  assert.equal(evaluateAlert(a, 6, 1).fired, false);
  assert.equal(evaluateAlert(make('above', 5, 'once', 4), NaN, 1).fired, false);
});

test('rearming uses the current price as the baseline', () => {
  const paused = Object.assign(make('above', 5, 'every', 4), { enabled: false });
  const re = Object.assign(arm(paused, 5.5), { enabled: true });
  assert.equal(evaluateAlert(re, 5.6, 1).fired, false);
});

test('createAlert validates input', () => {
  assert.throws(() => make('above', -1, 'once', 4));
  assert.throws(() => make('bogus', 5, 'once', 4));
  assert.throws(() => make('above', 5, 'bogus', 4));
});
