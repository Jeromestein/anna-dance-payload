import Link from 'next/link'

import { FacultyCards } from '@/components/FacultyCards'
import { getPayloadStaffUser } from '@/lib/staff/auth'
import { getPublicFaculty } from '@/lib/faculty'

export const dynamic = 'force-dynamic'

export default async function FacultyPreviewPage() {
  const [faculty, staffUser] = await Promise.all([getPublicFaculty(), getPayloadStaffUser()])

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
          {staffUser ? <Link className="primaryButton" href="/admin/collections/faculty">
            Edit Faculty
          </Link> : null}
        </div>
      </header>

      <FacultyCards canEdit={Boolean(staffUser)} members={faculty} />
    </div>
  )
}
