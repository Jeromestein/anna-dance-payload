import Link from 'next/link'

import { FacultyCards } from '@/components/FacultyCards'
import { GalleryWall } from '@/components/GalleryWall'
import { getPublicFaculty } from '@/lib/faculty'
import { getGalleryForPlacement } from '@/lib/gallery'

export const dynamic = 'force-dynamic'

const completedItems = [
  'Payload 3.88.0 and Next.js 16.3.3 are pinned',
  'The isolated Supabase database is connected',
  'The Payload administrator is created and verified',
  'Faculty fields and publishing controls are ready',
  'Images and Videos are stored in the isolated Supabase Storage bucket',
  'Reusable Media Galleries and fixed page placements are ready',
]

const pendingItems = [
  'Connect the reserved Faculty, Classes, and About placements to their page routes',
  'Test reordering, hiding, Trash, and restore',
  'Deploy an isolated preview and confirm media persistence',
]

export default async function HomePage() {
  const [faculty, gallery] = await Promise.all([
    getPublicFaculty(),
    getGalleryForPlacement('homepageAfterFaculty'),
  ])

  return (
    <div className="pocShell">
      <header className="pocHeader">
        <div>
          <p className="eyebrow">Anna Dance Academy</p>
          <h1>Lightweight CMS proof of concept</h1>
          <p className="lede">
            This homepage now contains a real Faculty section. Editors manage teacher content in
            Payload while Next.js keeps the layout, colors, and responsive behavior controlled.
          </p>
        </div>
        <span className="statusPill">Connected POC</span>
      </header>

      <main className="pocGrid">
        <section className="panel primaryPanel">
          <p className="sectionLabel">Try the workflow</p>
          <h2>Simple content editing, fixed website design</h2>
          <p>
            Editors fill in Name, Title, Specialties, Description, and Profile photo. The preview
            keeps the card layout and responsive behavior under developer control.
          </p>
          <div className="buttonRow">
            <Link className="primaryButton" href="/admin">
              Open CMS admin
            </Link>
            <Link className="secondaryButton" href="/faculty-preview">
              View Faculty preview
            </Link>
          </div>
        </section>

        <section className="panel">
          <p className="sectionLabel">Ready in code</p>
          <ul className="checkList">
            {completedItems.map((item) => (
              <li key={item}>
                <span aria-hidden="true">✓</span>
                {item}
              </li>
            ))}
          </ul>
        </section>

        <section className="panel pendingPanel">
          <p className="sectionLabel">Next test steps</p>
          <ul className="numberList">
            {pendingItems.map((item, index) => (
              <li key={item}>
                <span aria-hidden="true">{index + 1}</span>
                {item}
              </li>
            ))}
          </ul>
        </section>

        <section className="panel boundaryPanel">
          <p className="sectionLabel">Isolation boundary</p>
          <h2>The existing Anna Dance site remains untouched</h2>
          <p>
            This project has its own repository, Payload administrator, database connection, and
            media credentials. It must never use the current production Supabase project.
          </p>
        </section>
      </main>

      <section aria-labelledby="homepage-faculty-heading" className="homepageFacultySection">
        <div className="facultySectionHeader">
          <div>
            <p className="sectionLabel">Our teaching team</p>
            <h2 id="homepage-faculty-heading">
              Founder-led.
              <br />
              <em>Thoughtfully supported.</em>
            </h2>
          </div>
          <p className="facultySectionCopy">
            Anna leads the Academy’s artistic direction, with teaching artists joining selected
            classes, rehearsals, and performance projects as needs evolve each term.
          </p>
        </div>

        <FacultyCards members={faculty} />
      </section>

      {gallery ? <GalleryWall gallery={gallery} placement="homepage-after-faculty" /> : null}
    </div>
  )
}
