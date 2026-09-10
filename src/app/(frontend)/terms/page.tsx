import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Terms of Use',
  description: 'Website and program terms for Anna Dance Academy families.',
}

const effectiveDate = 'September 10, 2026'

export default function TermsPage() {
  return (
    <article className="legal-page">
      <header className="legal-hero legal-hero-terms">
        <div className="page-shell legal-hero-inner">
          <p className="eyebrow">Website and program information</p>
          <h1>Terms of Use</h1>
          <p className="legal-summary">
            These terms govern use of the Anna Dance Academy website and explain the enrollment and
            studio policies that apply to our classes, rehearsals, performances, competitions, and
            related activities in the Tampa, Florida area.
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
            <a href="#safety">Health and safety</a>
            <a href="#media">Photography and media</a>
            <a href="#content">Content and choreography</a>
            <a href="#contact">Contact us</a>
          </nav>
        </aside>

        <div className="legal-content">
          <section className="legal-callout" aria-labelledby="important-title">
            <p className="eyebrow" id="important-title">
              Important enrollment notice
            </p>
            <p>
              The program policies below summarize the Academy&apos;s Student Enrollment Agreement,
              Studio Policies &amp; Liability Waiver, available in English. Families must read and
              sign the full enrollment agreement before participation; a parent or legal guardian
              must sign for a minor. Agreeing to website terms during login, registration, or
              booking does not sign that agreement or grant a participation waiver or promotional
              media authorization. The applicable signed agreement, written school policies, and
              mandatory legal requirements govern enrollment. Review the dates, lesson count, fees,
              and payment details for your selected class before paying.
            </p>
          </section>

          <section id="agreement">
            <h2>1. Agreement to these terms</h2>
            <p>
              By accessing this website, submitting a form, booking a consultation, creating an
              account, or using another online feature, you agree to these Terms of Use and
              acknowledge our <Link href="/privacy">Privacy Policy</Link>. If you do not agree, do
              not use the website or submit information.
            </p>
          </section>

          <section id="families">
            <h2>2. Parents, guardians, and student accounts</h2>
            <p>
              Online inquiries, bookings, accounts, and enrollment actions for a minor student must
              be completed or authorized by the student&apos;s parent or legal guardian. By acting
              for a minor, you represent that you have authority to provide the information and make
              the selections submitted. Children under 13 may not submit personal information
              directly through this website.
            </p>
            <p>
              You are responsible for providing accurate, current information, maintaining the
              confidentiality of account credentials, and notifying us promptly of suspected
              unauthorized account use.
            </p>
          </section>

          <section id="programs">
            <h2>3. Programs, ages, and placement</h2>
            <p>
              Anna Dance Academy welcomes young dancers ages 3 and up. Age is only one part of
              placement. Recommendations may also consider experience, readiness, learning goals,
              maturity, and family schedule. Mixed-age placement may be used when appropriate.
            </p>
            <p>
              Program descriptions are informational. Class availability, repertoire, schedule,
              instructor assignments, performance opportunities, and enrollment requirements may
              change by term. Submitting an inquiry, booking a consultation, or creating an account
              does not guarantee placement, enrollment, a particular instructor, or participation in
              a performance or competition.
            </p>
          </section>

          <section id="enrollment">
            <h2>4. Enrollment, tuition, and term details</h2>
            <p>
              Review the published schedule, class or package details, tuition, related fees, and
              payment requirements before registering. Once registration and payment are completed,
              tuition and related fees are generally non-refundable. Withdrawal, transfer to another
              school, travel, missed classes, and other personal reasons do not qualify for a refund
              unless a written school policy states otherwise or applicable law requires it.
            </p>
            <p>
              Classes normally follow the published schedule. The Academy may change or cancel class
              times, locations, or instructors because of weather, facility issues, instructor
              availability, government orders, or other special circumstances. We will make
              reasonable efforts to provide notice and make appropriate arrangements. Circumstances
              beyond our reasonable control are handled under the enrollment agreement and
              applicable law.
            </p>
          </section>

          <section id="attendance">
            <h2>5. Attendance and makeup classes</h2>
            <p>
              Notify the instructor or Academy at least 24 hours before a scheduled class if a
              student cannot attend. An absence without at least 24 hours&apos; advance notice is
              unexcused and is not eligible for a makeup class, refund, credit, or extension.
            </p>
            <p>
              Each student may receive up to two makeup classes per semester, scheduled in advance.
              All makeups must be completed before the end of that semester. Unused makeups expire
              and cannot be carried over, refunded, exchanged for cash, or credited toward future
              tuition.
            </p>
          </section>

          <section id="competition">
            <h2>6. Competition eligibility and training</h2>
            <ul>
              <li>
                Competition students must complete at least two hours of dance training per week,
                including at least one Technique/Ensemble Class.
              </li>
              <li>
                Students may apply for solo, duet, or trio participation only after fulfilling their
                required ensemble rehearsals and performance responsibilities.
              </li>
              <li>
                Before an official competition, students must perform or fully run through their
                competition routine at least twice at an Academy-approved public performance,
                showcase, or similar event.
              </li>
              <li>
                Students representing the Academy at public performances, cultural events,
                competitions, or other outside events must follow its scheduling, planning, and
                coordination.
              </li>
            </ul>
            <p>
              Participation does not guarantee selection, placement, scores, awards, or any
              particular competition outcome.
            </p>
          </section>

          <section id="safety">
            <h2>7. Health, safety, and conduct</h2>
            <p>
              At enrollment, provide written notice of known medical conditions, allergies, previous
              injuries, congenital conditions, or other health issues that may affect safe
              participation. Students must be physically able to participate; families with health
              concerns should seek appropriate medical advice before training.
            </p>
            <p>
              Dance involves physical exertion and inherent risks, including sprains, strains,
              falls, collisions, pain, accidents, illness, emotional or psychological stress, and,
              in rare cases, serious injury. The Academy takes reasonable safety precautions and
              provides warm-ups, instruction, and supervision. Students must follow directions,
              avoid unsafe behavior, and not use equipment without permission. Stop training
              immediately and notify the instructor if dizziness, chest discomfort, severe muscle
              pain, a tearing sensation, or other significant discomfort occurs.
            </p>
            <p>
              The signed enrollment agreement addresses voluntary assumption of inherent risks,
              waiver of claims arising from those risks, responsibility for failure to disclose
              relevant health conditions or follow safety instructions, and indemnification for
              third-party claims caused by conduct for which a student or parent is legally
              responsible. These provisions apply only to the extent permitted by law and do not
              waive liability that cannot legally be waived.
            </p>
            <h3>Off-site activities, transportation, and belongings</h3>
            <p>
              Severe weather, hurricanes, natural disasters, power outages, government orders,
              public health emergencies, or other circumstances beyond the Academy&apos;s reasonable
              control may require activities to be suspended, cancelled, rescheduled, or modified.
              The agreement limits responsibility for resulting indirect losses to the extent
              permitted by law. At off-site events, follow both Academy and venue safety rules.
            </p>
            <p>
              Families generally arrange transportation to and from activities. The signed agreement
              also addresses transportation assistance by instructors, staff, or others and limits
              the Academy&apos;s responsibility for transportation-related accidents, injuries,
              losses, or damages to the extent permitted by law. Students must secure their personal
              belongings; the Academy and instructors are not responsible for loss, theft, or damage
              unless required by applicable law.
            </p>
            <h3>Student conduct</h3>
            <p>
              Respect instructors, classmates, staff, and others. Follow classroom rules, rehearsal
              schedules, performance procedures, team arrangements, and safety requirements.
              Repeated disruption, safety risks, or serious policy violations may result in
              warnings, suspension from activities, or other reasonable disciplinary measures
              appropriate to the circumstances.
            </p>
          </section>

          <section id="media">
            <h2>8. Photography, media authorization, and privacy</h2>
            <p>
              The Academy may photograph or record classes, rehearsals, showcases, examinations,
              competitions, performances, and related activities to document progress and improve
              teaching. Public use of identifiable student media is subject to the applicable media
              authorization, separate from this website consent. The enrollment agreement describes
              uses including the Academy website, Instagram, Facebook, Xiaohongshu (RED), WeChat
              Official Accounts, brochures, promotional materials, and performance showcases.
            </p>
            <p>
              If a student or parent does not want the student&apos;s image used for public
              promotion, submit a written request to the Academy in advance. We will make reasonable
              efforts to honor it and manage media for lawful educational, recordkeeping, and
              promotional purposes. Unauthorized third-party use or reposting is the responsibility
              of those third parties as provided by law. See our{' '}
              <Link href="/privacy">Privacy Policy</Link> for media choices and requests.
            </p>
          </section>

          <section id="content">
            <h2>9. Website content, teaching materials, and choreography</h2>
            <p>
              Original class content, teaching materials, schedules, textbooks, rehearsal materials,
              technique combinations, dance works, and choreography belong to the Academy or the
              applicable rights holder. Without prior written permission, do not download, copy,
              reproduce, distribute, publicly post, commercially use, or provide these materials to
              anyone outside the school. The Academy reserves the right to pursue appropriate legal
              action for unauthorized use.
            </p>
            <p>
              Website text, graphics, logos, photographs, videos, and other content are owned by or
              licensed to Anna Dance Academy and are protected by applicable intellectual property
              laws. You may view and use the website for personal, noncommercial purposes related to
              Academy services.
            </p>
            <p>
              You may not misuse the website, attempt unauthorized access, interfere with security,
              submit unlawful or harmful material, copy content for commercial use, or use student
              images or information without permission.
            </p>
          </section>

          <section>
            <h2>10. Third-party services</h2>
            <p>
              The website may use or link to third-party services for authentication, scheduling,
              email delivery, maps, and payment processing. Those services are governed by their own
              terms and privacy policies. We are not responsible for third-party services we do not
              control, to the extent permitted by law.
            </p>
          </section>

          <section>
            <h2>11. Disclaimers and limitation of liability</h2>
            <p>
              The website is provided on an “as available” basis for general information. We work to
              keep information accurate, but do not warrant that the website will always be
              uninterrupted, error-free, or current. To the fullest extent permitted by law, Anna
              Dance Academy will not be liable for indirect, incidental, special, consequential, or
              punitive damages arising solely from use of, or inability to use, the website.
            </p>
            <p>
              Nothing in these terms excludes liability or rights that cannot lawfully be excluded.
              Any separate signed enrollment agreement or participation waiver applies according to
              its own terms and applicable law.
            </p>
          </section>

          <section>
            <h2>12. Governing law, severability, and changes</h2>
            <p>
              If a provision is found invalid, illegal, or unenforceable by an authority with proper
              jurisdiction, the remaining provisions continue in effect to the fullest extent
              permitted by law.
            </p>
            <p>
              These terms are governed by the laws of the State of Florida, without regard to
              conflict-of-law principles. We may update these terms as our services or policies
              change. The revised version will be posted here with a new effective date. Continued
              website use after an update means you accept the revised website terms.
            </p>
          </section>

          <section id="contact">
            <h2>13. Contact us</h2>
            <address className="legal-contact">
              <strong>Anna Dance Academy</strong>
              <br />
              Tampa / Lutz Area
              <br />
              <a href="mailto:annadanceacademy@gmail.com">annadanceacademy@gmail.com</a>
              <br />
              <a href="tel:+17014009213">701-400-9213</a>
            </address>
          </section>
        </div>
      </div>
    </article>
  )
}
