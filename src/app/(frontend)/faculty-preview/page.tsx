import Link from 'next/link'
import { getPayload } from 'payload'

import type { Faculty, Image } from '@/payload-types'
import config from '@/payload.config'

export const dynamic = 'force-dynamic'

function getProfilePhoto(photo: Faculty['profilePhoto']): Image | null {
  return typeof photo === 'object' && photo !== null ? photo : null
}

export default async function FacultyPreviewPage() {
  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'faculty',
    depth: 1,
    draft: false,
    limit: 100,
    overrideAccess: false,
    sort: '_order',
  })

  return (
    <div className="previewShell">
      <header className="previewHeader">
        <div>
          <p className="eyebrow">Website preview</p>
          <h1>Faculty</h1>
          <p className="lede">
            Only profiles that are published and marked “Show on website” appear here.
          </p>
        </div>
        <div className="buttonRow">
          <Link className="secondaryButton" href="/">
            POC overview
          </Link>
          <Link className="primaryButton" href="/admin/collections/faculty">
            Edit Faculty
          </Link>
        </div>
      </header>

      {result.docs.length > 0 ? (
        <section aria-label="Faculty members" className="facultyGrid">
          {result.docs.map((member) => {
            const photo = getProfilePhoto(member.profilePhoto)

            return (
              <article className="facultyCard" key={member.id}>
                <div className="facultyPhotoFrame">
                  {photo?.url ? (
                    // Payload serves local and S3-backed files through the same stored URL.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img alt={photo.altText} src={photo.url} />
                  ) : (
                    <div className="photoPlaceholder">Photo unavailable</div>
                  )}
                </div>
                <div className="facultyContent">
                  <p className="facultyTitle">{member.title}</p>
                  <h2>{member.name}</h2>
                  <p>{member.introduction}</p>
                </div>
              </article>
            )
          })}
        </section>
      ) : (
        <section className="emptyState">
          <p className="sectionLabel">No public profiles yet</p>
          <h2>Add and publish the first Faculty member</h2>
          <p>
            Create a profile in the CMS, choose a photo, publish it, and turn on “Show on
            website.” The new card will use this layout automatically.
          </p>
          <Link className="primaryButton" href="/admin/collections/faculty/create">
            Add Faculty member
          </Link>
        </section>
      )}
    </div>
  )
}
