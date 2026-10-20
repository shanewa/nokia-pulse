# NokiaPulse Privacy Policy

Effective date: October 20, 2026.

This policy describes NokiaPulse version 0.1.0, a Microsoft Edge extension for Nokia stock quotes and local price reminders.

## Local data

NokiaPulse stores the following in your browser profile using extension-local storage:

- Selected listing, refresh interval, theme, and toolbar badge preference.
- Reminder targets, conditions, frequency, enabled status, and trigger state.
- Up to 50 recent reminder trigger records.
- Cached quotes, day-chart points, provider timestamps, and recent refresh errors.

The extension does not upload these settings, reminder targets, or trigger history to an application backend. It does not provide accounts or cross-device synchronization. Local storage is not a separate encrypted vault; access depends on your device and browser-profile security.

## Requests to Yahoo Finance

NokiaPulse requires internet access to retrieve quotes and charts directly from `query1.finance.yahoo.com` over HTTPS. Requests identify the supported stock symbol and chart range/interval. The provider also receives ordinary network request information, such as your IP address and browser/network metadata.

These requests allow Yahoo or its infrastructure providers to process data under their own policies. The extension is not fully offline and cannot prevent third-party server logging. Consult [Yahoo's privacy information](https://legal.yahoo.com/us/en/yahoo/privacy/index.html) for details. NokiaPulse is not affiliated with or endorsed by Yahoo or Nokia.

## Notifications

When a reminder triggers, NokiaPulse asks the browser to display a desktop notification containing the stock, price condition, target, current price, and exchange. These details may be visible to anyone who can see your screen or system notification center. Notification retention and lock-screen visibility depend on your operating system and browser settings. A test notification is available in the extension settings.

## Permissions

| Permission | Purpose |
| --- | --- |
| storage | Save local settings, reminder state, cached quotes, and history |
| alarms | Schedule price checks while browser execution is available |
| notifications | Show reminder and test notifications |
| https://query1.finance.yahoo.com/* | Retrieve quotes and charts from the provider |

NokiaPulse has no content scripts and does not request access to all websites, browsing history, tabs, or cookies. It does not read webpage contents.

## Analytics, advertising, and accounts

The current extension contains no analytics SDK, advertising integration, payment system, or user account registration. It does not operate an application server to collect user information. External market-data requests described above still occur.

## Managing and deleting data

You can delete individual reminders and clear trigger history in the Alerts view. You can change settings in the Settings view. These actions do not clear all cached quotes or error records.

To remove all extension-local data, uninstall NokiaPulse from `edge://extensions`. Browser-managed backups and previously displayed system notifications are outside the extension's control. Clear notifications separately through your operating system if needed.

## Changes and contact

This policy must be reviewed when permissions, data handling, or providers change. The effective date identifies the current policy revision.

Before public distribution, the publisher must provide a working support/privacy contact on the extension's store page and publish this policy at a public HTTPS URL. Until those details are configured, this repository policy is a pre-release policy, not a completed store submission.