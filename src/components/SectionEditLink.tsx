import Link from 'next/link'

type SectionEditLinkProps = {
  canEdit?: boolean
  href: string
  label: string
}

export function SectionEditLink({ canEdit = false, href, label }: SectionEditLinkProps) {
  if (!canEdit) return null

  return (
    <div className="sectionEditControl">
      <Link
        aria-label={`Edit ${label} in the administrator`}
        className="galleryEditLink"
        href={href}
        rel="noopener noreferrer"
        target="_blank"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <path d="M12 8.75a3.25 3.25 0 1 0 0 6.5 3.25 3.25 0 0 0 0-6.5Z" />
          <path d="M19.1 13.5c.06-.49.06-1.01 0-1.5l1.62-1.27-1.75-3.03-1.91.77a7.6 7.6 0 0 0-2.6-1.5L14.18 5h-3.5l-.28 1.97a7.6 7.6 0 0 0-2.6 1.5L5.89 7.7l-1.75 3.03L5.76 12a6.4 6.4 0 0 0 0 1.5l-1.62 1.27 1.75 3.03 1.91-.77a7.6 7.6 0 0 0 2.6 1.5l.28 1.97h3.5l.28-1.97a7.6 7.6 0 0 0 2.6-1.5l1.91.77 1.75-3.03-1.62-1.27Z" />
        </svg>
        EDIT
      </Link>
    </div>
  )
}
