import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: "Website and program terms for Anna Dance Academy families.",
};

const effectiveDate = "August 17, 2026";

export default function TermsPage() {
  return (
    <article className="legal-page">
      <header className="legal-hero legal-hero-terms">
        <div className="page-shell legal-hero-inner">
          <p className="eyebrow">Website and program information</p>
          <h1>Terms of Use</h1>
          <p className="legal-summary">
            These terms govern use of the Anna Dance Academy website and explain
            the general conditions that apply when families inquire about our
            programs or use our online services.
          </p>
          <p className="legal-date">Effective and last updated: {effectiveDate}</p>
        </div>
      </header>

      <div className="page-shell legal-layout">
        <aside className="legal-sidebar" aria-label="Terms of use contents">
          <p>On this page</p>
          <nav>
            <a href="#agreement">Agreement</a>
            <a href="#families">Parents and guardians</a>
            <a href="#programs">Programs and placement</a>
            <a href="#enrollment">Enrollment information</a>
            <a href="#attendance">Attendance and makeups</a>
            <a href="#competition">Competition training</a>
            <a href="#safety">Safety and conduct</a>
            <a href="#contact">Contact us</a>
          </nav>
        </aside>

        <div className="legal-content">
          <section className="legal-callout" aria-labelledby="important-title">
            <p className="eyebrow" id="important-title">Important enrollment notice</p>
            <p>
              These website terms are not a participation waiver or a complete
              enrollment contract. Before payment or participation, families will
              receive the applicable term dates, lesson count, fees, enrollment
              policies, and any required waiver or authorization. Those signed or
              checkout terms control if they conflict with this page.
            </p>
          </section>

          <section id="agreement">
            <h2>1. Agreement to these terms</h2>
            <p>
              By accessing this website, submitting a form, booking a consultation,
              creating an account, or using another online feature, you agree to
              these Terms of Use and acknowledge our <Link href="/privacy">Privacy Policy</Link>.
              If you do not agree, do not use the website or submit information.
            </p>
          </section>

          <section id="families">
            <h2>2. Parents, guardians, and student accounts</h2>
            <p>
              Online inquiries, bookings, accounts, and enrollment actions for a
              minor student must be completed or authorized by the student&apos;s parent
              or legal guardian. By acting for a minor, you represent that you have
              authority to provide the information and make the selections submitted.
              Children under 13 may not submit personal information directly through
              this website.
            </p>
            <p>
              You are responsible for providing accurate, current information,
              maintaining the confidentiality of account credentials, and notifying
              us promptly of suspected unauthorized account use.
            </p>
          </section>

          <section id="programs">
            <h2>3. Programs, ages, and placement</h2>
            <p>
              Anna Dance Academy welcomes young dancers ages 2½ and up. Age is only
              one part of placement. Recommendations may also consider experience,
              readiness, learning goals, maturity, and family schedule. Mixed-age
              placement may be used when appropriate.
            </p>
            <p>
              Program descriptions are informational. Class availability, repertoire,
              schedule, instructor assignments, performance opportunities, and
              enrollment requirements may change by term. Submitting an inquiry,
              booking a consultation, or creating an account does not guarantee
              placement, enrollment, a particular instructor, or participation in
              a performance or competition.
            </p>
          </section>

          <section id="enrollment">
            <h2>4. Enrollment, tuition, and term details</h2>
            <p>
              Current Level-Based Group Classes are generally 60 minutes once per
              week and are enrolled by term. A term may include approximately 10–16
              lessons. The exact dates, lesson count, included closures, tuition,
              and payment deadline for a particular offering will be shown in its
              registration materials.
            </p>
            <p>
              Competition solo and duet coaching is generally purchased as a minimum
              package of ten 60-minute sessions paid in advance. Additional sessions
              may be recommended based on readiness and competition goals.
            </p>
            <p>
              Unless the applicable registration materials state otherwise, tuition
              and lesson fees are non-refundable, except where required by law.
              Term-specific rules will address withdrawals, Academy cancellations,
              weather closures, medical circumstances, and any separate competition,
              costume, travel, choreography, or event costs before payment is due.
            </p>
          </section>

          <section id="attendance">
            <h2>5. Attendance and makeup classes</h2>
            <p>
              Consistent attendance supports safe progress and group choreography.
              Under the Academy&apos;s current general policy, a student may be eligible
              for up to two makeup opportunities in a term. Makeups are not guaranteed
              and may depend on timely notice, available space, student level, and the
              rules published for that term. Missed classes beyond the applicable
              allowance are not refundable.
            </p>
            <p>
              The notice period, expiration of makeup eligibility, exceptions, and
              treatment of Academy-cancelled classes will be stated in the applicable
              enrollment materials.
            </p>
          </section>

          <section id="competition">
            <h2>6. Competition solo and duet training</h2>
            <p>
              Competition solo or duet coaching is available only to students who
              are concurrently enrolled in an Academy Level-Based Group Class. Group
              training supplies the regular practice, teamwork, stage awareness, and
              performance foundation needed for competition work.
            </p>
            <p>
              Technique &amp; Fundamentals training is strongly recommended for
              competition students but is not currently a mandatory enrollment
              condition. The Academy does not guarantee selection, placement, scores,
              awards, or any particular competition outcome.
            </p>
          </section>

          <section id="safety">
            <h2>7. Health, safety, and conduct</h2>
            <p>
              Dance, conditioning, rehearsals, performances, and competitions involve
              physical exertion and risk of injury. Families must provide relevant
              information requested for safe participation, follow instructor and
              facility rules, and complete any required participation waiver or
              emergency authorization before a student participates. These website
              terms do not replace those documents.
            </p>
            <p>
              Students and accompanying adults must behave respectfully and must not
              endanger, harass, disrupt, or interfere with others. The Academy may
              limit or end access to a class, event, account, or website feature when
              reasonably necessary for safety, misconduct, nonpayment, policy
              violations, or operational integrity, subject to applicable law and
              the controlling enrollment agreement.
            </p>
          </section>

          <section>
            <h2>8. Optional media authorization</h2>
            <p>
              Permission to use an identifiable student&apos;s photo, video, or voice for
              public promotion is separate and optional. Declining public promotional
              use will not prevent a student from inquiring, enrolling, or participating.
              Media preferences are governed by the separate authorization and our
              <Link href="/privacy"> Privacy Policy</Link>.
            </p>
          </section>

          <section>
            <h2>9. Website content and acceptable use</h2>
            <p>
              Website text, graphics, logos, photographs, videos, and other content
              are owned by or licensed to Anna Dance Academy and are protected by
              applicable intellectual property laws. You may view and use the website
              for personal, noncommercial purposes related to Academy services.
            </p>
            <p>
              You may not misuse the website, attempt unauthorized access, interfere
              with security, submit unlawful or harmful material, copy content for
              commercial use, or use student images or information without permission.
            </p>
          </section>

          <section>
            <h2>10. Third-party services</h2>
            <p>
              The website may use or link to third-party services for authentication,
              scheduling, email delivery, maps, and payment processing. Those services
              are governed by their own terms and privacy policies. We are not
              responsible for third-party services we do not control, to the extent
              permitted by law.
            </p>
          </section>

          <section>
            <h2>11. Disclaimers and limitation of liability</h2>
            <p>
              The website is provided on an “as available” basis for general
              information. We work to keep information accurate, but do not warrant
              that the website will always be uninterrupted, error-free, or current.
              To the fullest extent permitted by law, Anna Dance Academy will not be
              liable for indirect, incidental, special, consequential, or punitive
              damages arising solely from use of, or inability to use, the website.
            </p>
            <p>
              Nothing in these terms excludes liability or rights that cannot lawfully
              be excluded. Any separate signed enrollment agreement or participation
              waiver applies according to its own terms and applicable law.
            </p>
          </section>

          <section>
            <h2>12. Governing law and changes</h2>
            <p>
              These terms are governed by the laws of the State of Florida, without
              regard to conflict-of-law principles. We may update these terms as our
              services or policies change. The revised version will be posted here
              with a new effective date. Continued website use after an update means
              you accept the revised website terms.
            </p>
          </section>

          <section id="contact">
            <h2>13. Contact us</h2>
            <address className="legal-contact">
              <strong>Anna Dance Academy</strong><br />
              19421 Sandy Springs Cir<br />
              Lutz, FL 33558<br />
              <a href="mailto:annadanceacademy@gmail.com">annadanceacademy@gmail.com</a><br />
              <a href="tel:+17014009213">701-400-9213</a>
            </address>
          </section>
        </div>
      </div>
    </article>
  );
}
