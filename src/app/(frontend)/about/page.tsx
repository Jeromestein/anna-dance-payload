import Link from 'next/link'

import { GalleryWall } from '@/components/GalleryWall'
import { getMediaGalleryBySlug } from '@/lib/gallery'

export const dynamic = 'force-dynamic'

export default async function AboutPage() {
  const gallery = await getMediaGalleryBySlug('about-academy')

  return (
    <div className="pocShell aboutPage">
      <header className="pocHeader aboutHeader">
        <div>
          <p className="eyebrow">About page test</p>
          <h1>A different page. A different gallery.</h1>
          <p className="lede">
            This page asks for the gallery with the reference “about-academy”. The homepage asks for
            “home-studio”, so editors can update the two collections independently.
          </p>
        </div>
        <Link className="headerLink" href="/">
          Back to homepage
        </Link>
      </header>

      <section className="panel aboutTestPanel">
        <p className="sectionLabel">Direct Next.js reference</p>
        <h2>Layout stays in code. Media stays editable.</h2>
        <p>
          The page controls where the section appears. Payload controls its heading, introduction,
          images, video, captions, visibility, and order.
        </p>
      </section>

      {gallery ? (
        <GalleryWall gallery={gallery} sectionKey="about-academy" />
      ) : (
        <section className="emptyState aboutGalleryEmptyState">
          <p className="sectionLabel">Gallery not found</p>
          <h2>Create the “about-academy” Media Gallery</h2>
          <Link className="primaryButton" href="/admin/collections/media-galleries/create">
            Create Media Gallery
          </Link>
        </section>
      )}
    </div>
  )
}
