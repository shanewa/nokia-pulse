# Microsoft Edge Add-ons listing

Draft for version 0.1.0. Confirm provider usage rights and complete all publishing details before submission. Do not copy another extension's publisher identity, account configuration, store ID, or signing key.

## Listing fields

**Name:** NokiaPulse

**Short description:** Monitor Nokia stock prices and get notified when your target price is reached.

**Tagline:** Stay in sync with Nokia's stock price.

**Language:** English

**Suggested category:** Productivity; confirm the available category in Partner Center.

## Detailed description

NokiaPulse puts Nokia stock quotes and configurable price reminders in your Microsoft Edge toolbar.

Choose between Nokia Oyj on Nasdaq Helsinki (NOKIA, EUR; the default listing) and Nokia ADR on the NYSE (NOK, USD). The exchange and currency are displayed so you can keep the two listings distinct.

Features:

- View the latest available quote, daily change, previous close, daily high/low, and update times.
- Explore compact 1D, 1W, and 1M charts.
- Create above, below, or either-direction crossing reminders.
- Choose once-only reminders or repeating reminders that rearm after the price returns to the other side.
- Edit, pause, resume, or delete reminders and review recent trigger history.
- Choose a refresh interval from 30 seconds to 15 minutes.
- Use light, dark, or system theme and an optional toolbar price badge.
- Keep settings and reminders in your local browser profile, without signing in.

Important limitations:

Quotes come from an unofficial Yahoo Finance endpoint and may be delayed or unavailable. A refresh interval is not a guarantee of quote freshness. This is a polling tool, not a real-time trading service. Short-lived price movements between checks can be missed.

Monitoring requires browser execution and an internet connection. Closing the browser, device sleep, browser scheduling, or disabled notifications can prevent timely alerts. System settings affect notification display, and delivery is not guaranteed.

No investment advice is provided. NokiaPulse is not affiliated with or endorsed by Nokia or Yahoo. Only the two listed Nokia symbols are supported; this is not a general stock watchlist.

## Single purpose

Monitor the two supported Nokia listings and notify users when sampled prices meet their configured alert conditions.

## Permission justifications

| Permission | Reviewer explanation |
| --- | --- |
| storage | Keep preferences, reminder targets and trigger state, cached quotes, and up to 50 trigger records in local extension storage |
| alarms | Schedule periodic quote checks without requiring the popup to stay open |
| notifications | Display price reminder notifications and user-requested test notifications |
| Yahoo host access | Request quotes and chart series directly from the configured market-data endpoint |

There are no content scripts, browsing-history access, broad website permissions, remote scripts, analytics SDKs, or application backend. Runtime code and assets are packaged locally. The extension sends requests to Yahoo; do not describe it as making no external connections.

## Instructions for reviewers

1. Install the submitted package and pin NokiaPulse to the toolbar. No login, payment, API key, or subscription is needed.
2. Open the popup. Confirm the default listing is NOKIA on Nasdaq Helsinki with EUR pricing.
3. Switch to NOK and confirm NYSE and USD are displayed.
4. Open Settings and send a test notification. Allow notifications in Edge and the operating system as needed.
5. Open Alerts, select Above, enter a positive target below the current quote, and choose Once. Save, then refresh the quote. A successful response meeting the condition should record a trigger and pause the reminder.
6. Edit, resume, pause, and delete a reminder. Clear trigger history.
7. Try the chart ranges, refresh interval, themes, and toolbar badge option.

The test uses live third-party data. A network failure, blocked API, provider rate limit, stale quote, or disabled OS notification can affect the result. Once-only reminders trigger on the next successful check, not necessarily at creation time.

## Publishing details still required

- Confirm publisher ownership and access to the correct Microsoft Partner Center account.
- Create or confirm the NokiaPulse store entry and its public URL.
- Provide a verified support URL or contact and the actual source/project URL if publishing one.
- Host [the privacy policy](PRIVACY.md) at a public, login-free HTTPS address and verify it from outside the publisher account.
- Review market-data terms, redistribution permissions, branding, and store financial-content requirements.
- Check current field limits and image specifications in Partner Center.
- Capture genuine English screenshots of the current popup. Identify example or delayed data; do not fabricate live quotes.
- Prepare listing artwork from the current master icon. Do not assume every store image slot uses the extension's icon dimensions.
- Complete store data-use declarations from the implementation and policy, including third-party quote requests.

No publisher contact, store URL, policy hosting location, or data license has been verified by this document.