# Architecture

Implementation baseline: 0.1.0. Last reviewed: 2026-10-20.

## Scope

NokiaPulse is a Manifest V3 Edge extension with no application backend, account system, or cloud synchronization. It supports two fixed listings:

| Symbol | Listing | Currency |
| --- | --- | --- |
| NOKIA.HE | Nokia Oyj, Nasdaq Helsinki; default | EUR |
| NOK | Nokia ADR, NYSE | USD |

Changing the selected listing does not convert prices or reminder targets. Enabled reminders on either supported listing remain monitored.

## Components

| Component | Responsibility |
| --- | --- |
| [Manifest](../extension/manifest.json) | Worker, popup, icons, and permissions |
| [Background worker](../extension/background.js) | Alarm scheduling, quotes, reminder evaluation, notifications, and toolbar badge |
| [Quote module](../extension/lib/quote.js) | Yahoo chart requests, parsing, currency formatting, and inferred market state |
| [Alert module](../extension/lib/alerts.js) | Pure functions for validation, arming, and reminder state transitions |
| [Storage module](../extension/lib/store.js) | Local configuration, quotes, reminder state, and bounded history |
| [Popup](../extension/popup/popup.js) | Overview, charts, reminder management, settings, and notification test |
| [Packaging script](../scripts/pack-extension.mjs) | Allowlisted ZIP with the manifest at its root |

## Refresh flow

1. Installation or browser startup ensures a periodic alarm and requests a refresh. Settings changes also check the alarm.
2. A refresh queries the selected listing and any other listing with enabled reminders.
3. Requests go directly to the unofficial Yahoo Finance chart endpoint over HTTPS, with a 10-second timeout.
4. Successful responses replace the associated cached quotes. Failed requests retain previous quotes and record an error.
5. Reminders are evaluated only for listings whose request succeeded in that refresh.
6. Updated reminder state is saved; notifications are requested and trigger history is appended.
7. The toolbar badge is updated from the selected listing's cached quote.

The worker coalesces concurrent refresh requests into one in-flight operation. It is not a continuously running process. Browser alarms can be delayed by sleep, browser lifecycle, or resource management.

## Quotes and charts

The provider endpoint is `https://query1.finance.yahoo.com/v8/finance/chart/{symbol}`. Requests do not include local reminder targets or history.

| View | Provider range | Interval |
| --- | --- | --- |
| 1D / background quote | 1d | 5m |
| 1W | 5d | 30m |
| 1M | 1mo | 1d |

The popup uses the stored day series. Week and month series are fetched on demand and cached in popup memory for five minutes. These chart requests do not drive background reminder evaluation.

Market state is inferred from the provider's regular-session bounds and quote timestamp. A quote more than 30 minutes old may be shown as closed. This is not an authoritative exchange-status feed. Helsinki quotes may be delayed; no fixed delay or real-time delivery is guaranteed.

## Reminder semantics

| Condition | Behavior |
| --- | --- |
| Above | Current sampled price is greater than or equal to the target |
| Below | Current sampled price is less than or equal to the target |
| Cross | Consecutive non-equal sampled prices lie on opposite sides of the target |

Once-only reminders pause after firing. Above/below once-only reminders already meeting their condition fire on the next successful check, including after re-enabling.

Repeating above/below reminders disarm after firing and rearm when the condition becomes false. If created or re-enabled while already meeting the condition, they wait for a return to the other side. Cross reminders retain the last non-equal side; equality alone does not trigger a crossing. Without a known starting price, a cross reminder first establishes its baseline.

Editing reinitializes the condition and enables the reminder while preserving its previous trigger statistics. Rules operate on sampled quotes, so a crossing that occurs and reverses between checks can be missed.

## Local storage

All persistent application data uses `chrome.storage.local`:

| Key | Contents |
| --- | --- |
| settings | Selected symbol, interval, theme, and badge preference |
| alerts | Conditions, targets, frequency, enablement, arming state, and trigger statistics |
| history | Latest 50 trigger records, including target, sampled price, currency, and time |
| quotes | Last successful quotes and day series by symbol |
| lastError | Latest refresh error and timestamp |

Default settings are NOKIA.HE, a 60-second refresh, system theme, and price badge enabled. Supported intervals are 30, 60, 300, and 900 seconds. There is no device synchronization or dedicated export/reset-all feature.

## Notifications and permissions

Desktop notifications include the listing, condition, target, price, and exchange. A once-only notification also indicates that the reminder has paused. Clicking a notification clears it. The popup exposes a notification-permission check and a test notification.

Only `storage`, `alarms`, `notifications`, and the Yahoo host permission are requested. There are no content scripts or page injections. Sharp is a development-only image resizing dependency; it is not packaged in the extension.

## Known limitations

- The data API is unofficial; reliability, permitted redistribution, and data latency require independent review before publication.
- Browser shutdown, sleep, network failures, and provider limits can prevent timely checks. Background execution depends on Edge configuration.
- A successful response may contain an old quote. The worker does not require a newer market timestamp or an open session before evaluating reminders.
- Cached prices and badges remain visible after request failure and do not automatically expire.
- Notification creation is not awaited. A reminder can be recorded as triggered even if the OS or browser does not display it.
- Storage helpers use read-modify-write operations without transactions. Popup edits and worker updates can overwrite concurrent changes.
- A refresh uses a settings snapshot. Switching symbols during a refresh may leave the old badge temporarily displayed and does not guarantee an immediate follow-up request.
- Alarms are checked on installation, startup, and settings changes, not on every worker activation.

## Verification boundary

Current automated tests cover reminder transitions, quote parsing, market-state inference, and Git hooks. They do not establish desktop notification delivery, alarm reliability, concurrent storage correctness, or end-to-end behavior in Edge. See the [release review](store-review.md) for manual checks.