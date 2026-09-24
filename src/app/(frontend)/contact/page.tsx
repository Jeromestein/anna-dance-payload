import type { Metadata } from "next";
import { ContactForm } from "@/components/contact-form";
import "./contact.css";

export const metadata: Metadata = { title: "Contact" };

export default function ContactPage() {
  return (
    <section className="contact-section">
      <div className="page-shell">
        <header className="contact-intro">
          <div>
            <p className="eyebrow">Let&apos;s connect</p>
            <h1>We’d love to hear from you.</h1>
          </div>
          <p>
            Have a question about classes, placement, or the studio? Send us a
            note and our team will be happy to help.
          </p>
        </header>
        <div className="contact-grid">
          <div className="contact-details">
            <p className="eyebrow">Contact details</p>
            <div><span>Email</span><a href="mailto:annadanceacademy@gmail.com">annadanceacademy@gmail.com</a></div>
            <div><span>Phone</span><a href="tel:+17014009213">701-400-9213</a></div>
            <div>
              <span>Area</span>
              <p>Tampa / Lutz Area</p>
            </div>
            <section className="contact-opportunity" aria-labelledby="teaching-title">
              <h2 id="teaching-title">Teach With Us</h2>
              <p>Interested in teaching at Anna Dance Academy? Email us your resume, dance styles, and teaching experience.</p>
              <a href="mailto:annadanceacademy@gmail.com?subject=Teaching%20Application">Apply to Teach <span aria-hidden="true">↗</span></a>
            </section>
            <section className="contact-opportunity" aria-labelledby="partnership-title">
              <h2 id="partnership-title">Partner With Us</h2>
              <p>We welcome businesses, schools, and community organizations to connect about events, dance programs, and other collaborations.</p>
              <a href="mailto:annadanceacademy@gmail.com?subject=Partnership%20Inquiry">Explore Partnerships <span aria-hidden="true">↗</span></a>
            </section>
          </div>
          <ContactForm />
        </div>
      </div>
    </section>
  );
}
