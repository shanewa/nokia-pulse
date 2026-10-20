# NokiaPulse

Monitor Nokia stock prices and get notified when your target price is reached.

Stay in sync with Nokia's stock price.

A lightweight Microsoft Edge (Manifest V3) extension focused on Nokia, with quick price checks and configurable alerts without repeated notifications. No backend server is required; all settings are stored locally.

## Symbols

- `NOKIA.HE`: Nasdaq Helsinki, EUR (default)
- `NOK`: NYSE ADR, USD

The interface displays the exchange and currency. Alert targets use the currency of their associated symbol.

## Alert rules

- Above / below: triggers when the price reaches or exceeds the threshold in the selected direction. Once-only alerts pause after firing. Repeating alerts rearm only after the price returns to the other side.
- Cross: triggers when the price moves from one side of the target to the other. Equality alone does not count as a crossing.
- If a new repeating alert already meets its condition, it waits for the price to return and cross again. A once-only alert fires on the next price check; the form previews this behavior.

## Data source

Quotes use the unofficial Yahoo Finance chart endpoint (`query1.finance.yahoo.com/v8/finance/chart`). Helsinki quotes may be delayed by approximately 15 minutes. The background worker polls using `chrome.alarms` at a configurable interval from 30 seconds to 15 minutes. Prices are not checked while the browser is closed. API availability and data licensing are not guaranteed.

## Development

```
npm ci                               # Install development dependencies
node scripts/generate-icons.mjs        # Generate icons
node --test "tests/*.test.mjs"          # Run tests
node scripts/pack-extension.mjs        # Package dist/NokiaPulse-<version>.zip
node scripts/install-git-hooks.mjs     # Install repository hooks
```

With Make available, use `make test`, `make pack`, `make check`, or `make hooks`. To test locally, open `edge://extensions`, enable developer mode, and load the unpacked `extension/` directory.

All project content must be written in English. Hooks run tests, package validation, and staged-file line-ending checks before commits. Commit messages must not include `Co-authored-by`. Installation sets the repository-local author to Shane Wang <shanewa@qq.com>. Hooks never commit or push automatically.

## Structure

```
extension/
  manifest.json
  background.js     # Scheduling, quotes, alerts, notifications, and badge
  lib/quote.js      # Quote parsing and formatting
  lib/alerts.js     # Pure alert state machine
  lib/store.js      # Local storage helpers
  popup/            # Overview, alerts, and settings
  icons/
```

## Documentation

- [Documentation index](docs/README.md)
- [Architecture and implementation limits](docs/architecture.md)
- [Privacy policy](docs/PRIVACY.md)
- [Edge Add-ons listing draft](docs/store-listing.md)
- [Release and store review checklist](docs/store-review.md)
