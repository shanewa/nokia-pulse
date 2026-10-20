(function (root) {
  const DEFAULT_SETTINGS = {
    symbol: 'NOKIA.HE',
    refreshSeconds: 60,
    theme: 'auto',
    badge: true,
  };
  const REFRESH_OPTIONS = [30, 60, 300, 900];
  const HISTORY_LIMIT = 50;

  const area = root.chrome.storage.local;

  async function getAll() {
    const d = await area.get(['settings', 'alerts', 'history', 'quotes', 'lastError']);
    return {
      settings: Object.assign({}, DEFAULT_SETTINGS, d.settings),
      alerts: d.alerts || [],
      history: d.history || [],
      quotes: d.quotes || {},
      lastError: d.lastError || null,
    };
  }

  async function saveSettings(patch) {
    const { settings } = await getAll();
    await area.set({ settings: Object.assign({}, settings, patch) });
  }

  // Keep read-modify-write together to reduce races with background refreshes.
  async function updateAlerts(fn) {
    const { alerts = [] } = await area.get('alerts');
    const next = fn(alerts);
    await area.set({ alerts: next });
    return next;
  }

  async function appendHistory(entries) {
    if (!entries.length) return;
    const { history = [] } = await area.get('history');
    await area.set({ history: entries.concat(history).slice(0, HISTORY_LIMIT) });
  }

  const api = { DEFAULT_SETTINGS, REFRESH_OPTIONS, getAll, saveSettings, updateAlerts, appendHistory, area };
  root.NP_STORE = api;
})(typeof self !== 'undefined' ? self : globalThis);
