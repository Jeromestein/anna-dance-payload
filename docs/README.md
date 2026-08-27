# Project Documentation

This directory preserves the planning, design, operations, and content documents migrated from the
original Anna Dance Academy repository. The documents are organized by purpose so the root
`README.md` can remain focused on the current application.

Unless a document explicitly says otherwise, files under `project/` describe the original website
or an earlier planning stage. They are useful historical references, but the current code and root
README remain authoritative for the Payload implementation.

## Project planning and design

- [Business content and website update plan](project/business-content-and-website-update-plan.md)
  — page-by-page content, media, and business update planning.
- [Lightweight CMS design](project/lightweight-cms-design.md) — the original CMS requirements,
  field definitions, and implementation checklist.
- [Legacy project status and roadmap](project/legacy-project-status-and-roadmap.md) — the
  pre-Payload implementation audit and longer-term product roadmap.
- [Legacy design notes](project/legacy-design-notes.md) — the original visual and page-design
  direction.
- [Original project README](project/original-project-readme.md) — setup and architecture notes from
  the former standalone Next.js/Supabase repository.

## Operations

- [Authentication testing](operations/auth-testing.md) — manual Supabase authentication and
  account-flow test procedures.

## Content and media references

- [Media library notes](content/media-library-readme.md) — organization and usage notes for the
  original source-media library.
- [Anna Liu biography](content/anna-liu-biography.md)
- [Anna Liu credentials and advantages](content/anna-liu-credentials-and-advantages.md)
- [Promotional video overlay copy](content/promotional-video-overlay.md)
- [Why Anna Dance Academy](content/why-anna-dance-academy.md)
- [Class image notes](../public/images/classes/README.md)

## Original source material

- [Anna Liu biography — Apple Pages source](source-material/anna-liu-biography.pages)

The full-resolution photo and video archive is intentionally not stored in this Git repository.
Website-ready assets live in `public/`, while Payload-managed media is stored through the configured
S3-compatible storage service.
