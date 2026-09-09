import type { Metadata } from "next";
import { CtaSection } from "@/components/cta-section";
import { FacultyCards } from "@/components/FacultyCards";
import { GalleryWall } from "@/components/GalleryWall";
import { getMediaGalleryBySlug } from "@/lib/gallery";
import { getPayloadStaffUser } from "@/lib/staff/auth";
import { PageHero } from "@/components/page-hero";
import { getPublicFaculty } from "@/lib/faculty";

export const metadata: Metadata = { title: "Faculty" };
export const dynamic = "force-dynamic";

export default async function FacultyPage() {
  const [faculty, gallery, staffUser] = await Promise.all([getPublicFaculty(), getMediaGalleryBySlug("faculty-interviews"), getPayloadStaffUser()]);

  return (
    <>
      <PageHero
        eyebrow="Founder & teaching artists"
        title="Artistic direction with a personal point of view."
        description="Anna Liu leads the Academy’s teaching and choreography, with teaching artists supporting selected classes, rehearsals, and performance projects as needs evolve each term."
        image="/images/faculty/grace-leung.jpg"
        imageClassName="page-hero-image-faculty"
      />
      <section className="section-space page-shell">
        <div className="program-intro faculty-intro">
          <p className="eyebrow">Meet the team</p>
          <h2 className="display-title">Founder-led.<br /><em>Thoughtfully supported.</em></h2>
          <p>Teaching assignments and projects vary by term. Families receive current class and instructor information during placement and enrollment.</p>
        </div>
        <FacultyCards canEdit={Boolean(staffUser)} members={faculty} variant="profiles" />
      </section>
      {gallery ? <GalleryWall gallery={gallery} sectionKey="faculty-interviews" canEdit={Boolean(staffUser)} /> : null}
      <CtaSection />
    </>
  );
}
