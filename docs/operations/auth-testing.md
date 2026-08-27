# Authentication Test Framework

The default authentication test suite is designed not to create users, send
emails, or modify Supabase records.

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

The always-on browser tests read public pages and verify unauthenticated
redirects. The confirmation-resend test intercepts the Supabase request inside
the browser and returns a local mock response, so no email is sent and no
Supabase record is changed. Registration and password-reset forms are not
submitted.

Optional login tests use existing fixed accounts and do not edit their
profiles. Store credentials in local environment variables; never commit them:

```bash
E2E_STUDENT_EMAIL=
E2E_STUDENT_PASSWORD=
E2E_ADMIN_EMAIL=
E2E_ADMIN_PASSWORD=
```

When these variables are absent, the fixed-account tests are skipped. Use
dedicated test accounts instead of personal or customer accounts.

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
