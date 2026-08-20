# DubemPay — Automated Test Suite

This is a [Playwright](https://playwright.dev) test suite for the DubemPay
front-end demo. It drives a real Chromium browser against the actual
`index.html`/`styles.css`/`core.js`/`dashboard.js`/`features.js`/`ui.js`
files — no mocking, no simulated DOM. If a test passes, the feature it
covers genuinely works in a real browser.

## What's covered

- **`specs/auth.spec.js`** — sign up, validation (weak password, mismatched
  passwords, duplicate email), login (wrong password, unknown email),
  logout, and that a session survives a page reload but not a logout.
- **`specs/dashboard.spec.js`** — the 6 currency chips resolve to real
  values, the rates caption settles to live/offline, the balance sparkline
  renders, theme toggling persists across reload, balance hide/show,
  Send Money's loading state, and invoice creation (including rejecting
  a `<script>`-tag client name).
- **`specs/subscriptions.spec.js`** — starter subscriptions, linking a new
  one, rejecting a past renewal date, pause/unpause, unlink, subscriptions
  persisting across logout/login, and the topbar search filtering both
  the transactions table and the subscription grid.
- **`specs/tier-and-sidebar.spec.js`** — the Tier 1→2→3 verification flow
  (checklist gating, upgrade unlocking the next tier, persistence), and
  the sidebar (section links scroll + highlight, Verification/Security/
  Support open modals instead of navigating, mobile off-canvas toggle).

## Running it

You'll need [Node.js](https://nodejs.org) installed (18+ is fine). From
inside this `tests/` folder:

```bash
npm install
npx playwright install chromium
npm test
```

The first command installs Playwright itself; the second downloads the
actual browser it drives (only needed once). `npm test` then:

1. Starts a static file server for the whole `dubempay/` project
   (via `npx http-server`, on port 8080 — see `playwright.config.js` if
   that port is already busy on your machine)
2. Runs every spec against it in a real headless Chromium
3. Prints a pass/fail summary, and writes a full HTML report

To see the HTML report after a run:

```bash
npx playwright show-report
```

To run just one file, or watch it run with the browser visible:

```bash
npx playwright test specs/auth.spec.js
npx playwright test --headed
```

## Why these tests, and what they don't cover

This app has **no backend** — "accounts" and all app state live in the
browser's `localStorage`. These tests reflect that: every test that needs
to be logged in signs up a brand-new, randomly-emailed account first
(see `specs/helpers.js`), so tests never collide with each other or with
data from a previous run.

What's intentionally **not** covered here:
- Visual/pixel-perfect regression testing (screenshots) — Playwright can
  do this too (`toHaveScreenshot()`), just left out to keep this suite
  fast and not brittle against every small style tweak.
- The live currency-rate fetch itself succeeding — that depends on a
  third-party API being reachable from wherever you run these tests, so
  the dashboard test only asserts the caption resolves to *either*
  "Live rates ✓" *or* "Offline rates", never that it's specifically live.
- Cross-browser testing — only Chromium is configured by default. Add
  `firefox` / `webkit` projects to `playwright.config.js` if you want that.

🔧 EDIT HERE: if you connect this to a real backend later, the account/
session tests in `auth.spec.js` will need real API mocking (Playwright's
`page.route()`) instead of relying on localStorage being empty at the
start of each test.
