import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Anna Dance Academy collects, uses, and protects family and student information.",
};

const effectiveDate = "August 17, 2026";

export default function PrivacyPage() {
  return (
    <article className="legal-page">
      <header className="legal-hero">
        <div className="page-shell legal-hero-inner">
          <p className="eyebrow">Family privacy</p>
          <h1>Privacy Policy</h1>
          <p className="legal-summary">
            This policy explains how Anna Dance Academy collects, uses, shares,
            and protects information when families use our website, contact us,
            book a consultation, or create an account.
          </p>
          <p className="legal-date">Effective and last updated: {effectiveDate}</p>
        </div>
      </header>

      <div className="page-shell legal-layout">
        <aside className="legal-sidebar" aria-label="Privacy policy contents">
          <p>On this page</p>
          <nav>
            <a href="#scope">Scope</a>
            <a href="#information">Information we collect</a>
            <a href="#use">How we use information</a>
            <a href="#children">Children&apos;s privacy</a>
            <a href="#media">Photos and videos</a>
            <a href="#sharing">How we share information</a>
            <a href="#choices">Your choices</a>
            <a href="#contact">Contact us</a>
          </nav>
        </aside>

        <div className="legal-content">
          <section className="legal-callout" aria-labelledby="parent-notice-title">
            <p className="eyebrow" id="parent-notice-title">Notice for parents and guardians</p>
            <p>
              Our programs serve children, but our website forms, booking tools,
              accounts, and enrollment communications are intended to be used by
              a parent, legal guardian, or other authorized adult. A child under
              13 should not submit personal information through this website.
            </p>
          </section>

          <section id="scope">
            <h2>1. Scope</h2>
            <p>
              This Privacy Policy applies to the Anna Dance Academy website and
              the online services linked from it. It does not replace any separate
              enrollment agreement, participation waiver, emergency authorization,
              or optional photo and video release that a family may receive.
            </p>
          </section>

          <section id="information">
            <h2>2. Information we collect</h2>
            <p>Depending on how you interact with us, we may collect:</p>
            <ul>
              <li><strong>Parent or guardian details,</strong> such as name, email address, phone number, and relationship to the student.</li>
              <li><strong>Student details,</strong> such as name, age, dance experience, interests, goals, availability, and placement information provided by an adult.</li>
              <li><strong>Inquiry and booking details,</strong> including the program of interest, messages, consultation selections, and communications with us.</li>
              <li><strong>Account information,</strong> including an email address, profile details, authentication records, and account preferences. Passwords are handled by our authentication provider and are not visible to Academy staff.</li>
              <li><strong>Enrollment and consent records,</strong> when those features are offered, including class selection, term details, signed policy versions, and media preferences.</li>
              <li><strong>Payment and transaction details,</strong> when online payment is offered. Payment card information is processed by the payment provider; we may receive limited transaction details such as payment status, amount, and a transaction reference.</li>
              <li><strong>Technical information,</strong> such as IP address, browser and device information, timestamps, security logs, and cookies needed to operate account sessions and embedded services.</li>
            </ul>
            <p>
              Please do not send sensitive health, medical, accessibility, or
              learning information through the general contact form. If such
              information is needed to support a student safely, contact us first
              so we can arrange an appropriate way to provide it.
            </p>
          </section>

          <section id="use">
            <h2>3. How we use information</h2>
            <p>We use information to:</p>
            <ul>
              <li>respond to inquiries and recommend an appropriate class placement;</li>
              <li>schedule consultations and communicate with families;</li>
              <li>create and manage accounts, enrollments, attendance, and consent records;</li>
              <li>process and reconcile payments when payment services are available;</li>
              <li>support student safety, instruction, performances, and competition planning;</li>
              <li>operate, secure, troubleshoot, and improve the website;</li>
              <li>maintain business, tax, safety, and legal records; and</li>
              <li>comply with law and protect the rights and safety of students, families, staff, and the Academy.</li>
            </ul>
            <p>We do not sell personal information or use it for cross-context behavioral advertising.</p>
          </section>

          <section id="children">
            <h2>4. Children&apos;s privacy</h2>
            <p>
              A parent or guardian should provide student information and manage
              the online relationship with the Academy. We do not knowingly ask
              a child under 13 to create an account or submit personal information
              directly. If we learn that information was submitted directly by a
              child under 13 without appropriate parental authorization, we will
              take reasonable steps to delete it.
            </p>
            <p>
              A parent or legal guardian may ask to review, correct, or delete a
              child&apos;s information by contacting us. We may need to verify the
              requester&apos;s identity and authority before acting on the request.
            </p>
          </section>

          <section id="media">
            <h2>5. Photos, videos, and student media</h2>
            <p>
              Public promotional use of an identifiable student&apos;s image, video,
              or voice requires a separate, optional media authorization. A parent
              or guardian may decline that authorization without affecting the
              student&apos;s ability to inquire, enroll, or participate.
            </p>
            <p>
              When a media authorization is offered, it may identify approved uses,
              such as the Academy website, social media, printed materials, or
              competition publicity. A parent or guardian may contact us to revoke
              permission for future uses. We will make reasonable efforts to stop
              new use and remove Academy-controlled online materials, but revocation
              may not fully recall materials already printed, distributed, or
              lawfully shared before we processed the request.
            </p>
          </section>

          <section id="sharing">
            <h2>6. How we share information</h2>
            <p>We may share information only as reasonably necessary with:</p>
            <ul>
              <li><strong>Service providers</strong> that support website hosting, authentication and database services, consultation scheduling, email delivery, and payment processing. Depending on the feature used, these providers may include Supabase, Cal.com, Resend, and Stripe.</li>
              <li><strong>Academy personnel and contractors</strong> who need the information to provide instruction, administration, or student support.</li>
              <li><strong>Professional advisers and authorities</strong> when reasonably necessary for legal, accounting, insurance, safety, fraud-prevention, or compliance purposes.</li>
              <li><strong>A successor organization</strong> if the Academy is involved in a merger, reorganization, or transfer of the business, subject to appropriate confidentiality protections.</li>
            </ul>
            <p>
              Third-party services have their own privacy practices. Their terms
              and policies apply when you use their embedded or linked services.
            </p>
          </section>

          <section>
            <h2>7. Cookies and embedded services</h2>
            <p>
              The website uses cookies and similar technology needed for secure
              sign-in, session management, and core functionality. Embedded tools,
              such as the consultation scheduler, may also set cookies or receive
              technical information when loaded. You can adjust browser settings
              to limit cookies, but some account or booking features may not work
              correctly.
            </p>
          </section>

          <section>
            <h2>8. Retention and security</h2>
            <p>
              We keep information only for as long as reasonably necessary for the
              purposes described in this policy, including family services, safety,
              recordkeeping, dispute resolution, and legal obligations. Retention
              periods vary by record type. We may retain limited information after
              a deletion request when required by law or necessary to establish,
              exercise, or defend legal claims.
            </p>
            <p>
              We use reasonable administrative and technical safeguards designed
              to protect personal information. No online service or transmission
              method is completely secure, so we cannot guarantee absolute security.
            </p>
          </section>

          <section id="choices">
            <h2>9. Your choices and requests</h2>
            <p>
              You may ask to access, correct, or delete information; close an
              account; update communication preferences; or change a student&apos;s
              future media preference. We will respond as required by applicable
              law and may need to verify your identity. Certain records may not be
              deleted immediately when we have a legal, safety, financial, or other
              legitimate need to retain them.
            </p>
          </section>

          <section>
            <h2>10. External links and policy changes</h2>
            <p>
              Our website may link to services we do not control. Review their
              privacy policies before providing information. We may update this
              policy as our services or legal obligations change. The revised
              version will be posted here with a new effective date.
            </p>
          </section>

          <section id="contact">
            <h2>11. Contact us</h2>
            <p>Questions or privacy requests may be sent to:</p>
            <address className="legal-contact">
              <strong>Anna Dance Academy</strong><br />
              19421 Sandy Springs Cir<br />
              Lutz, FL 33558<br />
              <a href="mailto:annadanceacademy@gmail.com">annadanceacademy@gmail.com</a><br />
              <a href="tel:+17014009213">701-400-9213</a>
            </address>
            <p>
              For general program questions, you may also use our <Link href="/contact">contact page</Link>.
            </p>
          </section>
        </div>
      </div>
    </article>
  );
}
