# Anna Dance Academy Payload Website

This repository is the refactor target for the Anna Dance Academy website. It combines the public
Next.js site and Payload administrator interface in one application while keeping student accounts
and operational data in the academy's existing Supabase project.

The CMS currently covers six structured content areas:

- **Images**: an upload library with reusable JPEG, PNG, and WebP files.
- **Videos**: a separate MP4 and WebM library with an optional cover image selected from Images.
- **Faculty**: teacher records with Name, Title, Specialties, Description, Profile photo, visibility,
  ordering, publishing, and Trash.
- **Media Galleries**: reusable, ordered photo-and-video groups whose media is selected from the
  two libraries and referenced directly by Next.js pages through stable slugs.
- **Social Profiles**: one reusable set of optional Facebook, Instagram, and WeChat details used by
  galleries, the footer, and future website sections.
- **Classes**: editable class-program records with audience, summary, highlights, image, visibility,
  ordering, drafts, and Trash.

The frontend owns the card layout. Editors change content but cannot change CSS, columns, colors,
or responsive behavior.

## Pinned versions

| Package                    | Version  |
| -------------------------- | -------- |
| Payload CMS                | `3.88.0` |
| Payload Next adapter       | `3.88.0` |
| Payload Postgres adapter   | `3.88.0` |
| Payload S3 storage adapter | `3.88.0` |
| Next.js                    | `16.3.3` |
| React / React DOM          | `19.2.6` |

The dependency lockfile is committed so future installs use the tested dependency graph.

## Documentation

The migrated project documentation is organized in the
[documentation index](docs/README.md). It includes the original business and website plan,
lightweight CMS design, legacy roadmap and design notes, authentication test procedures, media
library notes, content references, and the original Apple Pages biography source.

The applied student-authentication database history is documented in the
[Supabase schema notes](supabase/README.md).

## Routes

| Route                                | Purpose                                                          |
| ------------------------------------ | ---------------------------------------------------------------- |
| `/`                                  | Migrated academy homepage with CMS Faculty, Classes, and gallery |
| `/about`                             | Migrated About page using the `about-academy` Media Gallery      |
| `/classes`                           | Migrated Classes page using CMS records with safe fallbacks      |
| `/faculty`                           | Migrated Faculty page using published CMS records                |
| `/contact`                           | Migrated contact experience                                      |
| `/schedule`                          | Migrated schedule page                                           |
| `/login`                             | Student and parent Supabase login                                |
| `/users/me`                          | Student or parent self-service profile                           |
| `/users`                             | Payload-administrator-only student directory                     |
| `/admin`                             | Payload administrator interface                                  |
| `/admin/collections/images`          | Reusable Images library                                          |
| `/admin/collections/videos`          | Reusable Videos library                                          |
| `/admin/collections/faculty`         | Faculty create, edit, order, publish, hide, and Trash workflow   |
| `/admin/collections/classes`         | Class-program create, edit, order, publish, hide, and Trash      |
| `/admin/collections/media-galleries` | Create, edit, publish, hide, and reuse mixed-media galleries     |
| `/admin/globals/social-profiles`     | Edit reusable social links, invitation copy, and WeChat details  |
| `/privacy` and `/terms`              | Migrated legal pages                                             |

## Application and data boundaries

The application uses one Supabase project, `anna-dance-payload-poc`
(`hsitmgmcekzobksgtjoj`), for three services:

- Payload stores CMS records in the project's PostgreSQL `public` schema;
- Supabase Storage provides the S3-compatible website media library; and
- Supabase Auth owns student and parent login, with account details in `public.user_profiles`.

Payload staff and student accounts are not merged. An `administrator` Payload account can open the
student directory without a second administrator login. A `content-editor` can edit website content
but cannot access student data. Students and parents continue to log in through `/login` and can
only manage their own profile.

The Supabase secret key is server-only. It must never use a `NEXT_PUBLIC_*` name or be imported by
client components. S3 credentials follow the same server-only rule. Row Level Security is enabled
on `user_profiles`; Payload's `public.users` table remains separate from Supabase's `auth.users`.

## Local setup

1. Use the `anna-dance-payload-poc` Supabase project for CMS tables, Storage, and student Auth.
2. Copy `.env.example` to `.env`.
3. Add the database, S3, public API, and server-only secret values from that project.
4. Apply the SQL files under `supabase/migrations/` in timestamp order.
5. Generate a long random `PAYLOAD_SECRET`.
6. Run `pnpm install`.
7. Run `pnpm dev` and open `http://localhost:3000/admin`.
8. Assign Payload staff either the `administrator` or `content-editor` role.

To copy the original three Faculty profiles and photos into this isolated POC, run:

```sh
pnpm payload run scripts/seed-original-faculty.ts "/path/to/Anna Dance Academy"
```

The seed is repeatable: it updates matching Faculty and Images records instead of creating
duplicates. It copies the photos into this POC's configured media storage and does not modify the
source repository.

After enabling or changing remote media storage, re-upload the existing image records without
creating duplicates:

```sh
pnpm payload run scripts/seed-original-faculty.ts "/path/to/Anna Dance Academy" refresh-media
```

After the Faculty images and Dunhuang video exist, create the two reusable sample galleries used by
the Homepage and About page:

```sh
pnpm payload run scripts/seed-media-galleries.ts
```

Create the reusable social-links demonstration data separately:

```sh
pnpm payload run scripts/seed-social-profiles.ts
```

The seed uses the Facebook and Instagram platform homepages plus a clearly marked POC WeChat ID.
Replace all three with client-confirmed profiles before any public launch.

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

The dedicated public Storage bucket is connected through server-only S3 credentials. The original
three Faculty photos and their generated image sizes have been migrated and verified through the
Payload file proxy. A generated one-second MP4 and the 17 MB Dunhuang stage-performance MP4 have
also been uploaded through the administrator, stored under `videos/`, and read back through
Payload. Credential values remain only in the Git-ignored local `.env` file.

## Supabase Storage setup

1. In the new Supabase project, create a dedicated bucket named `anna-dance-payload-poc`.
2. Open **Storage > S3 Configuration** and enable the S3 protocol.
3. Generate a server-only S3 access key pair.
4. Copy the endpoint and region exactly as displayed by Supabase.
5. Add the five `S3_*` variables from `.env.example` to `.env`.
6. Restart the development server after changing `.env`.

The S3 adapter remains disabled unless all five values are present. Without them, the Images and
Videos collections store local development uploads in `/images` and `/videos`, which are
intentionally ignored by Git. With S3 enabled, images use the `images/` prefix and videos use the
`videos/` prefix in the same isolated bucket. Uploads are limited to 50 MB to match the bucket
configuration. Supabase S3 access keys bypass Storage RLS and must never be sent to the browser.

## Faculty publishing behavior

A Faculty profile appears on the public preview only when both conditions are true:

1. The record is **Published**.
2. **Show on website** is enabled.

This lets an editor hide a teacher without deleting the profile. Trash is a soft-delete workflow,
so an editor can restore a record during the POC. Drag-and-drop ordering is enabled in the Faculty
list.

## Media Galleries and page references

Editors open **Website Content > Media Galleries** and can:

1. create multiple named galleries for different content purposes;
2. edit each gallery's small heading, heading, and introduction;
3. add up to 12 sortable Image or Video rows;
4. select existing media or create a new item in the corresponding library;
5. add optional captions; and
6. publish, hide, Trash, or restore galleries without changing frontend layout code; and
7. keep the developer-provided **Page reference** stable after a page is connected.

Next.js owns the placement and requests a Gallery by its stable reference. The Homepage uses
`home-studio`; the About test page uses `about-academy`. Another page can reuse either reference or
request its own Gallery without adding a separate placement model.

The homepage owns the responsive visual treatment. Desktop uses a fixed asymmetric wall, while
mobile uses horizontally scrollable cards. Editors cannot change columns, cropping rules, colors,
or responsive breakpoints. Drafts and versions allow changes to be reviewed or restored before
publishing.

## Social Profiles

Editors open **Website Content > Social Profiles** and manage one shared set of invitation copy and
platform details. Facebook and Instagram appear only when their URL is filled. WeChat appears when
either a WeChat ID or QR-code image is filled. If every platform is empty, the complete social
component stays hidden.

Each Media Gallery has a **Show social links with this gallery** checkbox. When enabled, the social
invitation becomes the final card in the gallery wall. The separate **Show in website footer**
checkbox controls the compact footer version. Both placements read the same Social Profiles record,
so editors update the links only once. Future developer-controlled sections can reuse the same
component without introducing page-placement records.

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
- [x] Preserve the original repository and use this project as the refactor target.
- [x] Document the separation between CMS and student operational data.
- [x] Create the new Supabase project dedicated to this POC.
- [x] Record the Supabase project region and environment purpose.
- [x] Confirm the current Anna Dance Academy source repository remains unchanged.

### Public website migration

- [x] Migrate the shared header, footer, booking button, fonts, palette, and responsive shell.
- [x] Migrate Homepage, About, Classes, Faculty, Contact, Schedule, Privacy, and Terms routes.
- [x] Preserve the original visual design while replacing hard-coded Faculty with Payload records.
- [x] Add editable Classes with a safe static fallback until CMS records are created.
- [x] Render separate slug-addressed galleries on Homepage and About.
- [x] Migrate student login, password recovery, account callback, and self-service profile routes.
- [x] Verify Homepage, About, Classes, Faculty, and gallery layouts in a local browser.

### Staff and student access

- [x] Add `administrator` and `content-editor` roles to Payload staff accounts.
- [x] Allow only Payload administrators to access `/users` and `/users/[id]`.
- [x] Keep student and parent login under Supabase Auth in the shared project.
- [x] Keep student self-service updates restricted to the signed-in student's own profile.
- [x] Add a server-only Supabase administration client for student-directory operations.
- [x] Remove the legacy Supabase `admin` role as an authorization source.
- [x] Redirect unauthenticated `/users` requests to Payload login.
- [x] Migrate and apply the six student-profile SQL migrations to the shared project.
- [ ] Add the shared project's public values and server-only secret key to the local environment.
- [ ] Verify the administrator directory against real academy student data after configuration.

### Images library

- [x] Create an Images upload collection.
- [x] Restrict uploads to JPEG, PNG, and WebP files.
- [x] Generate thumbnail and Faculty card image sizes.
- [x] Require an internal image name and accessible image description.
- [x] Restrict create, update, and delete operations to Payload administrators.
- [x] Configure Trash for recoverable deletion.
- [x] Add a conditional Supabase-compatible S3 adapter.
- [x] Create the dedicated Supabase Storage bucket.
- [x] Enable S3 and add server-only credentials.
- [x] Migrate the three existing Faculty images through Payload and verify all generated files in
      Supabase Storage.
- [ ] Upload a new image through the Payload administrator Media Library.
- [ ] Confirm uploaded files persist after a fresh preview deployment.

### Videos library

- [x] Create a separate Videos upload collection in the Media Library.
- [x] Restrict uploads to MP4 and WebM files.
- [x] Require a plain-language video name and accessible description.
- [x] Add an optional cover image selected from Images.
- [x] Restrict create, update, and delete operations to Payload administrators.
- [x] Configure Trash for recoverable deletion.
- [x] Store videos under the `videos/` S3 prefix.
- [x] Match the Payload upload limit to the 50 MB Supabase bucket limit.
- [x] Upload a generated test video through the Payload administrator and verify it in Supabase
      Storage.

### Faculty collection

- [x] Create the Faculty collection.
- [x] Add required `name`, `title`, `introduction`, `description`, and `profilePhoto` fields.
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

### Reusable Media Galleries

- [x] Replace the single Homepage Gallery Global with a reusable Media Galleries Collection.
- [x] Add an internal CMS name, editable heading, introduction, and visibility fields.
- [x] Add a unique, stable Page reference used directly by Next.js page code.
- [x] Add sortable rows that switch between Image and Video selection.
- [x] Reuse media from the Images and Videos libraries.
- [x] Allow optional captions without exposing layout controls.
- [x] Add Draft/Publish, visibility, Trash, and version workflows.
- [x] Remove the extra Gallery Placements Global.
- [x] Render `home-studio` directly on the Homepage using the reusable gallery component.
- [x] Create an About page that directly renders a different `about-academy` Gallery.
- [x] Create a fixed asymmetric desktop wall.
- [x] Create a horizontally scrollable mobile wall without page overflow.
- [x] Migrate the existing three-image and Dunhuang-performance video selection to
      `Home — Studio Moments`.
- [x] Seed and publish `About — Academy in Motion` with a different media order and copy.

### Reusable Social Profiles

- [x] Add one Social Profiles Global with editable invitation heading and message.
- [x] Add optional Facebook, Instagram, WeChat ID, and WeChat QR-code fields.
- [x] Hide individual platforms when their corresponding fields are empty.
- [x] Add a per-Gallery switch for the reusable social invitation.
- [x] Reuse the same Social Profiles data in the Gallery wall and website footer.
- [ ] Verify the Social Profiles editor and platform visibility controls in Payload.
- [x] Verify the Gallery social card, footer icons, and WeChat dialog at desktop and mobile widths.

### Acceptance

- [x] Keep Payload CMS tables, S3 media, student Auth, and profiles in one Supabase project.
- [x] Create `user_profiles`, RLS policies, and Auth synchronization triggers without changing the
      existing Payload administrator.
- [ ] Confirm Payload schema changes affect only the new project.
- [x] Confirm administrator login works.
- [ ] Confirm image selection works from a Faculty profile.
- [ ] Confirm hidden, draft, and trashed profiles do not render publicly.
- [x] Run lint and TypeScript checks successfully.
- [x] Verify the POC overview at desktop and mobile widths with no horizontal overflow.
- [x] Verify the overview, admin, and Faculty preview in a desktop browser.
- [x] Verify the Faculty preview at a mobile viewport.
- [x] Verify the homepage Faculty section with live CMS data at desktop and mobile widths.
- [ ] Verify the Media Galleries editor with image rows, a video row, and sortable controls.
- [x] Verify the Homepage resolves `home-studio` and About resolves `about-academy`.
- [x] Verify the published Homepage Gallery at desktop and mobile widths with no horizontal page
      overflow.
- [x] Verify the About Gallery at desktop and mobile widths with no horizontal page overflow.
- [x] Verify empty Social Profiles fields do not render public links.
- [ ] Deploy an isolated preview and repeat the workflow.
- [ ] Record findings, limitations, and expected recurring costs.

### Later phases

- [x] Add a Videos collection and document video-hosting limits.
- [x] Add Classes after the Faculty workflow is accepted.
- [x] Test a controlled homepage section that selects an item from Videos.
- [x] Generalize the homepage-only Gallery into reusable slug-addressed galleries.
- [x] Decide to use this unified Next.js + Payload project as the refactor target.
- [ ] Seed editable class records and images after confirming the intended production media set.
- [ ] Configure deployment environment variables and run preview-deployment acceptance checks.
