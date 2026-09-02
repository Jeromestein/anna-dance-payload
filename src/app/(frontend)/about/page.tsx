import type { Metadata } from "next";
import { CtaSection } from "@/components/cta-section";
import { GalleryWall } from "@/components/GalleryWall";
import { PageHero } from "@/components/page-hero";
import { getMediaGalleryBySlug } from "@/lib/gallery";
import { getSocialProfiles } from "@/lib/social";
import { getPayloadStaffUser } from "@/lib/staff/auth";

export const metadata: Metadata = { title: "About" };
export const dynamic = "force-dynamic";

export default async function AboutPage() {
  const [gallery, socialProfiles, staffUser] = await Promise.all([
    getMediaGalleryBySlug("about-academy"),
    getSocialProfiles(),
    getPayloadStaffUser(),
  ]);

  return (
    <>
      <PageHero
        eyebrow="Our founder-led story"
        title="Tradition, shaped around the dancer."
        description="Anna Dance Academy brings Chinese dance traditions into a warm, bilingual environment where placement, teaching, and choreography begin with the child in front of us."
        image="/images/branding/anna-dance-academy-red-dress-wide-1536x864.webp"
        mobileImage="/images/branding/anna-dance-academy-red-dress-portrait-768x1024.webp"
        imageClassName="page-hero-image-about"
        heroClassName="page-hero-about"
      />
      <section className="story-section section-space">
        <div className="page-shell story-grid">
          <div className="story-number">01</div>
          <div>
            <p className="eyebrow">Why Anna began</p>
            <h2 className="display-title">A dream built on<br /><em>individual attention.</em></h2>
          </div>
          <div className="story-copy">
            <p className="lead">Every child deserves more than a routine chosen from a shelf.</p>
            <p>Anna founded the Academy to create training that responds to each dancer’s foundation, musicality, personality, interests, and goals. Repertoire is selected and choreography is created or adapted for the students who will perform it.</p>
            <p>That approach allows Chinese classical and ethnic folk traditions to remain culturally rooted while becoming engaging, expressive, and stage-ready for today’s local dancers and audiences.</p>
          </div>
        </div>
      </section>

      <section className="founder-section section-space">
        <div className="page-shell founder-profile">
          <div className="founder-portrait" role="img" aria-label="Anna Liu in a ballet portrait" />
          <div className="founder-copy">
            <p className="eyebrow">Meet our director</p>
            <h2 className="display-title">Anna Liu</h2>
            <p className="founder-role">Founder & Artistic Director · Choreographer · Dance Educator</p>
            <p>Anna holds a bachelor&apos;s degree in Dance Education and Dance Performance and brings more than 15 years of experience in teaching, choreography, performance, artistic direction, and student development.</p>
            <p>Her work connects strong technical training with creativity, cultural storytelling, confidence, and meaningful opportunities to perform.</p>
            <div className="achievement-grid">
              <article><span>2026</span><p><em>The Dance of the Cloud Fae</em> earned Top 12 in the YAGP Chicago Small Ensemble category.</p></article>
              <article><span>Choreography</span><p>Recipient of the Best Choreographer Award at the International Taoli World Competition.</p></article>
              <article><span>2025</span><p>Artistic Director of the dance drama <em>Jasmine Flower</em> at Tampa&apos;s Straz Center.</p></article>
            </div>
          </div>
        </div>
      </section>

      <section className="credentials-section section-space">
        <div className="page-shell credentials-heading">
          <div>
            <p className="eyebrow">Training, leadership &amp; recognition</p>
            <h2 className="display-title">Experience behind<br /><em>the artistry.</em></h2>
          </div>
          <p>Anna&apos;s work connects Chinese dance heritage, Western training systems, large-scale stage production, and individualized coaching for young performers.</p>
        </div>

        <div className="credential-highlights page-shell" aria-label="Anna Liu career highlights">
          <article><strong>15+</strong><span>Years in dance education, choreography, and artistic direction</span></article>
          <article><strong>Top 12</strong><span>YAGP Chicago Small Ensemble · 2026</span></article>
          <article><strong>Best</strong><span>Choreographer Award · International Taoli World Competition</span></article>
          <article><strong>2</strong><span>Major productions directed at the Straz Center and Hard Rock Live</span></article>
        </div>

        <div className="credential-grid page-shell" role="region" aria-label="Anna Liu credentials and artistic background" tabIndex={0}>
          <article>
            <span>01 · Artistic lineage</span>
            <h3>Dunhuang dance heritage</h3>
            <p>Anna trained as a protégé of <strong>Professor Gao Jinrong</strong>, a foundational figure in Chinese Dunhuang dance, carrying that artistic lineage into contemporary teaching and choreography.</p>
          </article>
          <article>
            <span>02 · East–West training</span>
            <h3>Global perspective</h3>
            <p>Her studies include training at New York&apos;s <strong>Joffrey Ballet School</strong> and advanced study at the <strong>University of Pennsylvania</strong>, connecting Eastern artistry with Western technical systems.</p>
          </article>
          <article>
            <span>03 · Industry connection</span>
            <h3>A recognized training center</h3>
            <p>Anna Dance Academy is a designated training center for the <strong>China Fengwu Dance Education Research Center</strong>.</p>
          </article>
          <article>
            <span>04 · Stage leadership</span>
            <h3>Productions with scale</h3>
            <p>Anna served as Artistic Director of <strong>Jasmine Flower</strong> at the Straz Center in 2025 and General Director of the <strong>2026 Chinese New Year Gala</strong> at Hard Rock Live.</p>
          </article>
          <article>
            <span>05 · Competition results</span>
            <h3>Training that reaches the stage</h3>
            <p>Her work includes a YAGP Chicago Top 12 Small Ensemble result, a <strong>Best Choreographer Award</strong>, and state-championship experience in high school cheerleading.</p>
          </article>
          <article>
            <span>06 · Progressive system</span>
            <h3>Precision with confidence</h3>
            <p>Anna&apos;s approach combines detailed technical correction, disciplined foundations, and <strong>psychological empowerment</strong> to help dancers grow with lasting confidence.</p>
          </article>
        </div>

        <div className="expertise-row page-shell" aria-label="Anna Liu areas of expertise">
          <span>Chinese Classical &amp; Dunhuang Dance</span>
          <span>Ballet Training Systems</span>
          <span>K-Pop &amp; Urban Dance</span>
          <span>Choreography &amp; Competition Coaching</span>
        </div>
      </section>

      {gallery ? (
        <GalleryWall
          canEdit={Boolean(staffUser)}
          gallery={gallery}
          sectionKey="about-academy"
          socialProfiles={socialProfiles}
        />
      ) : null}

      <section className="values-section section-space">
        <div className="page-shell">
          <p className="eyebrow eyebrow-light">How we teach</p>
          <div className="values-grid" role="region" aria-label="Academy values" tabIndex={0}>
            <article><span>01</span><h3>Individualized by design</h3><p>Placement and choreography are guided by each dancer&apos;s readiness, foundation, interests, and goals.</p></article>
            <article><span>02</span><h3>Culture in motion</h3><p>Students explore Chinese classical and rotating ethnic folk traditions through engaging, age-appropriate teaching.</p></article>
            <article><span>03</span><h3>Built for the stage</h3><p>Strong foundations, group training, original choreography, and performance experience grow together.</p></article>
            <article><span>04</span><h3>Bilingual and welcoming</h3><p>Instruction in English and Chinese helps students and families feel understood throughout the learning process.</p></article>
          </div>
        </div>
      </section>
      <CtaSection />
    </>
  );
}
