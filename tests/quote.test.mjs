import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { parseChart, marketState } = require('../extension/lib/quote.js');

const NOW = 1_700_000_000_000;
const nowSec = NOW / 1000;

const sample = (metaOverrides = {}) => ({
  chart: {
    result: [{
      meta: {
        currency: 'EUR',
        regularMarketPrice: 5.1,
        chartPreviousClose: 5.0,
        regularMarketTime: nowSec - 60,
        regularMarketDayHigh: 5.2,
        regularMarketDayLow: 4.95,
        currentTradingPeriod: { regular: { start: nowSec - 3600, end: nowSec + 3600 } },
        ...metaOverrides,
      },
      timestamp: [1, 2, 3],
      indicators: { quote: [{ close: [5.0, null, 5.1] }] },
    }],
    error: null,
  },
});

test('parseChart parses prices, changes, and series', () => {
  const q = parseChart(sample(), 'NOKIA.HE', NOW);
  assert.equal(q.price, 5.1);
  assert.equal(q.currency, 'EUR');
  assert.equal(q.exchange, 'Nasdaq Helsinki');
  assert.ok(Math.abs(q.change - 0.1) < 1e-9);
  assert.ok(Math.abs(q.changePct - 2) < 1e-9);
  assert.equal(q.series.length, 2);
  assert.equal(q.marketState, 'open');
});

test('parseChart throws when the price or result is missing', () => {
  assert.throws(() => parseChart({ chart: { result: null, error: { description: 'Not Found' } } }, 'X', NOW), /Not Found/);
  assert.throws(() => parseChart(sample({ regularMarketPrice: undefined }), 'X', NOW));
});

test('marketState treats out-of-session or stale data as closed', () => {
  const regular = { start: nowSec - 3600, end: nowSec + 3600 };
  assert.equal(marketState({ currentTradingPeriod: { regular }, regularMarketTime: nowSec - 10 }, nowSec), 'open');
  assert.equal(marketState({ currentTradingPeriod: { regular }, regularMarketTime: nowSec - 7200 }, nowSec), 'closed');
  assert.equal(marketState({ currentTradingPeriod: { regular: { start: nowSec + 10, end: nowSec + 20 } } }, nowSec), 'closed');
  assert.equal(marketState({}, nowSec), 'unknown');
});
