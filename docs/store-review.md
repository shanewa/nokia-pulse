# Release and store review

Baseline: 0.1.0. Checklist created: 2026-10-20.

Unchecked items require verification for the actual release candidate. The presence of code or tests is not evidence of a completed manual test or store approval.

## Automated release checks

- [ ] Install development dependencies using `npm ci`.
- [ ] Run `npm test` and review the complete result.
- [ ] Run `node scripts/pack-extension.mjs --check-only`.
- [ ] Run `npm run pack` and inspect the resulting ZIP.
- [ ] Confirm the manifest is at the ZIP root without an enclosing extension directory.
- [ ] Confirm packaged resources exist and no secrets, development dependencies, or unrelated files are included.
- [ ] Confirm all project text is English and no remote executable code was introduced.
- [ ] Confirm manifest and development-package versions agree for the release.
- [ ] If artwork changed, run `npm run icons`; verify 16, 32, 48, and 128px outputs against the 512px master.
- [ ] Inspect the packaged extension rather than relying only on the source tree.

The current unit suite covers reminder transitions, quote parsing/market-state inference, and Git hook checks. It does not cover background alarms, notification delivery, popup end-to-end interactions, or storage races.

## Manual Edge validation

### Install and quotes

- [ ] Load the unpacked extension in Edge with no console errors.
- [ ] Verify a clean install defaults to NOKIA / Nasdaq Helsinki / EUR.
- [ ] Switch to NOK and verify NYSE / USD without currency conversion.
- [ ] Verify price, change, previous close, high/low, provider time, and fetch time against the response.
- [ ] Check 1D, 1W, and 1M charts, including empty and failed chart responses.
- [ ] Confirm market-state wording does not imply a guaranteed live exchange-status feed.
- [ ] Inspect toolbar icon readability with the price badge enabled and disabled.

### Reminders

- [ ] Verify above and below conditions, including equality at the target.
- [ ] Verify once-only reminders pause after one trigger.
- [ ] Verify a once-only reminder already meeting its condition fires on the next successful check.
- [ ] Verify repeating reminders do not fire on every refresh while the condition stays true.
- [ ] Verify repeating reminders rearm after returning to the other side.
- [ ] Verify cross reminders in both directions and equality behavior.
- [ ] Verify creating a cross reminder without a cached price establishes a baseline first.
- [ ] Verify edit, pause, resume, and delete operations survive popup close and browser restart.
- [ ] Verify reminders for both listings continue when the selected display listing changes.
- [ ] Verify trigger history, its 50-entry limit, and clear-history behavior.

### Notifications and lifecycle

- [ ] Test desktop notifications on the target Windows/Edge configuration.
- [ ] Test blocked browser notifications and OS quiet/focus settings.
- [ ] Verify notification content, once-only pause wording, and click-to-clear behavior.
- [ ] Verify refresh intervals and alarm existence after restart.
- [ ] Verify device sleep/resume and document that browser shutdown stops checks.
- [ ] Test installation/update with existing local settings and reminders.
- [ ] Test switching listings during an in-flight refresh and editing reminders during background updates.

### Failure cases

- [ ] Test offline, timeout, rate-limit, invalid response, and missing quote fields.
- [ ] Verify failed requests retain cached quotes and show an error rather than fabricated data.
- [ ] Test successful responses containing old timestamps; document the current stale-data limitation.
- [ ] Verify requests expose neither reminder targets nor trigger history in URLs or payloads.
- [ ] Confirm no content scripts or unexpected website access have been introduced.

## Known release risks

See [architecture](architecture.md) for full details. In particular, stale successful quotes can trigger reminders; notification creation is not confirmed before recording a trigger; local read-modify-write operations can race; alarms are not repaired on every worker activation. Resolve these issues or explicitly accept and disclose the relevant limitations before release. Do not claim guaranteed alerts, guaranteed real-time data, or production readiness based solely on unit tests.

## Store submission

- [ ] Confirm the intended publisher account and store entry.
- [ ] Review the current data-provider terms and obtain any required permissions.
- [ ] Publish the privacy policy at a public HTTPS URL and configure a working support channel.
- [ ] Reconcile [store copy](store-listing.md), [privacy policy](PRIVACY.md), permissions, and actual network behavior.
- [ ] Capture current English screenshots without exposing personal notification or account details.
- [ ] Submit the validated ZIP and include reviewer instructions; no application account is required.
- [ ] Record the submitted version, artifact hash, review date, and eventual public listing URL.

## Review record

| Field | Status |
| --- | --- |
| Target version | 0.1.0 |
| Manual Edge test | Pending |
| Provider licensing review | Pending |
| Public privacy URL and support contact | Pending |
| Store account / submission / approval | Not verified |
| Submitted artifact hash | Not recorded |