import Link from 'next/link'

import type { Faculty, Image } from '@/payload-types'

type FacultyCardsProps = {
  emptyActionHref?: string
  emptyActionLabel?: string
  members: Faculty[]
}

function getProfilePhoto(photo: Faculty['profilePhoto']): Image | null {
  return typeof photo === 'object' && photo !== null ? photo : null
}

export function FacultyCards({
  emptyActionHref = '/admin/collections/faculty/create',
  emptyActionLabel = 'Add Faculty member',
  members,
}: FacultyCardsProps) {
  if (members.length === 0) {
    return (
      <div className="emptyState facultyEmptyState">
        <p className="sectionLabel">No public profiles yet</p>
        <h3>Add and publish the first Faculty member</h3>
        <p>
          Create a profile in the CMS, choose a photo, publish it, and turn on “Show on website.”
          The homepage will update automatically.
        </p>
        <Link className="primaryButton" href={emptyActionHref}>
          {emptyActionLabel}
        </Link>
      </div>
    )
  }

  return (
    <div
      aria-label="Faculty members"
      className="facultyGrid mobileCardRail"
      role="list"
      tabIndex={0}
    >
      {members.map((member) => {
        const photo = getProfilePhoto(member.profilePhoto)
        const photoURL = photo?.sizes?.facultyCard?.url || photo?.url

        return (
          <article
            className="facultyCard mobileCardRailItem"
            key={member.id}
            role="listitem"
          >
            <div className="facultyPhotoFrame">
              {photoURL ? (
                // Payload serves local and S3-backed files through the same stored URL.
                // eslint-disable-next-line @next/next/no-img-element
                <img alt={photo.altText} src={photoURL} />
              ) : (
                <div className="photoPlaceholder">Photo unavailable</div>
              )}
            </div>
            <div className="facultyContent">
              <p className="facultyTitle">{member.title}</p>
              <h3>{member.name}</h3>
              <p className="facultySpecialties">{member.introduction}</p>
              {member.description ? (
                <p className="facultyDescription">{member.description}</p>
              ) : null}
            </div>
          </article>
        )
      })}
    </div>
  )
}
