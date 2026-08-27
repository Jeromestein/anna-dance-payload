import type { Metadata } from "next";
import Link from "next/link";
import { ArrowIcon } from "@/components/arrow-icon";
import { CtaSection } from "@/components/cta-section";
import { PageHero } from "@/components/page-hero";
import { ProgramFaq } from "@/components/program-faq";
import { getPublicClasses } from "@/lib/classes";

export const metadata: Metadata = { title: "Classes" };
export const dynamic = "force-dynamic";

export default async function ClassesPage() {
  const classes = await getPublicClasses();

  return (
    <div className="classes-page">
      <PageHero
        eyebrow="Programs & training pathways"
        title="The right class starts with the dancer."
        description="We welcome young dancers ages 2½ and up. Placement is based on age, experience, readiness, goals, and schedule—with teacher guidance before enrollment."
        image="/images/classes/technique-fundamentals.jpg"
        imageClassName="page-hero-image-classes"
      />
      <section className="section-space page-shell">
        <div className="program-intro">
          <p className="eyebrow">Our programs</p>
          <h2 className="display-title">Strong foundations.<br /><em>Personal direction.</em></h2>
          <p>Age is one part of placement—not the whole answer. Mixed-age placement may be recommended when it best supports a student&apos;s learning and scheduling needs.</p>
        </div>
        <div className="program-list" role="region" aria-label="Class programs" tabIndex={0}>
          {classes.map((item, index) => (
            <article className="program-row" key={item.id}>
              <span className="program-index">0{index + 1}</span>
              <div className="program-image" style={{ backgroundImage: `url(${item.image})` }} />
              <div className="program-content">
                <span className="class-age">{item.age}</span>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
                <div className="program-content-footer">
                  <ul>
                    {item.features.map((feature) => <li key={feature}>{feature}</li>)}
                  </ul>
                  <Link href="/contact" className="program-action" aria-label={`Ask about ${item.title}`}>
                    <span>Ask about this class</span>
                    <ArrowIcon />
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="repertoire-section section-space">
        <div className="page-shell repertoire-layout">
          <div>
            <p className="eyebrow eyebrow-light">Styles & repertoire</p>
            <h2 className="display-title">Chinese roots.<br /><em>A living stage language.</em></h2>
          </div>
          <div className="repertoire-copy">
            <p className="lead">Repertoire rotates by term and is selected for each class&apos;s readiness and strengths.</p>
            <p>Students may explore Chinese classical dance, Dunhuang-inspired movement, and Chinese ethnic folk traditions such as Tibetan, Mongolian, Uyghur, Korean (Chaoxian), and Dai dance.</p>
            <p>For selected performance and competition works, Chinese dance may be thoughtfully combined with Jazz and Contemporary stage language. These are choreography tools—not a promise that every style is offered as a separate weekly class.</p>
            <div className="repertoire-tags" aria-label="Dance styles">
              <span>Chinese Classical</span><span>Ethnic Folk</span><span>Dunhuang</span><span>Long Silk</span><span>Fan Dance</span><span>Jazz & Contemporary Fusion</span>
            </div>
          </div>
        </div>
      </section>

      <section className="placement-section section-space">
        <div className="page-shell placement-layout">
          <div>
            <p className="eyebrow">How placement works</p>
            <h2 className="display-title">A thoughtful first step.</h2>
            <p>Before enrollment, a teacher speaks with the family and recommends the most suitable available class.</p>
          </div>
          <ol className="placement-steps">
            <li><span>01</span><div><h3>Tell us about your dancer</h3><p>Share age, prior experience, goals, preferred language, and availability.</p></div></li>
            <li><span>02</span><div><h3>Speak with a teacher</h3><p>We consider readiness and learning needs alongside age and schedule.</p></div></li>
            <li><span>03</span><div><h3>Receive a recommendation</h3><p>We suggest the best available Level-Based Group Class and next steps.</p></div></li>
          </ol>
        </div>
      </section>

      <ProgramFaq />
      <CtaSection />
    </div>
  );
}
