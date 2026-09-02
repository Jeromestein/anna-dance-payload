import Link from "next/link";
import { ArrowIcon } from "@/components/arrow-icon";
import { CtaSection } from "@/components/cta-section";
import { FacultyCards } from "@/components/FacultyCards";
import { GalleryWall } from "@/components/GalleryWall";
import { ProgramFaq } from "@/components/program-faq";
import { getPublicClasses } from "@/lib/classes";
import { getPublicFaculty } from "@/lib/faculty";
import { getMediaGalleryBySlug } from "@/lib/gallery";
import { getSocialProfiles } from "@/lib/social";
import "./home.css";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [classes, faculty, gallery, socialProfiles] = await Promise.all([
    getPublicClasses(),
    getPublicFaculty(),
    getMediaGalleryBySlug("home-studio"),
    getSocialProfiles(),
  ]);

  return (
    <>
      <section className="home-hero">
        <div className="hero-photo" />
        <video
          className="hero-video"
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          poster="/images/home/anna-dance-home-video-poster.jpg"
          aria-hidden="true"
          tabIndex={-1}
        >
          <source
            src="/videos/anna-dance-home-hero-mobile.mp4"
            type="video/mp4"
            media="(max-width: 900px)"
          />
          <source src="/videos/anna-dance-home-hero.mp4" type="video/mp4" />
        </video>
        <div className="hero-wash" />
        <div className="page-shell hero-content">
          <p className="eyebrow eyebrow-light">Bilingual dance education · Ages 2½+</p>
          <div className="hero-content-grid">
            <h1>Expert Guidance.<br />Individual Attention.<br /><em>A Colorful World of Dance.</em></h1>
            <div className="hero-copy-block">
              <p className="hero-copy">Our dance program brings Chinese dance together with Acro Dance, Jazz, K-pop, Contemporary, and other movement styles to create fresh, original choreography for performances, showcases, and competitions.</p>
              <p className="hero-copy">With colorful costumes, expressive props, and a wide range of movement experiences, each class opens a new world of dance for children. As they explore different styles, perform with beautiful costumes, and learn to use unique props, they discover more ways to express themselves—and more reasons to love dancing.</p>
              <p className="hero-copy">Through patient, professional instruction, we help every dancer build strong foundations, develop technique, grow in confidence, and shine on stage.</p>
              <div className="hero-actions">
                <Link href="/schedule#book" className="button button-light">Request placement <ArrowIcon /></Link>
                <Link href="/classes" className="hero-text-link">Explore programs</Link>
              </div>
            </div>
          </div>
        </div>
        <div className="hero-scroll"><span /> Scroll to discover</div>
      </section>

      {gallery ? (
        <GalleryWall
          gallery={gallery}
          sectionKey="home-studio"
          socialProfiles={socialProfiles}
        />
      ) : null}

      <section className="intro-section section-space">
        <div className="page-shell intro-grid">
          <div>
            <p className="eyebrow">Founder-led in Lutz, Florida</p>
            <h2 className="display-title">Training shaped around<br /><em>every dancer.</em></h2>
          </div>
          <div className="intro-copy">
            <p className="lead">Age is only one part of finding the right class.</p>
            <p>We consider each student’s experience, readiness, personality, goals, and schedule before recommending a placement. Small-group, bilingual instruction gives us room to teach with care and adapt choreography to the dancers in front of us.</p>
            <Link href="/about" className="text-link">Discover our approach <ArrowIcon /></Link>
          </div>
        </div>
        <div className="page-shell value-row" aria-label="Our values">
          <span><b>01</b> Bilingual instruction</span>
          <span><b>02</b> Small-group teaching</span>
          <span><b>03</b> Original choreography</span>
          <span><b>04</b> Performance pathways</span>
        </div>
      </section>

      <section className="academy-advantages section-space">
        <div className="page-shell section-heading-row">
          <div>
            <p className="eyebrow">Why Anna Dance Academy</p>
            <h2 className="display-title">Professional foundations.<br /><em>A personal spotlight.</em></h2>
          </div>
          <p className="section-side-copy">Thoughtful training, original choreography, and responsive guidance help each dancer build confidence without losing the joy of movement.</p>
        </div>
        <div className="advantage-grid page-shell" role="region" aria-label="Why families choose Anna Dance Academy" tabIndex={0}>
          <article>
            <span>01 · Performance</span>
            <h3>A spotlight for every child</h3>
            <p>Each student is given a <strong>solo performance opportunity</strong> at Academy recitals, building the confidence to be seen as an individual as well as part of a group.</p>
          </article>
          <article>
            <span>02 · Language</span>
            <h3>Bilingual excellence</h3>
            <p>English and Chinese instruction creates a welcoming bridge between <strong>professional dance training</strong> and cultural connection.</p>
          </article>
          <article>
            <span>03 · Foundations</span>
            <h3>Serious training, taught with joy</h3>
            <p>Age-appropriate exercises make technical correction, discipline, and strong foundations <strong>engaging for young dancers</strong>.</p>
          </article>
          <article>
            <span>04 · Artistry</span>
            <h3>East meets West</h3>
            <p>Original works may blend <strong>Chinese classical and traditional dance</strong> with ballet, jazz, and contemporary stage language.</p>
          </article>
          <article>
            <span>05 · Choreography</span>
            <h3>Created for the dancer</h3>
            <p>Music, movement, and feedback are shaped around the student instead of relying on a <strong>one-size-fits-all routine</strong>.</p>
          </article>
          <article>
            <span>06 · Growth</span>
            <h3>Personalized progress</h3>
            <p>Training plans respond to each child&apos;s ability, potential, goals, and pace, with <strong>teacher-guided placement</strong> before enrollment.</p>
          </article>
          <article>
            <span>07 · Performance support</span>
            <h3>Distinctive costumes, thoughtfully sourced</h3>
            <p>Families benefit from access to <strong>high-quality performance costumes</strong> through the Academy&apos;s established sourcing channels.</p>
          </article>
          <article>
            <span>08 · Communication</span>
            <h3>Direct, responsive guidance</h3>
            <p>Placement, class, and performance questions can be discussed directly with the teaching team for a <strong>clearer family experience</strong>.</p>
          </article>
        </div>
      </section>

      <section className="classes-preview section-space">
        <div className="page-shell section-heading-row">
          <div>
            <p className="eyebrow">Programs with purpose</p>
            <h2 className="display-title">Build foundations.<br /><em>Find your stage.</em></h2>
          </div>
          <Link href="/classes" className="text-link">Explore all programs <ArrowIcon /></Link>
        </div>
        <div className="class-grid page-shell" role="region" aria-label="Class programs" tabIndex={0}>
          {classes.map((item) => (
            <article className={`class-card ${item.tone}`} key={item.id}>
              <div className="class-card-image" style={{ backgroundImage: `url(${item.image})` }} />
              <div className="class-card-body">
                <span className="class-age">{item.age}</span>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
                <Link href="/classes" aria-label={`Learn more about ${item.title}`}><ArrowIcon /></Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="quote-section">
        <div className="quote-photo" />
        <div className="quote-panel">
          <span className="quote-kicker">Founder-led</span>
          <blockquote>Every child deserves training shaped around who they are—not a one-size-fits-all routine.</blockquote>
          <p>Anna Liu · Founder & Artistic Director</p>
          <Link href="/about" className="text-link text-link-light">Read Anna&apos;s story <ArrowIcon /></Link>
        </div>
      </section>

      <section className="faculty-preview section-space">
        <div className="page-shell section-heading-row">
          <div>
            <p className="eyebrow">Our teaching team</p>
            <h2 className="display-title">Founder-led.<br /><em>Thoughtfully supported.</em></h2>
          </div>
          <p className="section-side-copy">Anna leads the Academy’s artistic direction, with teaching artists joining selected classes, rehearsals, and performance projects as needs evolve each term.</p>
        </div>
        <div className="page-shell">
          <FacultyCards members={faculty} />
        </div>
      </section>

      <section className="pathway-section section-space">
        <div className="page-shell pathway-heading">
          <div>
            <p className="eyebrow">Competition pathway</p>
            <h2 className="display-title">Group training<br /><em>comes first.</em></h2>
          </div>
          <p>Competition solo and duet coaching is available only to students who are concurrently enrolled in a Level-Based Group Class. Group training builds the consistency, teamwork, and stage experience that individual competition work depends on.</p>
        </div>
        <div className="page-shell pathway-steps" aria-label="Competition training pathway">
          <article><span>01</span><h3>Placement</h3><p>A teacher recommends the best available group class after speaking with the family.</p></article>
          <article><span>02</span><h3>Group foundation</h3><p>Weekly 60-minute Level training develops technique, musicality, and stage awareness.</p></article>
          <article><span>03</span><h3>Personalized coaching</h3><p>Solo or duet works begin with at least ten 60-minute sessions and original choreography.</p></article>
        </div>
      </section>

      <ProgramFaq id="faq" />
      <CtaSection />
    </>
  );
}
