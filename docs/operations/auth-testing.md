# Authentication Test Framework

The test suite contains both non-mutating frontend checks and Payload admin
tests that create and delete temporary staff records. Do not run the complete
suite against the production database.

## Commands

```bash
pnpm test
pnpm test:e2e
pnpm test:auth
```

- `pnpm test` runs fast validation tests with Vitest.
- `pnpm test:e2e` runs public authentication and access-control checks with
  Playwright against `http://localhost:3000` by default.
- `pnpm test:auth` runs both suites.

Playwright reuses an existing local development server outside CI. If no server
is available, it starts the application with `pnpm dev`. Set
`PLAYWRIGHT_BASE_URL` to test a different port or deployment.

## Data safety

The frontend browser tests read public pages and verify unauthenticated
redirects without creating Supabase customers or sending authentication email.
Registration, confirmation, resend-confirmation, and password-reset forms are
not submitted by the default tests.

The Payload admin browser tests are different. `tests/helpers/seedUser.ts`
creates a temporary Payload staff account before the suite and deletes it
afterward. Those operations use the database configured by `DATABASE_URL`.

Before running `pnpm test:e2e` or `pnpm test`, confirm that `DATABASE_URL`
points to a disposable local or staging database. Never point destructive
fixture helpers at production. A failed or interrupted test can skip cleanup
and leave the temporary account behind.

Database-writing suites are skipped unless this explicit safety flag is set:

```bash
E2E_ALLOW_DATABASE_WRITES=true pnpm test:e2e
```

Setting the flag is an assertion that the configured database is disposable.
The temporary users have unique `anna-dance-e2e-*` addresses under
`example.com` and are removed after successful completion.

Do not place personal, customer, or production credentials in test environment
variables or committed files.

## Full email flows

End-to-end email delivery, confirmation callbacks, and password recovery create
external side effects. Keep those flows as controlled staging or manual
production checks until a separate Supabase test project and test inbox are
available.

## Browser installation

Local runs use the installed Google Chrome browser. CI uses Playwright Chromium
and should install it before running tests:

```bash
pnpm exec playwright install --with-deps chromium
```

Failure screenshots, traces, and the HTML report are saved under
`output/playwright/`, which is ignored by Git.

### macOS Codex desktop

Do not run `pnpm test:e2e` inside the default Codex sandbox on macOS when the
Playwright configuration uses the installed Google Chrome application. Chrome
can abort during startup with `SIGABRT` / `Abort trap: 6`, and macOS may display
multiple Google Chrome crash reports because Playwright starts several workers
in parallel. This is a browser-launch restriction in the outer Codex sandbox,
not evidence of an application or test failure.

Run the command with the narrowly approved sandbox-external permission from the
first attempt, or ask the user to run it from their VS Code terminal:

```bash
pnpm test:e2e
```

For interactive visual checks that need the user's authenticated browser state,
use the existing Chrome browser session instead of launching Playwright. If a
browser-launch failure must be diagnosed, temporarily use one worker to avoid
opening several crash reports; this reduces noise but does not remove the
sandbox restriction:

```bash
pnpm exec playwright test --workers=1
```

Close macOS crash reports with **OK** rather than **Reopen**. Rerun the tests
using one of the supported execution paths above.
