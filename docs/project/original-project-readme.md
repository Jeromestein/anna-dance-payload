# Anna Dance Academy

A responsive Next.js website for Anna Dance Academy with public marketing pages, consultation booking, contact inquiry delivery, Supabase authentication, editable user profiles, and protected administrator tools.

For the current product status and prioritized backlog, see [PROJECT_STATUS_AND_ROADMAP.md](./PROJECT_STATUS_AND_ROADMAP.md).

## Current Capabilities

### Public website

- Home, Classes, Schedule, Faculty, About, and Contact pages.
- Responsive desktop, tablet, and mobile layouts.
- Shared navigation, footer, hero, calls to action, class data, faculty data, and schedule data.
- Embedded Cal.com consultation booking with an external fallback link.
- Contact inquiry form with validation, sanitization, a honeypot, basic rate limiting, and Resend email delivery.
- Stripe-hosted $1 test checkout and return page for connection testing only.

### Authentication and profiles

- Supabase email/password registration and login.
- Email confirmation callback and confirmation-email resend flow.
- Google OAuth sign-in.
- Forgot-password and password-reset flows.
- Cookie-based Supabase SSR sessions refreshed through the Next.js proxy.
- A portable `user_profiles` table linked one-to-one with `auth.users`.
- Automatic profile creation for email and Google users.
- Self-service profile editing with optional phone and guardian contact fields.
- Compatibility redirects from the retired `/account` and `/admin/users` routes.

### Administrator tools

- Protected `/users` directory for administrators.
- User counts, role filters, and name/email/phone search.
- Protected user detail and edit pages.
- Secure database function for administrator profile and role updates.
- Protection against an administrator changing their own role.
- Supabase Row Level Security policies that limit ordinary users to their own profile.

### Tests

- Vitest unit tests for authentication validation and confirmation-email resend behavior.
- Playwright browser tests for public authentication screens and unauthenticated access control.
- Optional fixed-account Playwright tests for student and administrator permissions.
- Browser tests avoid creating users or sending real emails by default.

## Technology

- Next.js 16 and React 19
- TypeScript
- Supabase Auth, Postgres, and Row Level Security
- Cal.com embed
- Resend email delivery
- Stripe Payment Link in test mode
- Vitest and Playwright

## Routes

### Public routes

| Route | Purpose |
| --- | --- |
| `/` | Home page |
| `/classes` | Program overview |
| `/schedule` | Consultation booking and sample weekly schedule |
| `/faculty` | Faculty profiles |
| `/about` | Academy story and values |
| `/contact` | Contact details and inquiry form |
| `/payment-test` | Stripe test-mode connection check |

### Account routes

| Route | Purpose |
| --- | --- |
| `/login` | Email/password and Google login |
| `/login?mode=signup` | New account registration |
| `/auth/callback` | Supabase email and OAuth callback |
| `/resend-confirmation` | Resend a signup confirmation email |
| `/forgot-password` | Request a password-reset email |
| `/reset-password` | Establish a recovery session and choose a new password |
| `/users/me` | Authenticated user's editable profile |
| `/users` | Administrator-only user directory |
| `/users/[id]` | Administrator-only user profile editor |

## Local Setup

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Copy the environment template:

   ```bash
   cp .env.example .env.local
   ```

3. Configure the required environment variables:

   ```dotenv
   RESEND_API_KEY=
   CONTACT_TO_EMAIL=annadanceacademy@gmail.com
   RESEND_FROM_EMAIL="Anna Dance Academy <accounts@annadanceacademy.com>"

   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   ```

4. Apply the SQL migrations in `supabase/migrations/` to the target Supabase project in chronological order.

5. Configure Supabase Auth:

   - Add the local and production callback URLs to the redirect allowlist.
   - Configure the production Site URL.
   - Enable Google OAuth and add its client credentials if Google login is required.
   - Configure a production-capable email provider for confirmation and recovery messages.

6. Start the development server from the user's VS Code terminal:

   ```bash
   pnpm dev
   ```

   The default local URL is `http://localhost:3000`.

## Database Migrations

The migrations currently:

1. Create the original student profile table and self-access policies.
2. Rename it to `user_profiles` and add email and role fields.
3. Add secure administrator profile updates.
4. Make phone numbers optional.
5. Support automatic profile creation for Google users.

`user_profiles.id` is the same UUID as `auth.users.id`. Do not expose a Supabase secret/service-role key to browser code. Ordinary browser and server-rendered requests use the publishable key and rely on RLS.

## Validation

Run the non-destructive local checks:

```bash
pnpm typecheck
pnpm test
```

Run browser tests when a supported local or deployed server is available:

```bash
pnpm test:e2e
```

Run all authentication tests:

```bash
pnpm test:auth
```

The optional fixed-account tests use these uncommitted environment variables:

```dotenv
E2E_STUDENT_EMAIL=
E2E_STUDENT_PASSWORD=
E2E_ADMIN_EMAIL=
E2E_ADMIN_PASSWORD=
```

See [docs/auth-testing.md](./docs/auth-testing.md) for data-safety rules, browser artifacts, and the macOS Codex browser-sandbox limitation.

## External Service Boundaries

- **Supabase** owns authentication, sessions, profile storage, and database authorization.
- **Resend** delivers public contact inquiries and should also be configured as the production authentication email provider.
- **Cal.com** currently owns consultation availability and booking delivery; bookings are not yet queried or synchronized for the account dashboard.
- **Stripe** currently provides a test Payment Link only; the application does not yet verify payment with a webhook or store payment records.

## Known Product Gaps

- The account profile still combines a login identity with student details; it does not yet support one guardian managing multiple students.
- Registration, family/student, enrollment, payment, and class-session tables are not implemented.
- Stripe payment records and signed webhooks are not implemented.
- Cal.com bookings are not available in the account dashboard; direct API queries versus Supabase synchronization remains an open architecture decision.
- The displayed class schedule is still static sample data.
- Privacy, Terms, consent/waiver, production SEO, monitoring, and analytics remain incomplete.
- Google OAuth and all real email-delivery flows require environment-specific end-to-end verification.

See [PROJECT_STATUS_AND_ROADMAP.md](./PROJECT_STATUS_AND_ROADMAP.md) for the recommended implementation sequence.
