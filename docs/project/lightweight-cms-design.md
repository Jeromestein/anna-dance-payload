# Anna Dance Academy Custom Lightweight CMS Design

**Document status:** Isolated Payload proof-of-concept scaffold created; new Supabase setup and runtime acceptance pending

**Date:** August 26, 2026

**Product term:** Custom Lightweight CMS / Structured Content Management System

**Primary audience:** Product owner, designer, developer, and future website administrators

## 1. Executive Summary

Anna Dance Academy needs a small, purpose-built content management system that allows non-technical staff to update selected website content without changing code or damaging the site design.

The CMS will add four focused management areas:

1. A media library separated into Images and Videos.
2. Faculty profile management.
3. Class program management.
4. Controlled page-section management with reusable media selection.

This is not a general-purpose page builder and is not intended to reproduce WordPress. Administrators will manage content, visibility, order, and approved media choices. The public website will continue to control layout, typography, colors, responsive behavior, accessibility, and performance.

The product requirements in this document are implementation-independent. The current preferred implementation candidate is Payload CMS, but Payload will not be installed in this repository until an isolated proof of concept validates the exact Next.js, PostgreSQL, media-storage, editor, and deployment workflows.

The proof of concept will be created in a new project location and connected to a new Supabase project. The existing Anna Dance Academy website, its current Supabase project, authentication, student data, and administrator tools will remain unchanged during the experiment.

## Architecture Decision Record

### Decision

Do not build the CMS foundation from scratch in the current website repository yet.

Create an isolated Payload CMS proof of concept that validates:

- Payload Admin authentication.
- A reusable Images collection.
- A structured Faculty collection.
- Image upload through Supabase Storage's S3-compatible interface.
- PostgreSQL persistence in a new Supabase project.
- Rendering one Payload-managed Faculty section in a small Next.js preview page.
- Content updates appearing without a new frontend deployment.
- Create, edit, publish, hide, reorder, trash, and restore workflows.

### Isolation boundary

The proof of concept must use:

- A new project directory or repository.
- A pinned Payload version.
- A new Supabase project dedicated to the Payload experiment.
- A new PostgreSQL connection used only by Payload.
- A new Storage bucket and server-side S3 credentials.
- A separate Payload administrator account.

The proof of concept must not:

- Connect Payload to the current Anna Dance Academy Supabase database.
- Modify the current `user_profiles` schema or RLS policies.
- Reuse current production Storage buckets.
- Replace the existing public Faculty page during the experiment.
- Create, modify, or delete student, booking, payment, or account records.
- Store S3 access keys in browser-visible environment variables.

### Payload responsibility

If the proof of concept succeeds, Payload may own:

- CMS administrator authentication.
- Faculty marketing records.
- Class program marketing records.
- Images and Videos collections.
- Controlled page-section content.
- Content status, ordering, versions, and Trash.

The existing Supabase application will continue to own:

- Student and guardian authentication.
- User profiles.
- Future families, students, registrations, and enrollments.
- Future payment records.
- Existing application RLS policies.

Faculty marketing records and authenticated user accounts remain separate concepts.

### How editable sections work

Payload will manage structured data, not arbitrary existing JSX.

For example, the public Faculty page remains a handwritten Next.js page. Its Faculty grid queries Payload and renders Payload-managed records inside the existing design. Other page sections remain static unless they are explicitly connected to a Payload Collection or Global.

Use:

- Collections for repeated records such as Faculty and Class Programs.
- Upload Collections for Images and Videos.
- Globals for one fixed editable section or group of site settings.
- Blocks only if a future phase intentionally introduces controlled section creation and ordering.

Payload Live Preview may display the existing frontend beside the editor, but arbitrary click-to-edit behavior is not assumed. Any visual field mapping must be implemented and verified separately.

### Decision after the proof of concept

After the proof of concept, choose one of two architectures:

1. Keep Payload as an independent CMS service and let the existing website query its API.
2. Integrate the validated Payload configuration into the existing Next.js application.

No production architecture is approved until the proof of concept passes the acceptance checklist below.

## Implementation Checklist

This checklist is the task record for the CMS initiative. Update it in the same commit as each completed implementation milestone. A checked item means the result exists and has been verified at the level stated by the item.

### Discovery and architecture

- [x] Define the lightweight CMS product goals.
- [x] Define Images, Videos, Faculty, Classes, and controlled Page Sections as the primary content areas.
- [x] Confirm that non-technical users must not edit layout, CSS, or arbitrary page structure.
- [x] Compare custom Supabase administration with Payload, Sanity, Strapi, Directus, and WordPress approaches.
- [x] Select Payload CMS as the proof-of-concept candidate.
- [x] Confirm that Payload can manage one structured section without managing the entire page.
- [x] Decide to isolate the Payload test from the current website and Supabase project.
- [x] Document the proof-of-concept scope and success criteria.

### New project and Supabase setup

- [x] Create the new Payload proof-of-concept project in the user-selected location.
- [x] Pin the Payload, Next.js, React, and database-adapter versions.
- [x] Record the selected versions in the proof-of-concept README.
- [ ] Create a new Supabase project dedicated to the Payload test.
- [ ] Confirm the new project region and environment purpose.
- [ ] Configure a server-only PostgreSQL connection for Payload.
- [ ] Confirm that Payload migrations affect only the new Supabase project.
- [ ] Create the proof-of-concept Payload administrator account.
- [ ] Confirm that the current Anna Dance Academy Supabase project remains unchanged.

### Media storage proof

- [ ] Create a dedicated Supabase Storage bucket for Payload media.
- [ ] Enable and configure the Supabase S3-compatible endpoint.
- [ ] Generate server-only S3 credentials for the test project.
- [x] Configure the Payload S3 storage adapter.
- [ ] Confirm that uploaded files persist after a preview redeployment.
- [ ] Confirm that S3 credentials are absent from browser bundles and public environment variables.
- [ ] Confirm image MIME-type and file-size validation.
- [ ] Confirm image thumbnails and image selection in Payload Admin.
- [ ] Document that Supabase Storage does not provide automatic general-purpose video transcoding.

### Faculty proof of concept

- [x] Create the Images upload collection.
- [x] Create the Faculty collection.
- [x] Add the required Faculty `name` field.
- [x] Add the required Faculty `title` field.
- [x] Add the required Faculty `introduction` field.
- [x] Add the required Faculty `profilePhoto` relationship to Images.
- [x] Add Published and Hidden behavior.
- [x] Add display ordering.
- [x] Add Trash and restore behavior.
- [x] Restrict Faculty writes to Payload administrators.
- [x] Create a small Next.js Faculty preview page.
- [x] Render Faculty records without giving editors control over the card layout.
- [ ] Confirm that adding a Faculty record creates a new public card.
- [ ] Confirm that editing a Faculty record updates the preview without a new deployment.
- [ ] Confirm that Hidden and Trashed Faculty records do not render publicly.
- [ ] Confirm responsive desktop and mobile card layouts.

### Proof-of-concept acceptance

- [ ] Administrator login works in the intended preview environment.
- [ ] Image upload and reuse work in the intended preview environment.
- [ ] Faculty create, edit, publish, hide, reorder, trash, and restore work.
- [ ] Public content reads are limited to published records.
- [ ] The preview page remains usable when optional content is empty.
- [x] Static and type checks pass for the isolated project scaffold.
- [ ] Browser verification passes on desktop and mobile.
- [ ] The deployed preview is verified after a fresh deployment.
- [ ] Database and Storage changes are confirmed isolated from the current website.
- [ ] Findings, limitations, and recurring costs are documented.

### Architecture decision after testing

- [ ] Decide whether Payload remains a separate service or is integrated into the existing website.
- [ ] Approve the production database and Storage design.
- [ ] Approve the CMS authentication and editor-role design.
- [ ] Approve the production backup and migration workflow.
- [ ] Approve the next Collections: Class Programs, Videos, and Page Sections.
- [ ] Update this document with the final production architecture.
- [ ] Begin production implementation only after the preceding decisions are approved.

## 2. Current-State Summary

The public website currently reads key marketing content from code:

- Faculty profiles and class programs are defined in `lib/site-data.ts`.
- The Home page references local desktop and mobile hero videos directly.
- Page hero images and other section images are referenced from page components or CSS.
- Public media is stored under `public/images/` and `public/videos/`.
- Supabase authentication, `user_profiles`, and administrator authorization already exist.
- Administrator tools currently focus on account and user-profile management rather than website content management.

The CMS will move only approved marketing content into structured database records. It will not change registration, payment, booking, or student-account behavior.

## 3. Goals

### 3.1 Product goals

- Allow a non-technical administrator to upload and reuse images and videos.
- Allow an administrator to add, edit, hide, restore, reorder, and remove Faculty profiles.
- Allow an administrator to add, edit, hide, restore, reorder, and remove Class programs.
- Allow approved page sections to display an image or video selected from the media library.
- Preserve the existing public-site design automatically as content changes.
- Prevent accidental deletion of media that is still in use.
- Keep all administrator workflows understandable without knowledge of URLs, file paths, HTML, CSS, or databases.

### 3.2 Technical goals

- Keep CMS editor authentication separate from the existing student and guardian authentication during the proof of concept.
- Protect every content write with server-side Payload access control and database-level constraints appropriate to the final architecture.
- Keep media references stable and reusable across multiple content records.
- Revalidate affected public pages immediately after an administrator saves a change.
- Preserve a safe fallback while static content is migrated into the approved CMS.
- Keep public pages responsive, accessible, and performant with administrator-uploaded content.

## 4. Non-Goals

The first release will not include:

- A free-form drag-and-drop page builder.
- Arbitrary HTML, CSS, scripts, colors, fonts, or column layouts.
- A blog, news publishing system, or editorial calendar.
- Registration, enrollment, attendance, tuition, or class-session management.
- A replacement for Cal.com, Stripe, Supabase Auth, or user-profile administration.
- Multiple simultaneous draft revisions of published content.
- Collaborative editing or approval workflows.
- A full digital asset management system with licensing and rights-expiration workflows.
- Automatic creation of a login account when a Faculty profile is created.

Faculty profiles are public marketing records. Authenticated user accounts are separate records with separate permissions.

## 5. Design Principles

### 5.1 Structured, not free-form

Administrators edit predefined fields and approved section types. The website remains responsible for visual presentation.

### 5.2 Plain language

The interface should use terms such as:

- Add teacher
- Choose photo
- Choose video
- Hide from website
- Save changes
- View website
- Move to trash

The interface should not expose terms such as database row, foreign key, storage bucket, object path, JSON, slug, or cache invalidation.

### 5.3 Visual selection

Content and media should be represented by large thumbnails and cards rather than dense tables whenever practical.

### 5.4 Safe defaults

- New Faculty and Class records start hidden.
- Core page sections can be hidden but cannot be permanently deleted from the primary editor.
- Media that is in use cannot be permanently deleted.
- Public layouts and color themes are selected from approved presets.
- Empty optional content does not render an empty visual block.

### 5.5 Reversible actions

- Faculty, Classes, Sections, and media use soft deletion.
- Recently deleted records remain recoverable from Trash.
- Destructive actions require a clear confirmation message naming the affected item.

## 6. Information Architecture

```text
Admin
├── Overview
├── Website Content
│   ├── Faculty
│   ├── Classes
│   └── Page Sections
├── Media Library
│   ├── Images
│   └── Videos
└── User Management
    └── Users
```

### 6.1 Proposed routes

| Route | Purpose |
| --- | --- |
| `/admin` | CMS overview and shortcuts |
| `/admin/faculty` | Faculty list, ordering, visibility, and Trash |
| `/admin/faculty/new` | Add a Faculty profile |
| `/admin/faculty/[id]` | Edit a Faculty profile |
| `/admin/classes` | Class program list, ordering, visibility, and Trash |
| `/admin/classes/new` | Add a Class program |
| `/admin/classes/[id]` | Edit a Class program |
| `/admin/sections` | Page and section selection |
| `/admin/sections/[id]` | Edit an approved page section |
| `/admin/media` | Media library with Images and Videos tabs |
| `/users` | Existing administrator-only user directory |

The current `/users` account-management route can remain in place and be linked from the new Admin navigation. Moving it under `/admin` is optional and should not block the CMS release.

## 7. Admin Shell

The Admin shell should visually relate to the public brand while remaining quieter and more functional.

### 7.1 Desktop layout

- Compact left navigation or a clearly separated top navigation.
- Warm white or Ivory background.
- Deep Teal navigation surface.
- Rose primary actions.
- Large page title and short explanatory sentence.
- Primary action in the upper-right corner.
- Content displayed in cards with clear spacing.

### 7.2 Mobile layout

- Collapsible Admin menu.
- Full-width forms and media cards.
- Sticky Save action only when it does not cover form content.
- Reordering available through Move Up and Move Down controls even if drag-and-drop is also provided.

### 7.3 Global Admin behaviors

- Show a clear loading state for every save or upload.
- Disable duplicate submissions while an operation is running.
- Show a success message after completion.
- Keep validation errors next to the affected field.
- Warn before leaving a form with unsaved changes.
- Provide a View Website link that opens the affected public page.
- Never present a successful UI state before the database operation succeeds.

## 8. Admin Overview

The Admin overview should contain four large task cards:

1. Faculty
2. Classes
3. Page Sections
4. Media Library

Each card shows a small status summary, for example:

- 3 published Faculty profiles
- 4 published Class programs
- 2 hidden sections
- 18 images and 4 videos

The overview should prioritize common tasks instead of analytics. Recent uploads and recently edited content may be added later but are not required for the first release.

## 9. Media Library

### 9.1 Purpose

The Media Library is the single reusable source for administrator-uploaded public images and videos.

```text
Upload once
    └── Media Library
            ├── Faculty portrait
            ├── Class cover
            ├── Page hero
            ├── Section image
            ├── Section video
            └── Mobile media alternative
```

### 9.2 Library navigation

The Media Library contains two primary tabs:

- Images
- Videos

Each tab supports:

- Search by title or original filename.
- Filter by All, In Use, and Unused.
- Sort by Newest, Oldest, or Name.
- Large thumbnail cards.
- Upload New action.
- Trash view.

Folders and complex tagging are intentionally excluded from the first release.

### 9.3 Media card

Each media card should display:

- Image thumbnail or video poster.
- Display title.
- Image dimensions or video duration.
- File size.
- Upload date.
- Usage count.
- Preview action.
- Edit details action.
- Move to Trash action.

The media-detail view should display every current usage, for example:

```text
Used in 2 places
- Home / Hero
- About / Founder Story
```

### 9.4 Upload workflow

```text
Choose or drop a file
    → Validate file type and size
    → Show processing progress
    → Generate preview metadata
    → Ask for a plain-language title
    → Ask for image description when required
    → Save to Media Library
    → Select it for the current content field, if opened from a picker
```

The upload interface should clearly state the current size limit before the user selects a file.

### 9.5 Image handling

Initial accepted formats:

- JPEG
- PNG
- WebP

Image requirements:

- Validate the real MIME type, not only the filename extension.
- Correct image orientation when metadata is available.
- Generate a web-optimized version.
- Preserve sufficient resolution for the intended slot.
- Record width, height, MIME type, and file size.
- Require or strongly prompt for an accessible image description when the image conveys content.
- Allow decorative images to be explicitly marked decorative.

The UI should describe aspect-ratio guidance in ordinary language, for example:

> A vertical photo works best here. The website will crop the edges automatically.

### 9.6 Video handling

Video requires two levels of support.

#### Initial support

- Accept web-compatible MP4 and WebM files.
- Validate the real MIME type and configurable maximum file size.
- Record duration, dimensions, MIME type, and file size.
- Generate or assign a poster image.
- Show upload and processing progress.
- Prevent a video from becoming selectable until validation succeeds.

#### Non-technical phone-video support

Raw phone uploads may be MOV, HEVC, very large, or otherwise unreliable across browsers. A truly non-technical workflow requires automatic transcoding that:

- Accepts common phone-recording formats.
- Produces a broadly compatible web video.
- Produces an optimized mobile rendition when appropriate.
- Generates a poster image.
- Reports processing state and failure in plain language.

Supabase Storage stores files but is not, by itself, a video-transcoding service. Automatic phone-video processing therefore requires either a dedicated media-processing provider or a separate background-processing workflow. This decision must be made before advertising unrestricted phone-video upload.

### 9.7 Media picker

Every supported content field uses the same picker:

```text
Choose Media
├── Images
├── Videos
├── Search
├── Upload New
└── Select
```

The picker automatically filters incompatible media:

- A Faculty portrait field shows Images only.
- A video-only field shows Videos only.
- A flexible section can switch between Image and Video.
- A mobile-image field shows Images and displays portrait-oriented guidance.

### 9.8 Replacement and deletion rules

- Uploaded files use immutable storage paths.
- Editing a media title or description does not change the stored file URL.
- Replacing a visual in one Faculty, Class, or Section changes only that content record.
- A global Replace Everywhere action is excluded from the first release.
- Media in use cannot be permanently deleted.
- Moving in-use media to Trash requires the administrator to remove or replace every usage first.
- Physical storage deletion occurs only after the record is no longer referenced and the Trash retention period has passed.

## 10. Faculty Management

### 10.1 Faculty list

The Faculty management page mirrors the visual identity of the public Faculty cards.

Each Admin card displays:

- Portrait.
- Name.
- Title.
- Published or Hidden status.
- Edit action.
- Hide or Publish action.
- Move Up and Move Down actions.
- More menu containing Move to Trash.

The primary page action is Add Teacher.

### 10.2 Faculty fields

| Field | Required | Notes |
| --- | --- | --- |
| Name | Yes | Plain text |
| Title | Yes | Example: Founder & Artistic Director |
| Introduction | Yes for publication | Plain text with a reasonable character limit |
| Profile photo | Yes for publication | Select from Images or upload a new image |
| Display order | Yes | Managed visually rather than typed manually |
| Website visibility | Yes | Published, Hidden, or Trashed |

The interface does not ask the administrator to enter a URL slug. A stable slug is generated from the name and remains editable only through a protected advanced action if individual Faculty detail pages are added later.

### 10.3 Faculty actions

- Add a new Faculty profile as Hidden.
- Edit any visible field.
- Choose an existing portrait from the Media Library.
- Upload a portrait without leaving the Faculty form.
- Preview the card before publication.
- Publish or hide the profile.
- Reorder profiles.
- Move a profile to Trash.
- Restore a profile from Trash.

### 10.4 Public Faculty behavior

- Published Faculty records render automatically on `/faculty` and the Home Faculty preview where applicable.
- Hidden and Trashed records never render publicly.
- The public site controls card size, typography, image crop, and responsive layout.
- Desktop, tablet, and mobile column behavior adapts automatically to the number of published profiles.
- A missing optional field is omitted without leaving an empty label or gap.

## 11. Class Program Management

### 11.1 Naming boundary

The CMS should use `class_programs` for public marketing content. This avoids a future collision with operational `classes`, `class_offerings`, `class_sessions`, registrations, and enrollments.

A Class program describes a public program category such as Level-Based Group Classes. It is not a scheduled class instance and does not own enrollment or payment records.

### 11.2 Class list

Each Class program card displays:

- Cover image.
- Program title.
- Age or placement label.
- Published or Hidden status.
- Edit action.
- Hide or Publish action.
- Move Up and Move Down actions.
- More menu containing Move to Trash.

The primary page action is Add Class.

### 11.3 Class program fields

| Field | Required | Notes |
| --- | --- | --- |
| Cover image | Yes for publication | Select from Media Library or upload a new image |
| Program title | Yes | Plain text |
| Age or placement label | Yes | Example: Ages 2½+ · Placement required |
| Description | Yes | Public summary |
| Features | Optional | Reorderable list of short facts |
| Visual tone | Yes | Approved preset, automatically assigned by default |
| Display order | Yes | Managed visually |
| Website visibility | Yes | Published, Hidden, or Trashed |

Approved visual tones are limited to the existing design-system presets. Arbitrary colors are not allowed.

### 11.4 Public Class behavior

- Published Class programs render automatically on `/classes` and the Home program preview.
- Hidden and Trashed Class programs do not render publicly.
- Calls to action remain controlled by the page template.
- Public card layout, colors, typography, and responsive behavior remain controlled by the website.
- Adding or removing a Class program must not modify schedules, registrations, or payments.

## 12. Page Section Management

### 12.1 Controlled sections

Page Sections are predefined visual components, not arbitrary content blocks. Each section exposes only fields that its public design can safely support.

Initial managed locations may include:

- Home Hero
- Home Video Feature
- Home Founder Quote
- Classes Hero
- Classes Video Feature
- Faculty Hero
- Faculty Video Feature
- About Hero
- About Founder Story
- About Video Feature

The exact launch list should be approved during implementation. Existing image and video references should be migrated first before optional new sections are introduced.

### 12.2 Approved section types

#### Hero Media

- Image or muted background video.
- Optional separate mobile media.
- Required poster or fallback image for video.
- Text remains controlled by the existing hero template unless specifically made editable.

#### Split Media and Text

- Image or user-controlled video with text.
- Approved Media Left or Media Right layout.
- Public template controls proportions and responsive stacking.

#### Video Feature

- User-controlled video with poster.
- Heading and short supporting copy.
- Optional call-to-action selected from an approved destination list.

#### Full-Width Visual

- Full-width image or muted decorative video.
- Minimal approved text.
- Strong overlay and contrast rules controlled by the public template.

### 12.3 Section editor fields

Fields vary by type but may include:

- Section label.
- Heading.
- Supporting text.
- Media type: Image or Video.
- Primary media.
- Optional mobile media.
- Optional video poster.
- Approved layout preset.
- Visible on Website.

The editor must show the expected media shape and behavior before the administrator opens the Media Library.

### 12.4 Video behavior by context

#### Decorative background video

- Muted.
- Looped only when appropriate.
- Plays inline.
- Uses a poster image.
- Never contains essential information.
- Falls back to a still image when reduced motion is requested, autoplay is blocked, data-saving behavior is active, or the video fails.

#### Content video

- Uses visible playback controls.
- Does not autoplay with sound.
- Requires captions or an equivalent transcript when spoken content is present.
- Uses a meaningful poster image.
- Is keyboard accessible.

Multiple content videos should not autoplay simultaneously.

## 13. Content Status and Publishing Model

The first release uses a simple status model:

- Published: visible on the public website.
- Hidden: saved but not visible publicly.
- Trashed: removed from normal Admin lists and recoverable.

Rules:

- New Faculty and Class records start Hidden.
- Editing a published record changes the public website only after Save Changes succeeds.
- Saving a Hidden record does not publish it automatically.
- Publishing requires all required fields and valid media.
- Core sections use Published or Hidden; deletion is restricted.
- The interface clearly states when a saved change is live.

The proof of concept should use Payload's native versions and Trash capabilities where they meet these requirements. Safe static fallback remains part of the production migration plan.

## 14. Proposed Content Model

The following model is conceptual. In the proof of concept it should be expressed as Payload Collections, Globals, Fields, relationships, access controls, and generated migrations. It must not be applied to the current Anna Dance Academy Supabase project.

### 14.1 `Images` and `Videos`

| Column | Purpose |
| --- | --- |
| `id` | Stable UUID |
| `kind` | `image` or `video` |
| `title` | Administrator-facing display name |
| `alt_text` | Accessible image description when applicable |
| `is_decorative` | Explicit decorative-image flag |
| `original_filename` | Original upload name for Admin reference |
| `storage_bucket` | Storage location identifier |
| `storage_path` | Immutable UUID-based object path |
| `mime_type` | Validated MIME type |
| `byte_size` | Stored file size |
| `width` | Pixel width when available |
| `height` | Pixel height when available |
| `duration_seconds` | Video duration when applicable |
| `poster_asset_id` | Optional image asset used as a video poster |
| `status` | `active` or `trashed` |
| `created_by` | Payload administrator ID |
| `created_at` | Creation timestamp |
| `updated_at` | Last metadata update timestamp |
| `trashed_at` | Soft-deletion timestamp |

### 14.2 `Faculty`

| Column | Purpose |
| --- | --- |
| `id` | Stable UUID |
| `slug` | Stable generated identifier |
| `name` | Public name |
| `title` | Public professional title |
| `introduction` | Public profile introduction |
| `profilePhoto` | Required relationship to Images for publication |
| `sort_order` | Public order |
| `status` | `published`, `hidden`, or `trashed` |
| `created_by` | Payload administrator ID |
| `updated_by` | Last Payload administrator ID |
| `created_at` | Creation timestamp |
| `updated_at` | Last update timestamp |
| `trashed_at` | Soft-deletion timestamp |

### 14.3 `class_programs`

| Column | Purpose |
| --- | --- |
| `id` | Stable UUID |
| `slug` | Stable generated identifier |
| `title` | Program title |
| `age_label` | Age, timing, or placement label |
| `description` | Public summary |
| `features` | Ordered short list |
| `cover_media_id` | Required image reference for publication |
| `tone` | Approved visual preset |
| `sort_order` | Public order |
| `status` | `published`, `hidden`, or `trashed` |
| `created_by` | Payload administrator ID |
| `updated_by` | Last Payload administrator ID |
| `created_at` | Creation timestamp |
| `updated_at` | Last update timestamp |
| `trashed_at` | Soft-deletion timestamp |

### 14.4 `page_sections`

| Column | Purpose |
| --- | --- |
| `id` | Stable UUID |
| `page_key` | Approved page identifier |
| `section_key` | Stable approved section identifier |
| `section_type` | Approved section component type |
| `label` | Optional eyebrow or section label |
| `heading` | Optional public heading |
| `body` | Optional public supporting copy |
| `media_kind` | `image` or `video` when flexible |
| `primary_media_id` | Main media reference |
| `mobile_media_id` | Optional mobile media reference |
| `poster_media_id` | Optional video poster reference |
| `layout_key` | Approved layout preset |
| `sort_order` | Order among approved flexible sections |
| `status` | `published` or `hidden` |
| `updated_by` | Last Payload administrator ID |
| `updated_at` | Last update timestamp |

Core sections should use a unique constraint on `page_key` and `section_key`.

### 14.5 Media usage reporting

A read-only Payload query, custom Admin view, or server-side query should return all references to a media asset across:

- Faculty portraits.
- Class covers.
- Section primary media.
- Section mobile media.
- Video posters.

This usage result powers deletion protection and the Used In display.

## 15. Authorization and Security

### 15.1 Initial roles

The proof of concept uses Payload authentication that is separate from the current Supabase student and administrator roles:

- Anonymous visitor: published CMS reads only.
- Payload administrator: full proof-of-concept CMS access.

A Payload `editor` role may be introduced later if content editing must be separated from CMS configuration and administrator management.

### 15.2 Authorization requirements

- Every Admin page verifies the authenticated user on the server.
- Every create, update, reorder, publish, hide, trash, restore, and upload operation verifies administrator access on the server.
- Every Payload Collection and Global has explicit access control.
- Public users can read only published content needed by the website.
- Authenticated non-admin users cannot create, update, or delete CMS content.
- Storage uploads and deletions are restricted to administrators.
- Supabase database credentials and S3 access keys are never exposed to browser code.
- Client-side hiding of controls is never treated as authorization.

### 15.3 File safety

- Use UUID-based storage paths rather than personal names or original filenames.
- Sanitize original filenames before displaying them in Admin.
- Validate MIME type, extension, size, and image/video metadata.
- Reject executable or unexpected file types.
- Prevent path traversal and object-path collisions.
- Do not store private student data or consent documents in the public website-media bucket.
- Do not infer photo/video consent merely because an administrator uploaded a file.

## 16. Storage Design

The proof of concept should use a dedicated bucket in the new Supabase project, conceptually named `payload-media`. Payload connects to it through a server-side S3-compatible storage adapter.

Suggested object structure:

```text
payload-media/
├── images/{asset-id}/original.ext
├── images/{asset-id}/web.webp
├── videos/{asset-id}/source.ext
├── videos/{asset-id}/web.mp4
└── posters/{asset-id}/poster.webp
```

The exact object set depends on the image optimization and video-processing decision. Public pages should use processed web renditions when available rather than original uploads.

Payload records remain the source of truth for status and relationships. Storage objects must not be treated as published merely because they exist. Supabase S3 access keys are server-only and the proof of concept must verify that media persists across redeployments.

## 17. Public-Site Integration

### 17.1 Content queries

Create server-side query functions for:

- Published Faculty profiles.
- Published Class programs.
- Published managed sections by page.
- Media records referenced by published content.

Public components receive normalized content and do not issue independent Payload requests from multiple nested components.

### 17.2 Caching and revalidation

- Cache published content for fast public rendering.
- Use separate cache groups for Faculty, Class programs, Page Sections, and media metadata.
- After a successful Admin save, revalidate only affected routes and data groups.
- Show a successful publish message only after the database write and revalidation request complete.
- Do not require a code deployment for normal CMS updates.

### 17.3 Failure behavior

- A failed Admin write leaves the currently published website unchanged.
- A failed media upload does not create a selectable active asset.
- Missing optional media produces a safe approved fallback.
- During migration, the current static records remain available as a temporary fallback.
- Public components reserve media aspect ratios to avoid layout shifts.

## 18. Migration Plan

### 18.1 Inventory

Create a verified inventory of current media and every public usage under:

- `public/images/`
- `public/videos/`
- `lib/site-data.ts`
- Public page components.
- CSS background-image rules.

### 18.2 Seed existing content

- Create Media records for approved existing public images and videos.
- Create Faculty records matching the current Faculty cards.
- Create Class program records matching the current four programs.
- Create Page Section records matching approved existing page media.
- Preserve existing display order and copy exactly during the initial migration.

### 18.3 Switch public reads

- Update public pages to read normalized CMS content.
- Keep a temporary static fallback during rollout.
- Verify that the public appearance is unchanged before enabling Admin editing.
- Remove obsolete static references only after the deployed CMS data and rollback plan are confirmed.

### 18.4 Enable editing

- Verify Payload administrator access in the intended CMS environment.
- Verify non-admin denial.
- Verify upload, selection, save, hide, restore, reorder, and deletion protection.
- Train the first administrator with a short task-based guide.

## 19. Accessibility Requirements

- All Admin controls must be operable by keyboard.
- Focus indicators must be clearly visible.
- Drag-and-drop reordering must have Move Up and Move Down alternatives.
- Form controls require visible labels.
- Validation errors must be associated with their fields.
- Color must not be the only indicator of Published, Hidden, or Trashed status.
- Image descriptions must be supported.
- Decorative images must be explicitly identifiable.
- Content videos with speech require captions or an equivalent transcript.
- Reduced-motion users receive static media instead of nonessential background animation.
- Touch targets should be at least 44 by 44 CSS pixels.

## 20. Performance Requirements

- Do not serve original full-resolution uploads when an optimized rendition exists.
- Lazy-load below-the-fold images and content videos.
- Do not preload multiple page videos.
- Load a poster before a content video is played.
- Use a mobile-specific hero media option only where it materially improves crop or transfer size.
- Keep background video short, compressed, muted, and nonessential.
- Avoid loading Admin-only JavaScript on public pages.
- Reuse media metadata rather than probing media dimensions on every request.

## 21. Error and Empty States

The system requires plain-language states for:

- No Faculty profiles yet.
- No Class programs yet.
- No images or videos uploaded yet.
- No media matches the search.
- File too large.
- Unsupported file type.
- Video is still processing.
- Video processing failed.
- Save failed.
- Media is currently in use.
- Administrator session expired.

Every recoverable error should provide one clear next action.

Example:

> This video could not be prepared for the website. Try a shorter MP4, or choose another file.

## 22. Auditability and Operations

The first release should record:

- Who created each content record.
- Who last changed each content record.
- Creation and update timestamps.
- Who uploaded each media asset.
- When an item was moved to Trash.

A full immutable audit-log table is recommended if multiple administrators or an `editor` role are introduced later.

Operational guidance should include:

- Recommended image shapes for each slot.
- Current upload limits.
- Supported video formats.
- How to hide rather than delete content.
- How to find where media is being used.
- How to restore an item from Trash.

## 23. Implementation Phases

### Phase 0 — Isolated Payload proof of concept

- Create the new project in the user-selected location.
- Pin Payload and framework versions.
- Create and connect a new Supabase project.
- Configure Payload PostgreSQL migrations against the new database only.
- Configure Supabase Storage through a server-only S3-compatible adapter.
- Create Payload administrator authentication, Images, and Faculty.
- Build and deploy a small Faculty preview page.
- Complete the proof-of-concept checklist in this document.

### Phase 1 — Architecture approval

- Document proof-of-concept results, limitations, and recurring costs.
- Decide whether Payload remains separate or is integrated into the existing website.
- Approve production authentication, database, Storage, backup, and migration boundaries.
- Do not modify the current website CMS architecture before this decision.

### Phase 2 — Faculty production migration

- Inventory and seed current Faculty content.
- Connect the existing Home and Faculty grids to published Payload Faculty records.
- Preserve current copy, order, imagery, layout, and static fallback during rollout.
- Verify desktop, tablet, and mobile output before enabling production editing.

### Phase 3 — Class Programs and media library

- Add Class Programs only after Faculty production behavior is stable.
- Add the approved Images and Videos navigation and validation experience.
- Confirm the phone-video transcoding decision before accepting unrestricted phone uploads.

### Phase 4 — Controlled Page Sections

- Add selected fixed sections as Payload Globals.
- Introduce Blocks only when controlled section creation and ordering are explicitly approved.
- Verify preview, caching, accessibility, and media fallback behavior.

## 24. Acceptance Criteria

### 24.1 Media Library

- An administrator can upload a valid image and see progress and a preview.
- An administrator can upload a supported video and see progress, processing state, and a poster.
- Invalid or oversized files produce a clear error and do not become active assets.
- Images and Videos are visibly separated.
- An administrator can search and filter media.
- An administrator can select existing media from a Faculty, Class, or Section form.
- The system shows every usage of a media asset.
- In-use media cannot be permanently deleted.
- A non-admin user cannot access media-management pages or operations.

### 24.2 Faculty

- Existing Faculty content is migrated without visible public changes.
- An administrator can add, edit, hide, publish, reorder, trash, and restore a Faculty profile.
- A Faculty portrait can be uploaded or selected from the Media Library.
- New Faculty records do not appear publicly until published.
- Published Faculty order is correct on Home and Faculty pages.
- Public Faculty cards remain responsive as the number of profiles changes.

### 24.3 Class programs

- Existing Class program content is migrated without visible public changes.
- An administrator can add, edit, hide, publish, reorder, trash, and restore a Class program.
- A Class cover can be uploaded or selected from the Media Library.
- New Class programs do not appear publicly until published.
- Published Class order is correct on Home and Classes pages.
- Marketing Class changes do not create or modify schedule, registration, or payment records.

### 24.4 Page Sections

- An administrator can edit only approved section fields.
- An administrator can select an image or video where the section supports both.
- An administrator can select a separate mobile visual where supported.
- Decorative video has a poster and a static reduced-motion fallback.
- Content video has controls and does not autoplay with sound.
- Hidden sections do not leave empty spacing.
- Public design remains controlled by the existing design system.

### 24.5 Quality

- `pnpm typecheck` passes.
- Relevant unit and authorization tests pass.
- Desktop and mobile browser verification passes for every changed public page and Admin workflow.
- Keyboard navigation and visible focus states pass for core Admin workflows.
- No unrelated account, Cal.com, Stripe, registration, or payment behavior changes.

## 25. Decisions Required Before Implementation

The following decisions should be approved before the related phase begins:

1. Should the Admin interface use English only or bilingual English and Chinese labels?
2. What is the maximum expected image size?
3. What is the maximum expected video duration and source-file size?
4. Must users be able to upload raw iPhone MOV or HEVC video without preparation?
5. If automatic video transcoding is required, which processing provider or background workflow will be used?
6. Which existing page sections should become editable in the first release?
7. Should page-section text be editable initially, or should the first release manage media only?
8. How long should Trash retain deleted records before permanent cleanup?
9. Is one Payload administrator role sufficient, or is a limited Payload `editor` role required?

## 26. Recommended Proof of Concept

The next deliverable is intentionally narrow and will be built outside this repository:

- One isolated Payload project.
- One new Supabase project for Payload PostgreSQL and Storage.
- One Payload administrator account.
- One Images upload collection.
- One Faculty collection with Name, Title, Introduction, Profile Photo, status, and order.
- One small Next.js Faculty preview page.
- Published, Hidden, ordering, Trash, and restore verification.
- Server-only storage credentials.
- Desktop and mobile browser verification.
- A deployed-preview persistence check.

Classes, Videos, Page Sections, production migration, automatic raw phone-video transcoding, and additional editor roles remain out of scope until the proof of concept passes and the production architecture is approved.
