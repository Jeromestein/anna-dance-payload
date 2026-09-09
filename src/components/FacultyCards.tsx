import Link from 'next/link'
import { SectionEditLink } from '@/components/SectionEditLink'

import type { Faculty, Image } from '@/payload-types'

type FacultyCardsProps = {
  canEdit?: boolean
  emptyActionHref?: string
  emptyActionLabel?: string
  members: Faculty[]
  variant?: 'cards' | 'profiles'
  compact?: boolean
}

function getParagraphs(description: string) {
  return description.split(/\n\s*\n/).map((text) => text.trim()).filter((text) => text && text !== 'Dance Teacher Introduction')
}

function getSummary(description: string) {
  const text = getParagraphs(description).join(' ')
  if (text.length <= 240) return text
  const excerpt = text.slice(0, 240)
  const sentenceEnd = excerpt.lastIndexOf('. ')
  return sentenceEnd > 80 ? excerpt.slice(0, sentenceEnd + 1) : `${excerpt.slice(0, excerpt.lastIndexOf(' '))}…`
}

function getProfilePhoto(photo: Faculty['profilePhoto']): Image | null {
  return typeof photo === 'object' && photo !== null ? photo : null
}

export function FacultyCards({
  canEdit = false,
  emptyActionHref = '/admin/collections/faculty/create',
  emptyActionLabel = 'Add Faculty member',
  members,
  variant = 'cards',
  compact = false,
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
        {canEdit ? <Link className="primaryButton" href={emptyActionHref}>
          {emptyActionLabel}
        </Link> : null}
      </div>
    )
  }

  return (
    <>
      <SectionEditLink canEdit={canEdit} href="/admin/collections/faculty" label="Faculty" />
      <div
        aria-label="Faculty members"
        className={variant === 'profiles' ? 'facultyProfiles' : 'facultyGrid mobileCardRail'}
        role="list"
        tabIndex={variant === 'profiles' ? undefined : 0}
      >
        {members.map((member) => {
          const photo = getProfilePhoto(member.profilePhoto)
          const photoURL = photo?.sizes?.facultyCard?.url || photo?.url

          return (
            <article
              className={variant === 'profiles' ? 'facultyProfile' : 'facultyCard mobileCardRailItem'}
              id={`teacher-${member.id}`}
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
                <SectionEditLink canEdit={canEdit} href={`/admin/collections/faculty/${member.id}`} label={member.name} />
                {variant === 'profiles' ? <h3>{member.name}</h3> : null}
                <p className="facultyTitle">{member.title}</p>
                {variant === 'cards' ? <h3>{member.name}</h3> : null}
                <p className="facultySpecialties">{member.introduction}</p>
                {member.description ? (
                  <div className="facultyDescription">
                    {(compact ? [getSummary(member.description)] : getParagraphs(member.description)).map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                  </div>
                ) : null}
                {compact ? <Link className="facultyReadMore" href={`/faculty#teacher-${member.id}`}>Read full introduction <span aria-hidden="true">↗</span></Link> : null}
              </div>
            </article>
          )
        })}
      </div>
    </>
  )
}
