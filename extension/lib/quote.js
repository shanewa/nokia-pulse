(function (root) {
  const SYMBOLS = {
    'NOKIA.HE': { id: 'NOKIA.HE', ticker: 'NOKIA', name: 'Nokia Oyj', exchange: 'Nasdaq Helsinki', currency: 'EUR' },
    NOK: { id: 'NOK', ticker: 'NOK', name: 'Nokia ADR', exchange: 'NYSE', currency: 'USD' },
  };
  const DEFAULT_SYMBOL = 'NOKIA.HE';

  const RANGES = {
    '1D': { range: '1d', interval: '5m' },
    '1W': { range: '5d', interval: '30m' },
    '1M': { range: '1mo', interval: '1d' },
  };

  const BASE_URL = 'https://query1.finance.yahoo.com/v8/finance/chart/';
  const FETCH_TIMEOUT_MS = 10000;
  // Helsinki quotes may be delayed; stale quotes are treated as market closed.
  const STALE_SECONDS = 30 * 60;

  function marketState(meta, nowSec) {
    const regular = meta.currentTradingPeriod && meta.currentTradingPeriod.regular;
    if (!regular || !regular.start || !regular.end) return 'unknown';
    const inSession = nowSec >= regular.start && nowSec < regular.end;
    const fresh = !meta.regularMarketTime || nowSec - meta.regularMarketTime < STALE_SECONDS;
    return inSession && fresh ? 'open' : 'closed';
  }

  function parseChart(json, symbol, nowMs) {
    const result = json && json.chart && json.chart.result && json.chart.result[0];
    if (!result) {
      const desc = json && json.chart && json.chart.error && json.chart.error.description;
      throw new Error(desc || 'No quote data available');
    }
    const meta = result.meta || {};
    const price = Number(meta.regularMarketPrice);
    if (!Number.isFinite(price)) throw new Error('Quote data is missing a valid price');

    const prevRaw = meta.chartPreviousClose != null ? meta.chartPreviousClose : meta.previousClose;
    const previousClose = Number.isFinite(Number(prevRaw)) && prevRaw != null ? Number(prevRaw) : null;
    const change = previousClose != null ? price - previousClose : null;
    const changePct = previousClose ? (change / previousClose) * 100 : null;

    const stamps = result.timestamp || [];
    const closes = (result.indicators && result.indicators.quote && result.indicators.quote[0] && result.indicators.quote[0].close) || [];
    const series = [];
    for (let i = 0; i < stamps.length; i++) {
      if (closes[i] != null && Number.isFinite(closes[i])) series.push({ t: stamps[i], c: closes[i] });
    }

    const info = SYMBOLS[symbol] || {};
    return {
      symbol,
      price,
      previousClose,
      change,
      changePct,
      currency: meta.currency || info.currency || '',
      exchange: info.exchange || meta.fullExchangeName || meta.exchangeName || '',
      dayHigh: Number.isFinite(meta.regularMarketDayHigh) ? meta.regularMarketDayHigh : null,
      dayLow: Number.isFinite(meta.regularMarketDayLow) ? meta.regularMarketDayLow : null,
      marketTime: meta.regularMarketTime ? meta.regularMarketTime * 1000 : null,
      marketState: marketState(meta, Math.floor(nowMs / 1000)),
      fetchedAt: nowMs,
      series,
    };
  }

  async function fetchChart(symbol, rangeKey, fetchImpl) {
    const cfg = RANGES[rangeKey];
    if (!cfg) throw new Error('Unknown time range: ' + rangeKey);
    const doFetch = fetchImpl || root.fetch.bind(root);
    const url = `${BASE_URL}${encodeURIComponent(symbol)}?range=${cfg.range}&interval=${cfg.interval}&includePrePost=false`;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    try {
      const res = await doFetch(url, { cache: 'no-store', signal: ctrl.signal });
      if (!res.ok) throw new Error('Quote API returned HTTP ' + res.status);
      return parseChart(await res.json(), symbol, Date.now());
    } catch (err) {
      if (err && err.name === 'AbortError') throw new Error('Quote request timed out');
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  function fetchQuote(symbol, fetchImpl) {
    return fetchChart(symbol, '1D', fetchImpl);
  }

  function formatPrice(value, currency) {
    if (!Number.isFinite(value)) return '—';
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency || 'EUR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 3,
      }).format(value);
    } catch (e) {
      return value.toFixed(2);
    }
  }

  const api = { SYMBOLS, DEFAULT_SYMBOL, RANGES, parseChart, fetchChart, fetchQuote, formatPrice, marketState };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.NP_QUOTE = api;
})(typeof self !== 'undefined' ? self : globalThis);
