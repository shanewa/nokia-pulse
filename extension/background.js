importScripts('lib/quote.js', 'lib/alerts.js', 'lib/store.js');

const { SYMBOLS, fetchQuote, formatPrice } = NP_QUOTE;
const { evaluateAlert, describeAlert } = NP_ALERTS;
const { getAll, updateAlerts, appendHistory, area } = NP_STORE;

const ALARM_NAME = 'np-refresh';
const UP_COLOR = '#1a9d5c';
const DOWN_COLOR = '#d93a3a';

async function scheduleAlarm() {
  const { settings } = await getAll();
  const periodInMinutes = Math.max(0.5, settings.refreshSeconds / 60);
  const existing = await chrome.alarms.get(ALARM_NAME);
  if (!existing || existing.periodInMinutes !== periodInMinutes) {
    await chrome.alarms.create(ALARM_NAME, { periodInMinutes, delayInMinutes: periodInMinutes });
  }
}

function updateBadge(settings, quotes) {
  const quote = quotes[settings.symbol];
  if (!settings.badge || !quote) {
    chrome.action.setBadgeText({ text: '' });
    return;
  }
  chrome.action.setBadgeText({ text: quote.price.toFixed(quote.price >= 100 ? 0 : 2).slice(0, 4) });
  chrome.action.setBadgeBackgroundColor({ color: quote.change != null && quote.change < 0 ? DOWN_COLOR : UP_COLOR });
  if (chrome.action.setBadgeTextColor) chrome.action.setBadgeTextColor({ color: '#ffffff' });
}

function notify(title, message, id) {
  chrome.notifications.create(id, {
    type: 'basic',
    iconUrl: chrome.runtime.getURL('icons/icon128.png'),
    title,
    message,
    priority: 2,
    requireInteraction: true,
  });
}

function alertMessage(alert, quote) {
  const info = SYMBOLS[alert.symbol] || {};
  const fmt = (v) => formatPrice(v, quote.currency);
  const lead = `${describeAlert(alert, fmt)}; current price ${fmt(quote.price)}`;
  return `${lead}\n${info.ticker || alert.symbol} · ${quote.exchange}${alert.frequency === 'once' ? ' · Paused' : ''}`;
}

async function runRefresh() {
  const { settings, alerts } = await getAll();
  const symbols = new Set([settings.symbol]);
  alerts.filter((a) => a.enabled).forEach((a) => symbols.add(a.symbol));

  const ids = [...symbols].filter((s) => SYMBOLS[s]);
  const results = await Promise.allSettled(ids.map((s) => fetchQuote(s)));

  const stored = (await area.get('quotes')).quotes || {};
  const fresh = {};
  const errors = [];
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') fresh[ids[i]] = r.value;
    else errors.push(`${ids[i]}: ${r.reason && r.reason.message ? r.reason.message : r.reason}`);
  });
  const quotes = Object.assign({}, stored, fresh);

  await area.set({
    quotes,
    lastError: errors.length ? { message: errors.join('; '), at: Date.now() } : null,
  });

  const now = Date.now();
  const fired = [];
  await updateAlerts((list) =>
    list.map((a) => {
      const q = fresh[a.symbol];
      if (!q) return a;
      const r = evaluateAlert(a, q.price, now);
      if (r.fired) fired.push({ alert: r.alert, quote: q });
      return r.alert;
    }),
  );

  for (const { alert, quote } of fired) {
    const info = SYMBOLS[alert.symbol] || {};
    notify(`NokiaPulse · ${info.ticker || alert.symbol}`, alertMessage(alert, quote), `np-${alert.id}-${now}`);
  }
  await appendHistory(
    fired.map(({ alert, quote }) => ({
      alertId: alert.id,
      symbol: alert.symbol,
      type: alert.type,
      target: alert.target,
      price: quote.price,
      currency: quote.currency,
      at: now,
    })),
  );

  updateBadge(settings, quotes);
  return { ok: errors.length === 0, errors };
}

let inflight = null;
function refresh() {
  if (!inflight) inflight = runRefresh().finally(() => { inflight = null; });
  return inflight;
}

chrome.runtime.onInstalled.addListener(() => {
  scheduleAlarm().then(refresh);
});

chrome.runtime.onStartup.addListener(() => {
  scheduleAlarm().then(refresh);
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) refresh();
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'local' || !changes.settings) return;
  const before = changes.settings.oldValue || {};
  const after = changes.settings.newValue || {};
  scheduleAlarm();
  if (before.symbol !== after.symbol) refresh();
  else getAll().then(({ settings, quotes }) => updateBadge(settings, quotes));
});

chrome.notifications.onClicked.addListener((id) => chrome.notifications.clear(id));

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (!msg) return false;
  if (msg.type === 'refresh') {
    refresh().then(sendResponse, (e) => sendResponse({ ok: false, errors: [String(e.message || e)] }));
    return true;
  }
  if (msg.type === 'test-notification') {
    const info = SYMBOLS[msg.symbol] || {};
    notify('NokiaPulse · Test notification', `Notifications are working.${info.ticker ? ` Tracking ${info.ticker} (${info.exchange}).` : ''}`, `np-test-${Date.now()}`);
    sendResponse({ ok: true });
  }
  return false;
});
