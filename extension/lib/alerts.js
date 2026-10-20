(function (root) {
  const TYPES = ['above', 'below', 'cross'];
  const FREQUENCIES = ['once', 'every'];

  function sideOf(price, target) {
    if (price > target) return 'above';
    if (price < target) return 'below';
    return null;
  }

  function levelMet(type, price, target) {
    return type === 'above' ? price >= target : price <= target;
  }

  // Initialize trigger state when creating, resuming, or updating an alert.
  function arm(alert, price) {
    const next = Object.assign({}, alert);
    const known = Number.isFinite(price);
    next.lastSide = known ? sideOf(price, alert.target) : null;
    next.armed = alert.type === 'cross' || !known ? true : !levelMet(alert.type, price, alert.target);
    return next;
  }

  function createAlert(input, price, now) {
    if (!TYPES.includes(input.type)) throw new Error('Invalid alert condition');
    if (!FREQUENCIES.includes(input.frequency)) throw new Error('Invalid alert frequency');
    const target = Number(input.target);
    if (!Number.isFinite(target) || target <= 0) throw new Error('Target price must be positive');
    const id = now.toString(36) + Math.random().toString(36).slice(2, 7);
    return arm({
      id,
      symbol: input.symbol,
      type: input.type,
      target,
      frequency: input.frequency,
      enabled: true,
      createdAt: now,
      lastTriggeredAt: null,
      lastTriggeredPrice: null,
      triggerCount: 0,
    }, price);
  }

  // Return { alert, fired }; above/below check levels, cross detects either direction.
  function evaluateAlert(alert, price, now) {
    if (!alert.enabled || !Number.isFinite(price)) return { alert, fired: false };

    const next = Object.assign({}, alert);
    let fired = false;

    if (alert.type === 'cross') {
      const side = sideOf(price, alert.target);
      if (side) {
        if (alert.lastSide && side !== alert.lastSide) fired = true;
        next.lastSide = side;
      }
    } else {
      const met = levelMet(alert.type, price, alert.target);
      if (alert.frequency === 'once') {
        fired = met;
      } else if (met && alert.armed) {
        fired = true;
        next.armed = false;
      } else if (!met) {
        next.armed = true;
      }
    }

    if (fired) {
      next.lastTriggeredAt = now;
      next.lastTriggeredPrice = price;
      next.triggerCount = (alert.triggerCount || 0) + 1;
      if (alert.frequency === 'once') next.enabled = false;
    }
    return { alert: next, fired };
  }

  function describeAlert(alert, formatTarget) {
    const t = formatTarget(alert.target);
    if (alert.type === 'above') return `Price at or above ${t}`;
    if (alert.type === 'below') return `Price at or below ${t}`;
    return `Price crosses ${t}`;
  }

  const api = { TYPES, FREQUENCIES, createAlert, evaluateAlert, arm, describeAlert };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.NP_ALERTS = api;
})(typeof self !== 'undefined' ? self : globalThis);
