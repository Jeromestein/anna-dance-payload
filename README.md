# Anna Dance Academy Payload CMS Proof of Concept

This repository is an isolated test of a small, structured CMS for Anna Dance Academy. It is not
connected to the current website or its Supabase project.

The first test covers two content areas:

- **Images**: an upload library with reusable JPEG, PNG, and WebP files.
- **Faculty**: teacher records with Name, Title, Introduction, Profile photo, visibility, ordering,
  publishing, and Trash.

The frontend owns the card layout. Editors change content but cannot change CSS, columns, colors,
or responsive behavior.

## Pinned versions

| Package | Version |
| --- | --- |
| Payload CMS | `3.88.0` |
| Payload Next adapter | `3.88.0` |
| Payload Postgres adapter | `3.88.0` |
| Payload S3 storage adapter | `3.88.0` |
| Next.js | `16.3.3` |
| React / React DOM | `19.2.6` |

The dependency lockfile is committed so future installs use the tested dependency graph.

## Routes

| Route | Purpose |
| --- | --- |
| `/` | POC status plus the editable homepage Faculty section |
| `/admin` | Payload administrator interface |
| `/admin/collections/images` | Reusable Images library |
| `/admin/collections/faculty` | Faculty create, edit, order, publish, hide, and Trash workflow |
| `/faculty-preview` | Public-style Faculty card preview |

## Isolation rules

This POC must use a new Supabase project created only for the Payload test.

Do not:

- use the current Anna Dance Academy Supabase connection string;
- reuse the current website's Storage buckets or S3 credentials;
- modify student, guardian, booking, payment, profile, or authentication data;
- expose S3 credentials through `NEXT_PUBLIC_*` variables or browser code; or
- treat a local test as proof that a deployed environment works.

Payload owns only POC administrator login and CMS marketing content. The existing application keeps
ownership of student and guardian accounts and all operational records.

## Local setup

1. Create a new Supabase project for this test.
2. Copy `.env.example` to `.env`.
3. Replace every placeholder with values from the new project.
4. Generate a long random `PAYLOAD_SECRET`.
5. Run `pnpm install`.
6. Run `pnpm dev` and open `http://localhost:3000/admin`.
7. Create a separate test administrator when Payload shows the first-user screen.

To copy the original three Faculty profiles and photos into this isolated POC, run:

```sh
pnpm payload run scripts/seed-original-faculty.ts "/path/to/Anna Dance Academy"
```

The seed is repeatable: it updates matching Faculty and Images records instead of creating
duplicates. It copies the photos into this POC's configured media storage and does not modify the
source repository.

Use the database connection shown by the new Supabase project's **Connect** dialog. A direct
connection is preferred for migrations when the environment supports IPv6. The Session pooler on
port `5432` is the fallback for IPv4-only environments. Do not use an unverified connection string.

The local `.env` initially contains a deliberately non-production localhost placeholder. The CMS
admin and Faculty preview require a working PostgreSQL connection.

### Verified test environment

- Supabase project: `anna-dance-payload-poc`
- Project reference: `hsitmgmcekzobksgtjoj`
- Region: West US (North California), `us-west-1`
- Purpose: isolated Payload database and media-storage proof of concept
- Local connection: Supabase Session pooler on port `5432`

The database connection and Payload secret are stored only in the Git-ignored local `.env` file.

## Supabase Storage setup

1. In the new Supabase project, create a dedicated bucket named `anna-dance-payload-poc`.
2. Open **Storage > S3 Configuration** and enable the S3 protocol.
3. Generate a server-only S3 access key pair.
4. Copy the endpoint and region exactly as displayed by Supabase.
5. Add the five `S3_*` variables from `.env.example` to `.env`.
6. Restart the development server after changing `.env`.

The S3 adapter remains disabled unless all five values are present. Without them, this Images
collection stores local development uploads in `/images`, which is intentionally ignored by Git.
Supabase S3 access keys bypass Storage RLS and must never be sent to the browser.

## Faculty publishing behavior

A Faculty profile appears on the public preview only when both conditions are true:

1. The record is **Published**.
2. **Show on website** is enabled.

This lets an editor hide a teacher without deleting the profile. Trash is a soft-delete workflow,
so an editor can restore a record during the POC. Drag-and-drop ordering is enabled in the Faculty
list.

## Verification commands

Run these after code changes:

```sh
pnpm generate:types
pnpm lint
pnpm typecheck
```

Do not run a production build as part of this POC unless the repository instructions change.

## Implementation checklist

A checked item means the implementation exists and has been verified at the level stated.

### Project foundation

- [x] Create a separate project and Git repository.
- [x] Use the official blank Payload template with PostgreSQL.
- [x] Pin Payload, Next.js, React, and adapter versions.
- [x] Commit a dependency lockfile.
- [x] Document the separation from the current website and Supabase project.
- [x] Create the new Supabase project dedicated to this POC.
- [x] Record the Supabase project region and environment purpose.
- [ ] Confirm the current Anna Dance Academy Supabase project remains unchanged.

### Images library

- [x] Create an Images upload collection.
- [x] Restrict uploads to JPEG, PNG, and WebP files.
- [x] Generate thumbnail and Faculty card image sizes.
- [x] Require an internal image name and accessible image description.
- [x] Restrict create, update, and delete operations to Payload administrators.
- [x] Configure Trash for recoverable deletion.
- [x] Add a conditional Supabase-compatible S3 adapter.
- [ ] Create the dedicated Supabase Storage bucket.
- [ ] Enable S3 and add server-only credentials.
- [ ] Upload an image through Payload and verify it in Supabase Storage.
- [ ] Confirm uploaded files persist after a fresh preview deployment.

### Faculty collection

- [x] Create the Faculty collection.
- [x] Add required `name`, `title`, `introduction`, and `profilePhoto` fields.
- [x] Reuse photos through the Images collection.
- [x] Add Publish/Draft workflow.
- [x] Add a plain-language **Show on website** control.
- [x] Add drag-and-drop ordering.
- [x] Add Trash and restore support.
- [x] Restrict writes to Payload administrators.
- [x] Restrict public reads to published and visible records.
- [x] Create a responsive Faculty preview page with fixed card design.
- [x] Render the same editable Faculty collection as a section on the homepage.
- [x] Port the original homepage Faculty heading, card, and mobile-scroll design into the POC.
- [x] Import and publish the original three Faculty profiles and photos in the isolated POC.
- [x] Create the Payload test administrator.
- [x] Add, publish, and edit a real test profile.
- [ ] Reorder, hide, trash, and restore a real test profile.
- [x] Confirm changes appear without a frontend redeployment.

### Acceptance

- [x] Connect only to the new Supabase PostgreSQL database.
- [ ] Confirm Payload schema changes affect only the new project.
- [x] Confirm administrator login works.
- [ ] Confirm image selection works from a Faculty profile.
- [ ] Confirm hidden, draft, and trashed profiles do not render publicly.
- [x] Run lint and TypeScript checks successfully.
- [x] Verify the POC overview at desktop and mobile widths with no horizontal overflow.
- [x] Verify the overview, admin, and Faculty preview in a desktop browser.
- [x] Verify the Faculty preview at a mobile viewport.
- [x] Verify the homepage Faculty section with live CMS data at desktop and mobile widths.
- [ ] Deploy an isolated preview and repeat the workflow.
- [ ] Record findings, limitations, and expected recurring costs.

### Later phases

- [ ] Add a Videos collection and document video-hosting limits.
- [ ] Add Classes after the Faculty workflow is accepted.
- [ ] Test a controlled video section that selects an item from Videos.
- [ ] Decide whether Payload stays separate or moves into the existing Next.js application.
