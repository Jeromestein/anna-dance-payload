import Link from 'next/link'

const completedItems = [
  'Payload 3.88.0 and Next.js 16.3.3 are pinned',
  'Images media library is configured',
  'Faculty fields and safe publishing controls are configured',
  'Supabase Storage adapter is server-only and opt-in',
]

const pendingItems = [
  'Create the isolated Supabase project',
  'Add its PostgreSQL and S3 credentials',
  'Create the first Payload administrator',
  'Test image upload and the complete Faculty workflow',
]

export default function HomePage() {
  return (
    <div className="pocShell">
      <header className="pocHeader">
        <div>
          <p className="eyebrow">Anna Dance Academy</p>
          <h1>Lightweight CMS proof of concept</h1>
          <p className="lede">
            A safe, isolated workspace for testing teacher profiles and reusable website photos
            before connecting anything to the current website.
          </p>
        </div>
        <span className="statusPill">Local setup</span>
      </header>

      <main className="pocGrid">
        <section className="panel primaryPanel">
          <p className="sectionLabel">Try the workflow</p>
          <h2>Simple content editing, fixed website design</h2>
          <p>
            Editors fill in Name, Title, Introduction, and Profile photo. The preview keeps the
            card layout and responsive behavior under developer control.
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
          <p className="sectionLabel">Needs the new Supabase project</p>
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
    </div>
  )
}
