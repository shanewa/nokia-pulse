(function () {
  const { SYMBOLS, fetchChart, formatPrice } = NP_QUOTE;
  const { createAlert, arm, describeAlert } = NP_ALERTS;
  const store = NP_STORE;

  const $ = (id) => document.getElementById(id);
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const FREQ_LABEL = { once: 'Once', every: 'Repeat' };
  const SERIES_TTL_MS = 5 * 60 * 1000;
  const STALE_MS = 20 * 1000;

  const state = {
    settings: store.DEFAULT_SETTINGS,
    alerts: [],
    history: [],
    quotes: {},
    lastError: null,
    range: '1D',
    editingId: null,
    seriesCache: {},
    chartToken: 0,
  };

  function el(tag, props, ...children) {
    const node = document.createElement(tag);
    Object.entries(props || {}).forEach(([k, v]) => {
      if (k === 'class') node.className = v;
      else if (k === 'text') node.textContent = v;
      else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v);
    });
    children.flat().forEach((c) => c != null && node.append(c));
    return node;
  }

  const symbolInfo = () => SYMBOLS[state.settings.symbol] || SYMBOLS['NOKIA.HE'];
  const currentQuote = () => state.quotes[state.settings.symbol] || null;
  const fmtFor = (symbol) => {
    const q = state.quotes[symbol];
    const currency = (q && q.currency) || (SYMBOLS[symbol] && SYMBOLS[symbol].currency);
    return (v) => formatPrice(v, currency);
  };
  const fmtTime = (ms) => new Date(ms).toLocaleTimeString('en-US', { hour12: false });
  const fmtDateTime = (ms) =>
    new Date(ms).toLocaleString('en-US', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
  const signed = (v, digits) => (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(digits);

  function applyTheme() {
    const t = state.settings.theme;
    const dark = t === 'dark' || (t === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  }

  function renderHeader() {
    const select = $('symbol-select');
    if (!select.options.length) {
      Object.values(SYMBOLS).forEach((s) => select.append(el('option', { value: s.id, text: s.ticker })));
    }
    select.value = state.settings.symbol;
  }

  function renderBanners() {
    const err = $('error-banner');
    err.hidden = !state.lastError;
    if (state.lastError) err.textContent = `Quote update failed (${fmtTime(state.lastError.at)}): ${state.lastError.message}`;
  }

  async function checkNotifyPermission() {
    let level = 'granted';
    try {
      level = await chrome.notifications.getPermissionLevel();
    } catch (e) {
      level = 'granted';
    }
    $('notify-banner').hidden = level === 'granted';
    $('notify-status').textContent = level === 'granted' ? 'Allowed' : 'Off';
  }

  function renderOverview() {
    const info = symbolInfo();
    const q = currentQuote();
    $('exchange-tag').textContent = `${info.exchange} · ${info.currency}`;
    $('company').textContent = `${info.name} · ${info.ticker}`;

    const stateTag = $('market-state');
    stateTag.hidden = !q || q.marketState === 'unknown';
    if (q) {
      stateTag.textContent = q.marketState === 'open' ? 'Open' : 'Closed';
      stateTag.className = 'tag ' + q.marketState;
    }

    const fmt = fmtFor(info.id);
    $('price').textContent = q ? fmt(q.price) : '—';
    const change = $('change');
    if (q && q.change != null) {
      change.textContent = `${signed(q.change, 3)} (${signed(q.changePct, 2)}%)`;
      change.className = 'change ' + (q.change >= 0 ? 'up' : 'down');
    } else {
      change.textContent = q ? '' : 'Loading…';
      change.className = 'change';
    }
    $('updated').textContent = q
      ? `Quote ${q.marketTime ? fmtTime(q.marketTime) : '—'} · Updated ${fmtTime(q.fetchedAt)}`
      : '';

    $('stat-prev').textContent = q && q.previousClose != null ? fmt(q.previousClose) : '—';
    $('stat-high').textContent = q && q.dayHigh != null ? fmt(q.dayHigh) : '—';
    $('stat-low').textContent = q && q.dayLow != null ? fmt(q.dayLow) : '—';

    renderOverviewAlerts();
    renderChart();
  }

  function renderOverviewAlerts() {
    const box = $('overview-alerts');
    box.replaceChildren();
    const mine = state.alerts.filter((a) => a.symbol === state.settings.symbol);
    if (!mine.length) {
      box.append(el('div', { class: 'empty', text: 'No alerts yet. Select + Add to create one.' }));
      return;
    }
    mine.forEach((a) => {
      const fmt = fmtFor(a.symbol);
      box.append(
        el('div', { class: 'alert-item' + (a.enabled ? '' : ' paused') },
          el('div', { class: 'alert-main' },
            el('div', { class: 'alert-title', text: describeAlert(a, fmt) }),
            el('div', { class: 'alert-meta', text: `${FREQ_LABEL[a.frequency]} · ${a.enabled ? 'Active' : 'Paused'}` }),
          ),
        ),
      );
    });
  }

  async function loadSeries() {
    const symbol = state.settings.symbol;
    if (state.range === '1D') {
      const q = currentQuote();
      return { series: q ? q.series : [], base: q ? q.previousClose : null };
    }
    const key = `${symbol}:${state.range}`;
    const hit = state.seriesCache[key];
    if (hit && Date.now() - hit.at < SERIES_TTL_MS) return hit;
    const q = await fetchChart(symbol, state.range);
    const entry = { series: q.series, base: q.series.length ? q.series[0].c : null, at: Date.now() };
    state.seriesCache[key] = entry;
    return entry;
  }

  async function renderChart() {
    const box = $('chart');
    const token = ++state.chartToken;
    let data;
    try {
      data = await loadSeries();
    } catch (e) {
      if (token === state.chartToken) box.replaceChildren(el('div', { class: 'chart-empty', text: 'Unable to load chart' }));
      return;
    }
    if (token !== state.chartToken) return;
    if (!data.series || data.series.length < 2) {
      box.replaceChildren(el('div', { class: 'chart-empty', text: 'No chart data available' }));
      return;
    }
    const targets = state.alerts.filter((a) => a.enabled && a.symbol === state.settings.symbol).map((a) => a.target);
    box.replaceChildren(buildChart(data.series, data.base, targets));
  }

  function buildChart(series, base, targets) {
    const W = 320;
    const H = 92;
    const PAD = 6;
    const closes = series.map((p) => p.c);
    let min = Math.min(...closes);
    let max = Math.max(...closes);
    const span = max - min || max * 0.01 || 1;
    // Include only nearby targets to avoid flattening the price chart.
    const visible = targets.filter((t) => t >= min - span * 0.5 && t <= max + span * 0.5);
    visible.forEach((t) => { min = Math.min(min, t); max = Math.max(max, t); });
    const range = max - min || 1;
    const x = (i) => PAD + (i / (series.length - 1)) * (W - PAD * 2);
    const y = (v) => H - PAD - ((v - min) / range) * (H - PAD * 2);

    const up = base == null || closes[closes.length - 1] >= base;
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.setAttribute('class', up ? 'up' : 'down');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', `${symbolInfo().ticker} price chart, ${state.range}`);

    const mk = (tag, attrs) => {
      const n = document.createElementNS(SVG_NS, tag);
      Object.entries(attrs).forEach(([k, v]) => n.setAttribute(k, v));
      return n;
    };
    visible.forEach((t) => {
      svg.append(mk('line', { x1: 0, x2: W, y1: y(t), y2: y(t), stroke: 'currentColor', 'stroke-opacity': 0.35, 'stroke-dasharray': '4 3', 'stroke-width': 1, 'vector-effect': 'non-scaling-stroke', color: 'var(--accent)' }));
    });
    const points = closes.map((c, i) => `${x(i).toFixed(1)},${y(c).toFixed(1)}`);
    svg.append(mk('polygon', { points: `${x(0)},${H} ${points.join(' ')} ${x(closes.length - 1)},${H}`, fill: 'currentColor', 'fill-opacity': 0.1 }));
    svg.append(mk('polyline', { points: points.join(' '), fill: 'none', stroke: 'currentColor', 'stroke-width': 1.6, 'stroke-linejoin': 'round', 'vector-effect': 'non-scaling-stroke' }));
    return svg;
  }

  function renderAlerts() {
    const info = symbolInfo();
    const count = state.alerts.filter((a) => a.enabled).length;
    const badge = $('alert-count');
    badge.hidden = !count;
    badge.textContent = count;

    if (!state.editingId) {
      $('form-context').textContent = `${info.ticker} · ${info.exchange} · Prices in ${info.currency}`;
      $('target-currency').textContent = `(${info.currency})`;
    }

    const list = $('alert-list');
    list.replaceChildren();
    if (!state.alerts.length) list.append(el('div', { class: 'empty', text: 'No alerts yet' }));
    state.alerts.forEach((a) => {
      const fmt = fmtFor(a.symbol);
      const meta = [
        (SYMBOLS[a.symbol] || {}).ticker || a.symbol,
        FREQ_LABEL[a.frequency],
        a.enabled ? 'Active' : 'Paused',
        a.lastTriggeredAt ? `Last triggered ${fmtDateTime(a.lastTriggeredAt)}` : null,
      ].filter(Boolean).join(' · ');
      list.append(
        el('div', { class: 'alert-item' + (a.enabled ? '' : ' paused') },
          el('div', { class: 'alert-main' },
            el('div', { class: 'alert-title', text: describeAlert(a, fmt) }),
            el('div', { class: 'alert-meta', text: meta }),
          ),
          el('div', { class: 'alert-actions' },
            el('button', { class: 'mini-btn', type: 'button', text: a.enabled ? 'Pause' : 'Enable', 'aria-label': `${a.enabled ? 'Pause' : 'Enable'} ${(SYMBOLS[a.symbol] || {}).ticker || a.symbol} alert: ${describeAlert(a, fmt)}`, onclick: () => toggleAlert(a.id) }),
            el('button', { class: 'mini-btn', type: 'button', text: 'Edit', 'aria-label': `Edit ${(SYMBOLS[a.symbol] || {}).ticker || a.symbol} alert: ${describeAlert(a, fmt)}`, onclick: () => startEdit(a.id) }),
            el('button', { class: 'mini-btn danger', type: 'button', text: 'Delete', 'aria-label': `Delete ${(SYMBOLS[a.symbol] || {}).ticker || a.symbol} alert: ${describeAlert(a, fmt)}`, onclick: () => deleteAlert(a.id) }),
          ),
        ),
      );
    });

    const hist = $('history-list');
    hist.replaceChildren();
    if (!state.history.length) hist.append(el('div', { class: 'empty', text: 'No alert history yet' }));
    state.history.forEach((h) => {
      const fmt = (v) => formatPrice(v, h.currency);
      const desc = describeAlert({ type: h.type, target: h.target }, fmt);
      hist.append(
        el('div', { class: 'history-item' },
          el('span', { text: `${(SYMBOLS[h.symbol] || {}).ticker || h.symbol} ${desc}` }),
          el('span', { class: 'muted', text: `${fmt(h.price)} · ${fmtDateTime(h.at)}` }),
        ),
      );
    });
    renderPreview();
  }

  function readForm() {
    const form = $('alert-form');
    return {
      type: form.elements.type.value,
      target: parseFloat($('target-input').value),
      frequency: $('frequency-select').value,
    };
  }

  function renderPreview() {
    const editing = state.alerts.find((a) => a.id === state.editingId);
    const symbol = editing ? editing.symbol : state.settings.symbol;
    const f = readForm();
    const fmt = fmtFor(symbol);
    const ticker = (SYMBOLS[symbol] || {}).ticker || symbol;
    const box = $('alert-preview');
    if (!Number.isFinite(f.target) || f.target <= 0) {
      box.textContent = 'Enter a target price to preview the alert';
      return;
    }
    let text = `${ticker} ${describeAlert(f, fmt)} · ${FREQ_LABEL[f.frequency]}`;
    const q = state.quotes[symbol];
    if (q && f.type !== 'cross') {
      const met = f.type === 'above' ? q.price >= f.target : q.price <= f.target;
      if (met) text += f.frequency === 'once' ? `\nCurrent price ${fmt(q.price)} meets the condition. Triggers on the next check.` : `\nCurrent price ${fmt(q.price)} meets the condition. Waits for a reset, then triggers when met again.`;
    } else if (q && f.type === 'cross') {
      text += `\nCurrent price ${fmt(q.price)} is ${q.price > f.target ? 'above' : q.price < f.target ? 'below' : 'at'} the target.`;
    }
    box.textContent = text;
    box.style.whiteSpace = 'pre-line';
  }

  function renderSettings() {
    const s = state.settings;
    $('set-refresh').value = String(s.refreshSeconds);
    $('set-theme').value = s.theme;
    $('set-badge').checked = s.badge;
  }

  function renderAll() {
    applyTheme();
    renderHeader();
    renderBanners();
    renderOverview();
    renderAlerts();
    renderSettings();
  }

  async function reload() {
    Object.assign(state, await store.getAll());
    renderAll();
  }

  async function toggleAlert(id) {
    const price = (state.quotes[(state.alerts.find((a) => a.id === id) || {}).symbol] || {}).price;
    await store.updateAlerts((list) =>
      list.map((a) => {
        if (a.id !== id) return a;
        // Reset trigger state on resume to avoid an unintended immediate alert.
        return a.enabled ? Object.assign({}, a, { enabled: false }) : Object.assign(arm(a, price), { enabled: true });
      }),
    );
  }

  async function deleteAlert(id) {
    if (state.editingId === id) resetForm();
    await store.updateAlerts((list) => list.filter((a) => a.id !== id));
  }

  function startEdit(id) {
    const a = state.alerts.find((x) => x.id === id);
    if (!a) return;
    state.editingId = id;
    const form = $('alert-form');
    form.elements.type.value = a.type;
    $('target-input').value = a.target;
    $('frequency-select').value = a.frequency;
    $('form-context').textContent = `${(SYMBOLS[a.symbol] || {}).ticker || a.symbol} · Editing`;
    $('target-currency').textContent = `(${(SYMBOLS[a.symbol] || {}).currency || ''})`;
    form.querySelector('.form-title').textContent = 'Edit price alert';
    form.querySelector('button[type="submit"]').textContent = 'Save changes';
    renderPreview();
    form.scrollIntoView({ block: 'nearest' });
  }

  function resetForm() {
    state.editingId = null;
    const form = $('alert-form');
    form.reset();
    form.querySelector('.form-title').textContent = 'Add price alert';
    form.querySelector('button[type="submit"]').textContent = 'Create alert';
    $('form-error').hidden = true;
    const q = currentQuote();
    $('target-input').placeholder = q ? `e.g. ${(q.price * 1.05).toFixed(2)}` : 'e.g. 5.00';
    renderAlerts();
  }

  async function submitForm(ev) {
    ev.preventDefault();
    const f = readForm();
    const errBox = $('form-error');
    errBox.hidden = true;
    try {
      const editing = state.alerts.find((a) => a.id === state.editingId);
      const symbol = editing ? editing.symbol : state.settings.symbol;
      const price = (state.quotes[symbol] || {}).price;
      if (editing) {
        const next = createAlert({ symbol, type: f.type, target: f.target, frequency: f.frequency }, price, Date.now());
        await store.updateAlerts((list) =>
          list.map((a) =>
            a.id === editing.id
              ? Object.assign({}, next, { id: a.id, createdAt: a.createdAt, lastTriggeredAt: a.lastTriggeredAt, lastTriggeredPrice: a.lastTriggeredPrice, triggerCount: a.triggerCount })
              : a,
          ),
        );
      } else {
        const alert = createAlert({ symbol, type: f.type, target: f.target, frequency: f.frequency }, price, Date.now());
        await store.updateAlerts((list) => list.concat(alert));
      }
      resetForm();
    } catch (e) {
      errBox.textContent = e.message;
      errBox.hidden = false;
    }
  }

  function switchTab(name) {
    document.querySelectorAll('.tab').forEach((t) => {
      t.classList.toggle('active', t.dataset.tab === name);
      t.setAttribute('aria-selected', String(t.dataset.tab === name));
    });
    document.querySelectorAll('.view').forEach((v) => { v.hidden = v.id !== `view-${name}`; });
  }

  async function requestRefresh() {
    const btn = $('refresh-btn');
    btn.classList.add('spin');
    try {
      await chrome.runtime.sendMessage({ type: 'refresh' });
    } catch (e) {
      // Keep cached data if background wake-up fails; the worker records errors.
    } finally {
      btn.classList.remove('spin');
    }
  }

  function bind() {
    document.querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => switchTab(t.dataset.tab)));
    document.querySelectorAll('.range').forEach((b) =>
      b.addEventListener('click', () => {
        state.range = b.dataset.range;
        document.querySelectorAll('.range').forEach((r) => {
          r.classList.toggle('active', r === b);
          r.setAttribute('aria-pressed', String(r === b));
        });
        renderChart();
      }),
    );
    $('symbol-select').addEventListener('change', (e) => store.saveSettings({ symbol: e.target.value }));
    $('refresh-btn').addEventListener('click', requestRefresh);
    $('overview-add').addEventListener('click', () => {
      switchTab('alerts');
      $('target-input').focus();
    });
    $('alert-form').addEventListener('submit', submitForm);
    $('alert-form').addEventListener('input', renderPreview);
    $('clear-history').addEventListener('click', () => store.area.set({ history: [] }));

    $('set-refresh').addEventListener('change', (e) => store.saveSettings({ refreshSeconds: Number(e.target.value) }));
    $('set-theme').addEventListener('change', (e) => store.saveSettings({ theme: e.target.value }));
    $('set-badge').addEventListener('change', (e) => store.saveSettings({ badge: e.target.checked }));
    $('test-notify').addEventListener('click', () => chrome.runtime.sendMessage({ type: 'test-notification', symbol: state.settings.symbol }));

    chrome.storage.onChanged.addListener((_changes, areaName) => {
      if (areaName === 'local') reload();
    });
  }

  async function init() {
    bind();
    await reload();
    resetForm();
    checkNotifyPermission();
    const q = currentQuote();
    if (!q || Date.now() - q.fetchedAt > STALE_MS) requestRefresh();
  }

  init();
})();
