export function VisitWebsiteNavLink() {
  return (
    <div className="visit-website-nav">
      <a
        className="nav__link visit-website-nav__link"
        href="/"
        rel="noopener noreferrer"
        target="_blank"
      >
        <span className="nav__link-label">Visit website</span>
        <span className="visit-website-nav__arrow" aria-hidden="true">
          ↗
        </span>
      </a>
    </div>
  )
}
